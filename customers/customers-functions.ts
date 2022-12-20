import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder } from '../helpers';

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
  const response = await context.fetcher.fetch({
    method: 'GET',
    url: `${context.endpoint}/admin/api/2022-07/customers/${customerID}.json`,
    cacheTtlSecs: 10,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.customer) {
    return formatCustomer(body.customer);
  }
};

export const fetchAllCustomers = async (
  [created_at_max, created_at_min, fields, ids, limit, since_id, updated_at_max, updated_at_min],
  context
) => {
  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields,
    ids,
    limit,
    since_id,
    updated_at_max,
    updated_at_min,
  });

  let url =
    context.sync.continuation ?? coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/customers.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 0,
  });

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
