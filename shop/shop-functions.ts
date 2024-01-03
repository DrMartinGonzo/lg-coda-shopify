import * as coda from '@codahq/packs-sdk';

import { restGetRequest } from '../helpers-rest';
import { REST_DEFAULT_VERSION } from '../constants';

// const API_VERSION = '2022-10';
const API_VERSION = REST_DEFAULT_VERSION;

export const fetchShopDetails = async (fields, context: coda.ExecutionContext) => {
  const params = {};
  if (fields) {
    params['fields'] = fields.join(',');
  }
  const url = coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/shop.json`, params);
  const response = await restGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.shop) {
    return body.shop;
  }
};
