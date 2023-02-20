import * as coda from '@codahq/packs-sdk';

import { getTokenPlaceholder } from '../helpers';

export const fetchShopDetails = async (fields, context: coda.SyncExecutionContext) => {
  const params = {};
  if (fields) {
    params['fields'] = fields.join(',');
  }
  const url = coda.withQueryParams(`${context.endpoint}/admin/api/2022-10/shop.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url,
    cacheTtlSecs: 10,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.shop) {
    return body.shop;
  }
};
