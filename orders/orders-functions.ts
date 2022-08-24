import * as coda from '@codahq/packs-sdk';

import { OPTIONS_ORDER_FINANCIAL_STATUS, OPTIONS_ORDER_FULFILLMENT_STATUS, OPTIONS_ORDER_STATUS } from '../constants';
import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder } from '../helpers';

import { formatCustomer } from '../customers/customers-functions';

export const formatOrder = (data) => {
  if (data.customer) {
    data.customer = formatCustomer(data.customer);
  }

  return data;
};

export const fetchOrder = async ([orderID], context) => {
  const response = await context.fetcher.fetch({
    method: 'GET',
    url: `${context.endpoint}/admin/api/2022-07/orders/${orderID}.json`,
    cacheTtlSec: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.order) {
    return formatOrder(body.order);
  }
};

export const fetchAllOrders = async (
  [
    status,
    created_at_max,
    created_at_min,
    fields,
    financial_status,
    fulfillment_status,
    ids,
    limit,
    processed_at_max,
    processed_at_min,
    since_id,
    updated_at_max,
    updated_at_min,
  ],
  context
) => {
  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields,
    financial_status,
    fulfillment_status,
    ids,
    limit,
    processed_at_max,
    processed_at_min,
    since_id,
    status,
    updated_at_max,
    updated_at_min,
  });

  if (params.status && !OPTIONS_ORDER_STATUS.includes(params.status)) {
    throw new coda.UserVisibleError('Unknown status: ' + params.status);
  }
  if (params.financial_status && !OPTIONS_ORDER_FINANCIAL_STATUS.includes(params.financial_status)) {
    throw new coda.UserVisibleError('Unknown financial status: ' + params.financial_status);
  }
  if (params.fulfillment_status && !OPTIONS_ORDER_FULFILLMENT_STATUS.includes(params.fulfillment_status)) {
    throw new coda.UserVisibleError('Unknown financial status: ' + params.financial_status);
  }

  let url =
    context.sync.continuation ?? coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/orders.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.orders) {
    items = body.orders.map(formatOrder);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
