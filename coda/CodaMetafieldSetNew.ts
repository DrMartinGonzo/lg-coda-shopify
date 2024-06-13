// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InvalidValueVisibleError } from '../Errors/Errors';
import { METAFIELD_TYPES, MetafieldType } from '../models/types/METAFIELD_TYPES';
import {
  MetafieldApiData as MetafieldGraphQlApiData,
  MetafieldGraphQlModel,
  SupportedMetafieldOwnerType,
} from '../models/graphql/MetafieldGraphQlModel';
import { MetafieldApiData, MetafieldModel, SupportedMetafieldOwnerResource } from '../models/rest/MetafieldModel';
import { arrayUnique } from '../utils/helpers';
import { getMetaFieldFullKey, splitMetaFieldFullKey } from '../utils/metafields-utils';
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
// #endregion

export class CodaMetafieldSetNew {
  public namespace: string;
  /**  metafield key (not full) */
  public key: string;
  public value: any | Array<any>;
  /** The Metafield type. Can be null when we creating a set whose sole purpose
   * will be to delete the metafield */
  public type: MetafieldType | null;

  // public valueNew: CodaMetafieldValueNew;
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
  }): CodaMetafieldSetNew {
    try {
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
      const parsedValue: CodaMetafieldValue = CodaMetafieldValue.createFromCodaParameter(value);
      return new CodaMetafieldSetNew({
        namespace: metaNamespace,
        key: metaKey,
        value: parsedValue.value,
        type: parsedValue.type,
      });
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
    varargs = [],
  }: {
    fullKey: string;
    varargs: string[];
  }): CodaMetafieldSetNew {
    try {
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
      let type: MetafieldType;
      let value = null;

      if (varargs.length) {
        const parsedValues: Array<CodaMetafieldValue> = varargs
          .map((value) => CodaMetafieldValue.createFromCodaParameter(value))
          .filter((v) => v.value !== null);
        const uniqueTypes = arrayUnique(parsedValues.map((v) => v.type));
        if (uniqueTypes.length > 1) {
          throw new InvalidValueVisibleError('All metafield values must be of the same type.');
        }

        if (!parsedValues.length) {
          value = null;
          type = null;
        } else {
          type = ('list.' + uniqueTypes[0]) as MetafieldType;
          if (!Object.values(METAFIELD_TYPES).includes(type)) {
            throw new coda.UserVisibleError(`Shopify doesn't support metafields of type: \`${type}\`.`);
          }
          value = parsedValues.map((v) => v.value);
        }
      }

      return new CodaMetafieldSetNew({ type, namespace: metaNamespace, key: metaKey, value });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create instance from a Coda string parameter based on the output
   * of `FormatMetafield` or `FormatListMetafield` formulas.
   */
  public static createFromCodaParameter(parameter: string): CodaMetafieldSetNew {
    try {
      const parsedValue: ParsedFormatMetafieldFormula = JSON.parse(parameter);
      if (!parsedValue.key || (parsedValue.value !== null && !parsedValue.type)) {
        throw new InvalidValueVisibleError('You must use `FormatMetafield` or `FormatListMetafield` formula.');
      }
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(parsedValue.key);
      return new CodaMetafieldSetNew({
        namespace: metaNamespace,
        key: metaKey,
        value: parsedValue.value,
        type: parsedValue.type,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create instances from a Coda string array parameter based on the output
   * of a List() of `FormatMetafield` or `FormatListMetafield` formulas.
   */
  public static createFromCodaParameterArray(params: string[]): Array<CodaMetafieldSetNew> {
    return params && params.length ? params.map((m) => this.createFromCodaParameter(m)) : [];
  }

  public static createMetafieldsFromCodaParameterArray(
    context: coda.ExecutionContext,
    {
      codaParams,
      ownerResource,
      ownerId,
    }: { codaParams: string[]; ownerResource: SupportedMetafieldOwnerResource; ownerId: number }
  ): MetafieldModel[] {
    const sets = codaParams && codaParams.length ? codaParams.map((m) => this.createFromCodaParameter(m)) : [];
    return sets.map((s) =>
      s.toMetafield({
        context,
        owner_resource: ownerResource,
        owner_id: ownerId,
      })
    );
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

  public toRestMetafield({
    context,
    owner_id,
    owner_resource,
  }: {
    context: coda.ExecutionContext;
    owner_id?: number;
    owner_resource: SupportedMetafieldOwnerResource;
  }): MetafieldModel {
    return MetafieldModel.createInstance(context, {
      namespace: this.namespace,
      key: this.key,
      type: this.type,
      value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
      owner_resource,
      owner_id,
    } as MetafieldApiData);
  }

  public toGraphQlMetafield({
    context,
    ownerGid,
    ownerType,
  }: {
    context: coda.ExecutionContext;
    ownerGid?: string;
    ownerType: SupportedMetafieldOwnerType;
  }): MetafieldGraphQlModel {
    return MetafieldGraphQlModel.createInstance(context, {
      namespace: this.namespace,
      key: this.key,
      type: this.type,
      value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
      ownerType,
      parentNode: {
        id: ownerGid,
      },
    } as MetafieldGraphQlApiData);
  }
}
