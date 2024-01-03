import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, extractNextUrlPagination, restGetRequest } from '../helpers-rest';
import { REST_DEFAULT_VERSION } from '../constants';

// const API_VERSION = '2022-07';
const API_VERSION = REST_DEFAULT_VERSION;

export const formatCustomer = (data) => {
  if (data.first_name && data.last_name) {
    data.display = data.first_name + ' ' + data.last_name;
  } else if (data.email) {
    data.display = data.email;
  } else {
    data.display = data.id;
  }

  return data;
};

export const fetchCustomer = async ([customerID], context) => {
  const url = `${context.endpoint}/admin/api/${API_VERSION}/customers/${customerID}.json`;
  const response = await restGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.customer) {
    return formatCustomer(body.customer);
  }
};

export const fetchAllCustomers = async (
  [created_at_max, created_at_min, ids, maxEntriesPerRun, since_id, updated_at_max, updated_at_min],
  context
) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields: syncedFields.join(', '),
    ids,
    limit: maxEntriesPerRun,
    since_id,
    updated_at_max,
    updated_at_min,
  });

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/customers.json`, params);

  const response = await restGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.customers) {
    items = body.customers.map(formatCustomer);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
