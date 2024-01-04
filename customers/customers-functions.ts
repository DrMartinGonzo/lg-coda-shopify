import * as coda from '@codahq/packs-sdk';

import {
  cleanQueryParams,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
  makeSyncTableGetRequest,
} from '../helpers-rest';
import { CACHE_SINGLE_FETCH, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { FormatFunction } from '../types/misc';
import { SyncTableRestContinuation } from '../types/tableSync';
import { handleFieldDependencies } from '../helpers';
import { customerFieldDependencies } from './customers-schema';
import { graphQlGidToId } from '../helpers-graphql';

export const formatCustomer: FormatFunction = (customer, context) => {
  customer.admin_url = `${context.endpoint}/admin/customers/${customer.id}`;
  if (customer.first_name || customer.last_name) {
    customer.display = [customer.first_name, customer.last_name].join(' ');
  } else if (customer.email) {
    customer.display = customer.email;
  } else {
    customer.display = customer.id;
  }

  return customer;
};

export const fetchCustomer = async ([customerID], context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${graphQlGidToId(customerID)}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  const { body } = response;

  if (body.customer) {
    return formatCustomer(body.customer, context);
  }
};

export const syncCustomers = async (
  [created_at_max, created_at_min, ids, since_id, updated_at_max, updated_at_min],
  context: coda.SyncExecutionContext
) => {
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, customerFieldDependencies);

  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields: syncedFields.join(', '),
    ids,
    limit: REST_DEFAULT_LIMIT,
    since_id,
    updated_at_max,
    updated_at_min,
  });

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers.json`, params);

  return await makeSyncTableGetRequest(
    {
      url,
      formatFunction: formatCustomer,
      mainDataKey: 'customers',
    },
    context
  );
};

export const createCustomer = async (fields: { [key: string]: any }, context: coda.ExecutionContext) => {
  // validateCustomerParams(fields);

  const payload = { customer: cleanQueryParams(fields) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers.json`;

  return makePostRequest({ url, payload }, context);
};

export const updateCustomer = async (customerGid, fields: { [key: string]: any }, context: coda.ExecutionContext) => {
  const params = cleanQueryParams(fields);
  // validateCustomerParams(params);

  const payload = { customer: params };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${graphQlGidToId(customerGid)}.json`;
  const response = await makePutRequest({ url, payload }, context);

  return formatCustomer(response.body.customer, context);
};

export const deleteCustomer = async ([customerGid], context) => {
  const customerId = graphQlGidToId(customerGid);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${customerId}.json`;
  return makeDeleteRequest({ url }, context);
};
