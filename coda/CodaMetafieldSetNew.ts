// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CodaMetafieldValue } from './CodaMetafieldValue';
import { InvalidValueVisibleError } from '../Errors/Errors';
import { Metafield, SupportedMetafieldOwnerResource } from '../Resources/Rest/Metafield';
import { MetafieldType } from '../Resources/Mixed/METAFIELD_TYPES';
import { METAFIELD_TYPES } from '../Resources/Mixed/METAFIELD_TYPES';
import { splitMetaFieldFullKey } from '../utils/metafields-utils';
import { arrayUnique } from '../utils/helpers';
import { MetafieldModel } from '../models/rest/MetafieldModel';

// #endregion

// #region Types
interface ConstructorArgs {
  namespace: string;
  /**  metafield key (not full) */
  key: string;
  value: any;
  type: MetafieldType;
}

interface ToMetafieldArgs {
  [key: string]: unknown;
  context: coda.ExecutionContext;
  owner_id?: number;
  owner_resource: SupportedMetafieldOwnerResource;
}

interface ParsedFormatMetafieldFormula {
  /** a metafield full key */
  key: string;
  /** a metafield value */
  value: any;
  /** a metafield type */
  type: MetafieldType;
}

interface FormatMetafieldFormulaParams {
  fullKey: string;
  value: string;
}
interface FormatListMetafieldFormulaParams {
  fullKey: string;
  varargs: Array<string>;
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
  public constructor({ namespace, key, value, type }: ConstructorArgs) {
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
  }: FormatMetafieldFormulaParams): CodaMetafieldSetNew {
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
  }: FormatListMetafieldFormulaParams): CodaMetafieldSetNew {
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
    return `${this.namespace}.${this.key}`;
  }

  public toJSON() {
    return JSON.stringify({
      key: this.fullKey,
      type: this.type,
      value: this.value,
    });
  }

  public toMetafield({ context, owner_id, owner_resource, ...otherArgs }: ToMetafieldArgs): MetafieldModel {
    return MetafieldModel.createInstance(context, {
      namespace: this.namespace,
      key: this.key,
      type: this.type,
      value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
      owner_resource: owner_resource,
      owner_id: owner_id,
    });

    // new MetafieldNew(

    //   {
    //   context,
    //   fromData: {
    //     namespace: this.namespace,
    //     key: this.key,
    //     type: this.type,
    //     value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
    //     owner_resource: owner_resource,
    //     owner_id: owner_id,
    //     ...otherArgs,
    //   } as Metafield['apiData'],
    // }
    // );
  }
}
