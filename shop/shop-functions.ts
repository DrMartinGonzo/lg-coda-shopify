import * as coda from '@codahq/packs-sdk';

import { makeGetRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';
import { FetchRequestOptions } from '../types/Requests';

export const fetchShopDetailsRest = async (
  fields,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const { cacheTtlSecs } = requestOptions;
  const params = {};
  if (fields) {
    params['fields'] = fields.join(',');
  }
  const url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/shop.json`, params);
  const response = await makeGetRequest({ url, cacheTtlSecs }, context);
  const { body } = response;

  if (body.shop) {
    return body.shop;
  }
};
