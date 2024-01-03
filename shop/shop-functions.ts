import * as coda from '@codahq/packs-sdk';

import { restGetRequest } from '../helpers-rest';

export const fetchShopDetails = async (fields, context: coda.ExecutionContext) => {
  const params = {};
  if (fields) {
    params['fields'] = fields.join(',');
  }
  const url = coda.withQueryParams(`${context.endpoint}/admin/api/2022-10/shop.json`, params);
  const response = await restGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.shop) {
    return body.shop;
  }
};
