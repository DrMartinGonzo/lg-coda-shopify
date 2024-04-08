// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../../utils/graphql';

import { Shop } from '../../../Fetchers/NEW/Resources/Shop';
import { CodaMetafieldKeyValueSet, CodaMetafieldListValue, CodaMetafieldValue } from '../../../helpers-setup';
import { CurrencyCode } from '../../../types/admin.types';
import { requireMatchingMetafieldDefinition } from '../../metafieldDefinitions/metafieldDefinitions-functions';
import { metafieldDefinitionFragment } from '../../metafieldDefinitions/metafieldDefinitions-graphql';
import { AllMetafieldTypeValue, METAFIELD_TYPES, MetafieldTypeValue } from '../Metafield.types';
import { formatMetafieldValueForApi } from './metafields-utils-formatToApi';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from './metafields-utils-keys';

// #endregion

export function parseMetafieldsCodaInput(metafields: string[]): Array<CodaMetafieldKeyValueSet> {
  return metafields && metafields.length ? metafields.map((m) => parseAndValidateFormatMetafieldFormulaOutput(m)) : [];
}
/**
 * Parse and validate one of the `Meta{…}` formulas.
 */
export function parseAndValidateMetaValueFormulaOutput(value: string) {
  const defaultErrorMessage = 'Invalid value. You must use one of the `Meta{…}` helper formulas or a blank value.';
  let parsedValue: CodaMetafieldValue | CodaMetafieldListValue;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  if (!parsedValue.type) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  return parsedValue;
}

/**
 * Parse and validate `FormatMetafield` and `FormatListMetafield` formulas.
 */
export function parseAndValidateFormatMetafieldFormulaOutput(value: string): CodaMetafieldKeyValueSet {
  const defaultErrorMessage = 'Invalid value. You must use `FormatMetafield` or `FormatListMetafield` formula.';
  let parsedValue: CodaMetafieldKeyValueSet;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  if (!parsedValue.key || (parsedValue.value !== null && !parsedValue.type)) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  return parsedValue;
}

/**
 * Permet de normaliser les metafields d'une two-way sync
 * update de Coda en une liste de CodaMetafieldKeyValueSet
 */
export async function getMetafieldKeyValueSetsFromUpdate(
  updatedRow: any,
  metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>> = [],
  context: coda.ExecutionContext
) {
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(updatedRow));
  let currencyCode: CurrencyCode;

  const promises = prefixedMetafieldFromKeys.map(async (fromKey) => {
    const value = updatedRow[fromKey] as any;
    const realFromKey = removePrefixFromMetaFieldKey(fromKey);
    const metafieldDefinition = requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
    let formattedValue: string | null;

    if (metafieldDefinition.type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
      currencyCode = await Shop.activeCurrency({ context });
    }

    try {
      formattedValue = formatMetafieldValueForApi(
        value,
        metafieldDefinition.type.name as AllMetafieldTypeValue,
        metafieldDefinition.validations,
        currencyCode
      );
    } catch (error) {
      throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
    }

    return {
      key: realFromKey,
      value: formattedValue,
      type: metafieldDefinition.type.name as MetafieldTypeValue,
    } as CodaMetafieldKeyValueSet;
  });

  return Promise.all(promises);
}
