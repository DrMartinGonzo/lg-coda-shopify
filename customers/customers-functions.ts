import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makeGetRequest, makeSyncTableGetRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';
import { FormatFunction } from '../types/misc';
import { SyncTableRestContinuation } from '../types/tableSync';
import { handleFieldDependencies } from '../helpers';
import { customerFieldDependencies } from './customers-schema';

export const formatCustomer: FormatFunction = (customer, context) => {
  customer.admin_url = `${context.endpoint}/admin/customers/${customer.id}`;
  if (customer.first_name && customer.last_name) {
    customer.display = customer.first_name + ' ' + customer.last_name;
  } else if (customer.email) {
    customer.display = customer.email;
  } else {
    customer.display = customer.id;
  }

  return customer;
};

export const fetchCustomer = async ([customerID], context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${customerID}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.customer) {
    return formatCustomer(body.customer);
  }
};

export const syncCustomers = async (
  [created_at_max, created_at_min, ids, maxEntriesPerRun, since_id, updated_at_max, updated_at_min],
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
    limit: maxEntriesPerRun,
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
