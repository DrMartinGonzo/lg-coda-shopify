import * as coda from '@codahq/packs-sdk';

import { makeGetRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';

export const fetchShopDetails = async (fields, context: coda.ExecutionContext) => {
  const params = {};
  if (fields) {
    params['fields'] = fields.join(',');
  }
  const url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/shop.json`, params);
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.shop) {
    return body.shop;
  }
};
