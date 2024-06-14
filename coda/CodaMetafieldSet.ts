// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InvalidValueVisibleError } from '../Errors/Errors';
import {
  MetafieldGraphQlModel,
  MetafieldModelData as MetafieldGraphQlModelData,
  SupportedMetafieldOwnerType,
} from '../models/graphql/MetafieldGraphQlModel';
import { MetafieldModel, MetafieldModelData, SupportedMetafieldOwnerResource } from '../models/rest/MetafieldModel';
import { MetafieldType } from '../constants/metafields-constants';
import { METAFIELD_TYPES } from '../constants/metafields-constants';
import { getMetaFieldFullKey, splitMetaFieldFullKey } from '../models/utils/metafields-utils';
import { arrayUnique } from '../utils/helpers';
import { CodaMetafieldValue } from './CodaMetafieldValue';

// #endregion

// #region Types
interface ParsedFormatMetafieldFormula {
  /** a metafield full key */
  key: string;
  /** a metafield value */
  value: any;
  /** a metafield type */
  type: MetafieldType;
}

interface ToRestMetafieldParams {
  context: coda.ExecutionContext;
  ownerId?: number;
  ownerResource: SupportedMetafieldOwnerResource;
}
interface ToGraphQlMetafieldParams {
  context: coda.ExecutionContext;
  ownerGid?: string;
  ownerType: SupportedMetafieldOwnerType;
}
// #endregion

export class CodaMetafieldSet {
  public namespace: string;
  /**  metafield key (not full) */
  public key: string;
  public value: any | Array<any>;
  /** The Metafield type. Can be null when we creating a set whose sole purpose
   * will be to delete the metafield */
  public type: MetafieldType | null;

  public constructor({
    namespace,
    key,
    value,
    type,
  }: {
    namespace: string;
    /** metafield key (not full) */
    key: string;
    value: any;
    type: MetafieldType;
  }) {
    this.namespace = namespace;
    this.key = key;
    this.value = value;
    this.type = type ?? null;
  }

  public static createRestMetafield(metafieldParameter: string, params: ToRestMetafieldParams) {
    return this.createFromCodaParameter(metafieldParameter).toRestMetafield(params);
  }

  public static createRestMetafieldsArray(metafieldsParameter: string[], params: ToRestMetafieldParams) {
    return this.createFromCodaParameterArray(metafieldsParameter).map((s) => s.toRestMetafield(params));
  }

  public static createGraphQlMetafieldsArray(metafieldsParameter: string[], params: ToGraphQlMetafieldParams) {
    return this.createFromCodaParameterArray(metafieldsParameter).map((s) => s.toGraphQlMetafield(params));
  }

  public static createGraphQlMetafield(metafieldParameter: string, params: ToGraphQlMetafieldParams) {
    return this.createFromCodaParameter(metafieldParameter).toGraphQlMetafield(params);
  }

  /**
   * Create instance from a Coda string parameter
   * based on the output of `FormatMetafield` formula.
   */
  public static createFromFormatMetafieldFormula({
    fullKey,
    value,
  }: {
    fullKey: string;
    value: string;
  }): CodaMetafieldSet {
    try {
      const { key, namespace } = splitMetaFieldFullKey(fullKey);
      const parsedValue: CodaMetafieldValue = CodaMetafieldValue.createFromCodaParameter(value);
      return new CodaMetafieldSet({ namespace, key, value: parsedValue.value, type: parsedValue.type });
    } catch (error) {
      throw new InvalidValueVisibleError('You must use `FormatMetafield` or `FormatListMetafield` formula.');
    }
  }

  /**
   * Create instance from a Coda string parameter
   * based on the output of `FormatListMetafield` formula.
   */
  public static createFromFormatListMetafieldFormula({
    fullKey,
    varargs,
  }: {
    fullKey: string;
    varargs: string[];
  }): CodaMetafieldSet {
    try {
      const { key, namespace } = splitMetaFieldFullKey(fullKey);
      const { type, value } = CodaMetafieldSet.processVarargs(varargs);
      return new CodaMetafieldSet({ namespace, key, type, value });
    } catch (error) {
      throw error;
    }
  }

  private static processVarargs(varargs: string[] = []): { type: MetafieldType; value: any } {
    let type: MetafieldType = null;
    let value: any = null;

    if (varargs.length > 0) {
      const parsedValues = varargs
        .map((v) => CodaMetafieldValue.createFromCodaParameter(v))
        .filter((v) => v.value !== null);
      const uniqueTypes = arrayUnique(parsedValues.map((v) => v.type));

      if (uniqueTypes.length > 1) {
        throw new InvalidValueVisibleError('All metafield values must be of the same type.');
      }

      if (parsedValues.length > 0) {
        type = ('list.' + uniqueTypes[0]) as MetafieldType;
        if (!Object.values(METAFIELD_TYPES).includes(type)) {
          throw new coda.UserVisibleError(`Shopify doesn't support metafields of type: \`${type}\`.`);
        }
        value = parsedValues.map((v) => v.value);
      }
    }

    return { type, value };
  }

  /**
   * Create instance from a Coda string parameter based on the output
   * of `FormatMetafield` or `FormatListMetafield` formulas.
   */
  private static createFromCodaParameter(metafieldParameter: string): CodaMetafieldSet {
    try {
      const parsedValue: ParsedFormatMetafieldFormula = JSON.parse(metafieldParameter);
      if (!parsedValue.key || (parsedValue.value !== null && !parsedValue.type)) {
        throw new InvalidValueVisibleError('You must use `FormatMetafield` or `FormatListMetafield` formula.');
      }
      const { key, namespace } = splitMetaFieldFullKey(parsedValue.key);
      return new CodaMetafieldSet({ namespace, key, value: parsedValue.value, type: parsedValue.type });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create instances from a Coda string array parameter based on the output
   * of a List() of `FormatMetafield` or `FormatListMetafield` formulas.
   */
  private static createFromCodaParameterArray(metafieldsParameter: string[]) {
    if (!metafieldsParameter || metafieldsParameter.length === 0) return [];
    return metafieldsParameter.map((m) => this.createFromCodaParameter(m));
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get fullKey() {
    return getMetaFieldFullKey(this);
  }

  public toJSON() {
    return JSON.stringify({
      key: this.fullKey,
      type: this.type,
      value: this.value,
    } as ParsedFormatMetafieldFormula);
  }

  public toRestMetafield({ context, ownerId, ownerResource }: ToRestMetafieldParams): MetafieldModel {
    return MetafieldModel.createInstance(context, {
      namespace: this.namespace,
      key: this.key,
      type: this.type,
      value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
      owner_resource: ownerResource,
      owner_id: ownerId,
    } as MetafieldModelData);
  }

  public toGraphQlMetafield({ context, ownerGid, ownerType }: ToGraphQlMetafieldParams): MetafieldGraphQlModel {
    return MetafieldGraphQlModel.createInstance(context, {
      namespace: this.namespace,
      key: this.key,
      type: this.type,
      value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
      ownerType,
      parentNode: {
        id: ownerGid,
      },
    } as MetafieldGraphQlModelData);
  }
}
