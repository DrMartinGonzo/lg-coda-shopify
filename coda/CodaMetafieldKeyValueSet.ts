// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CodaMetafieldValueNew } from './CodaMetafieldValue';
import { InvalidValueVisibleError } from '../Errors';
import { Metafield, SupportedMetafieldOwnerResource } from '../Resources/Rest/Metafield';
import { METAFIELD_TYPES, MetafieldTypeValue } from '../Resources/Mixed/Metafield.types';
import { splitMetaFieldFullKey } from '../utils/metafields-utils';
import { arrayUnique } from '../utils/helpers';

// #endregion

// #region Types
interface ConstructorArgs {
  namespace: string;
  /**  metafield key (not full) */
  key: string;
  value: any;
  type: MetafieldTypeValue;
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
  type: MetafieldTypeValue;
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

export class CodaMetafieldKeyValueSetNew {
  public namespace: string;
  /**  metafield key (not full) */
  public key: string;
  public value: any | Array<any>;
  /** The Metafield type. Can be null when we creating a set whose sole purpose
   * will be to delete the metafield */
  public type: MetafieldTypeValue | null;

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
  }: FormatMetafieldFormulaParams): CodaMetafieldKeyValueSetNew {
    try {
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
      const parsedValue: CodaMetafieldValueNew = CodaMetafieldValueNew.createFromCodaParameter(value);
      return new CodaMetafieldKeyValueSetNew({
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
  }: FormatListMetafieldFormulaParams): CodaMetafieldKeyValueSetNew {
    try {
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
      let type: MetafieldTypeValue;
      let value = null;

      if (varargs.length) {
        const parsedValues: Array<CodaMetafieldValueNew> = varargs
          .map((value) => CodaMetafieldValueNew.createFromCodaParameter(value))
          .filter((v) => v.value !== null);
        const uniqueTypes = arrayUnique(parsedValues.map((v) => v.type));
        if (uniqueTypes.length > 1) {
          throw new InvalidValueVisibleError('All metafield values must be of the same type.');
        }

        if (!parsedValues.length) {
          value = null;
          type = null;
        } else {
          type = ('list.' + uniqueTypes[0]) as MetafieldTypeValue;
          if (!Object.values(METAFIELD_TYPES).includes(type)) {
            throw new coda.UserVisibleError(`Shopify doesn't support metafields of type: \`${type}\`.`);
          }
          value = parsedValues.map((v) => v.value);
        }
      }

      return new CodaMetafieldKeyValueSetNew({ type, namespace: metaNamespace, key: metaKey, value });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create instance from a Coda string parameter based on the output
   * of `FormatMetafield` or `FormatListMetafield` formulas.
   */
  public static createFromCodaParameter(parameter: string): CodaMetafieldKeyValueSetNew {
    try {
      const parsedValue: ParsedFormatMetafieldFormula = JSON.parse(parameter);
      if (!parsedValue.key || (parsedValue.value !== null && !parsedValue.type)) {
        throw new InvalidValueVisibleError('You must use `FormatMetafield` or `FormatListMetafield` formula.');
      }
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(parsedValue.key);
      return new CodaMetafieldKeyValueSetNew({
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
  public static createFromCodaParameterArray(params: string[]): Array<CodaMetafieldKeyValueSetNew> {
    return params && params.length ? params.map((m) => this.createFromCodaParameter(m)) : [];
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

  public toMetafield({ context, owner_id, owner_resource, ...otherArgs }: ToMetafieldArgs): Metafield {
    return new Metafield({
      context,
      fromData: {
        namespace: this.namespace,
        key: this.key,
        type: this.type,
        value: Array.isArray(this.value) ? JSON.stringify(this.value) : this.value,
        owner_resource: owner_resource,
        owner_id: owner_id,
        ...otherArgs,
      } as Metafield['apiData'],
    });
  }
}
