// #region Imports

import { InvalidValueError, InvalidValueVisibleError, RequiredParameterMissingVisibleError } from '../Errors';
import { METAFIELD_TYPES, MetafieldTypeValue } from '../Resources/Mixed/Metafield.types';
import { getUnitMap, isNullishOrEmpty } from '../utils/helpers';

// #endregion

// #region Types
interface CodaMetafieldValueConstructorArgs {
  value: any;
  type: MetafieldTypeValue;
}

interface ParsedMetafieldValueFormula {
  /** a metafield value */
  value: any;
  /** a metafield type */
  type: MetafieldTypeValue;
}
// #endregion

/**
 * Represents a metafield value constructed from one of the`Meta{…}` helper formulas
 * The value can also be blank, in that case, this metafield value will be marked as to be deleted.
 */
export class CodaMetafieldValueNew {
  public type: MetafieldTypeValue;
  public value: any;

  public constructor({ value, type }: CodaMetafieldValueConstructorArgs) {
    this.type = type;
    this.value = isNullishOrEmpty(value) ? null : value;

    // Handle edge cases ———————————————————————————
    // Rating
    if (this.type === METAFIELD_TYPES.rating && this.value !== null) {
      if (this.value.scale_min === undefined) {
        throw new RequiredParameterMissingVisibleError('scaleMin is required to format a non null rating field.');
      }
      if (this.value.scale_max === undefined) {
        throw new RequiredParameterMissingVisibleError('scaleMax is required to format a non null rating field.');
      }
    }
    // Dimension, Volume, Weight
    if (
      [METAFIELD_TYPES.dimension, METAFIELD_TYPES.volume, METAFIELD_TYPES.weight].includes(this.type as any) &&
      this.value !== null
    ) {
      if (!Object.keys(getUnitMap(this.type)).includes(this.value.unit)) {
        throw new InvalidValueVisibleError(this.value.unit);
      }
    }
  }

  /**
   * Create instance from a Coda string parameter based on the output of one of
   * the`Meta{…}` helper formulas.
   */
  public static createFromCodaParameter(param: string): CodaMetafieldValueNew {
    let type: MetafieldTypeValue;
    let value = null;
    try {
      if (param !== '') {
        const parsedValue: ParsedMetafieldValueFormula = JSON.parse(param);
        if (parsedValue.value !== null && !parsedValue.type) {
          throw new InvalidValueError('json', param);
        }
        type = parsedValue.type;
        value = parsedValue.value;
      }
    } catch (error) {
      throw new InvalidValueVisibleError('You must use one of the`Meta{…}` helper formulas.');
    }

    return new CodaMetafieldValueNew({ type, value });
  }

  public toJSON() {
    return JSON.stringify({ type: this.type, value: this.value });
  }
}