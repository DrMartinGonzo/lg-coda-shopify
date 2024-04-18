// #region Imports
import * as coda from '@codahq/packs-sdk';

import { RestClient } from '../../Clients/RestClient';
import { DEFAULT_CURRENCY_CODE } from '../../config';
import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES } from '../../constants';
import { BaseRow } from '../../schemas/CodaRows.types';
import { CurrencyCode } from '../../types/admin.types';
import { isPrefixedMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../../utils/metafields-utils';
import { Shop } from '../Rest/Shop';

// Same as Shop.activeCurrency but as a dependency free function
export async function getCurrentShopActiveCurrency(context: coda.ExecutionContext) {
  const client = new RestClient({ context });
  const response = await client.get<Shop>({
    path: 'shop.json',
    query: { fields: 'currency' },
    options: { cacheTtlSecs: CACHE_TEN_MINUTES },
  });

  let currencyCode = DEFAULT_CURRENCY_CODE;
  if (response?.body?.shop.currency) {
    const { currency } = response.body.shop;
    if (CODA_SUPPORTED_CURRENCIES.includes(currency)) {
      currencyCode = currency as CurrencyCode;
    } else {
      console.error(`Shop currency ${currency} not supported. Falling back to ${currencyCode}.`);
    }
  }
  return currencyCode;
}

export function handleDeleteNotFound(name: string, identifier: number | string) {
  console.error(`${name} \`${identifier}\` not found. Possibly already deleted.`);
}

/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
// TODO: combine with hasMetafieldsInRow
export function hasMetafieldsInUpdate(
  update: coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>
) {
  return update.updatedFields.some((fromKey) => isPrefixedMetaFieldKey(fromKey));
}

export function hasMetafieldsInRow(row: BaseRow) {
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(row));
  return prefixedMetafieldFromKeys.length > 0;
}
