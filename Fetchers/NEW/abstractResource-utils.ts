// #region Imports
import * as coda from '@codahq/packs-sdk';

import { DEFAULT_CURRENCY_CODE } from '../../config/config';
import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES, CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import { separatePrefixedMetafieldsKeysFromKeys } from '../../resources/metafields/utils/metafields-utils-keys';
import { BaseRow } from '../../schemas/CodaRows.types';
import { CurrencyCode } from '../../types/admin.types';
import { Shop } from './Resources/Shop';
import { RestClientNEW } from './RestClientNEW';

// Same as Shop.activeCurrency but as a dependency free function
export async function getCurrentShopActiveCurrency(context: coda.ExecutionContext) {
  const client = new RestClientNEW({ context });
  const response = await client.get<Shop['apiData']>({
    path: 'shop.json',
    query: { fields: 'currency' },
    options: { cacheTtlSecs: CACHE_TEN_MINUTES },
  });

  let currencyCode = DEFAULT_CURRENCY_CODE;
  if (response?.body?.currency) {
    const { currency } = response.body;
    if (CODA_SUPPORTED_CURRENCIES.includes(currency as any)) {
      currencyCode = currency as CurrencyCode;
    } else {
      console.error(`Shop currency ${currency} not supported. Falling back to ${currencyCode}.`);
    }
  }
  return currencyCode;
}
/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
// TODO: combine with hasMetafieldsInRow

export function hasMetafieldsInUpdate(
  update: coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>
) {
  return update.updatedFields.some((fromKey) => fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY));
}

export function hasMetafieldsInRow(row: BaseRow) {
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(row));
  return prefixedMetafieldFromKeys.length > 0;
}
