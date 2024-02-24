import * as coda from '@codahq/packs-sdk';

import { makeGetRequest } from '../helpers-rest';
import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES, REST_DEFAULT_API_VERSION } from '../constants';
import { FetchRequestOptions } from '../types/Requests';
import { CurrencyCode } from '../types/admin.types';

export const fetchShopDetailsRest = async (
  fields: string[],
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const params = {};
  if (fields) {
    params['fields'] = fields.join(',');
  }
  const url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/shop.json`, params);
  const response = await makeGetRequest({ ...requestOptions, url }, context);
  const { body } = response;

  if (body.shop) {
    return body.shop;
  }
};

export async function getSchemaCurrencyCode(context: coda.ExecutionContext): Promise<CurrencyCode> {
  let currencyCode = 'USD'; // default currency code
  const shopDetails = await fetchShopDetailsRest(['currency'], context, {
    cacheTtlSecs: CACHE_TEN_MINUTES,
    forceSyncContextCache: true,
  });
  if (shopDetails?.currency && CODA_SUPPORTED_CURRENCIES.includes(shopDetails.currency)) {
    currencyCode = shopDetails.currency;
  } else {
    console.error(`Shop currency ${shopDetails.currency} not supported. Falling back to ${currencyCode}.`);
  }
  return currencyCode as CurrencyCode;
}
