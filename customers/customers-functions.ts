import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { CACHE_SINGLE_FETCH, REST_DEFAULT_API_VERSION } from '../constants';
import { FormatFunction } from '../types/misc';

import {
  CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN,
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
  CustomerSchema,
} from './customers-schema';
import { idToGraphQlGid } from '../helpers-graphql';
import {
  separatePrefixedMetafieldsKeysFromKeys,
  handleResourceMetafieldsUpdateGraphQl,
} from '../metafields/metafields-functions';
import { CustomerCreateRestParams, CustomerUpdateRestParams } from '../types/Customer';
import { MetafieldDefinitionFragment } from '../types/admin.generated';

// #region Helpers
export function codaCustomerValuesToRest(fields: CustomerUpdateRestParams) {
  // Disabled for now, prefer to use simple checkboxes
  /*
  if (fields.email_marketing_consent) {
    const matchingOption = MARKETING_CONSENT_UPDATE_OPTIONS.find(
      (option) => option.display === fields.email_marketing_consent
    );
    fields.email_marketing_consent = {
      state: matchingOption.state,
      opt_in_level: matchingOption.opt_in_level,
    };
  }
  if (fields.sms_marketing_consent) {
    const matchingOption = MARKETING_CONSENT_UPDATE_OPTIONS.find(
      (option) => option.display === fields.sms_marketing_consent
    );
    fields.sms_marketing_consent = {
      state: matchingOption.state,
      opt_in_level: matchingOption.opt_in_level,
    };
  }
  */

  if (fields.accepts_email_marketing !== undefined) {
    fields.email_marketing_consent = {
      state:
        fields.accepts_email_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
      opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
    };
  }
  if (fields.accepts_sms_marketing !== undefined) {
    fields.sms_marketing_consent = {
      state:
        fields.accepts_sms_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
      opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
    };
  }

  return fields;
}

export async function handleCustomerUpdateJob(
  update: coda.SyncUpdate<string, string, typeof CustomerSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);
  let obj = { ...update.previousValue };
  const subJobs: Promise<any>[] = [];
  const customerId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: CustomerUpdateRestParams = {};
    standardFromKeys.forEach((fromKey) => {
      const value = update.newValue[fromKey];
      restParams[fromKey] = value;
    });

    subJobs.push(updateCustomerRest(customerId, codaCustomerValuesToRest(restParams), context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateGraphQl(
        idToGraphQlGid('Customer', customerId),
        'customer',
        metafieldDefinitions,
        update,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  const [restResponse, metafields] = await Promise.all(subJobs);
  if (restResponse) {
    if (restResponse.body?.customer) {
      obj = {
        ...obj,
        ...formatCustomerForSchemaFromRestApi(restResponse.body.customer, context),
      };
    }
  }
  if (metafields) {
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
}
// #endregion

// #region Formatting
function formatCustomerAddressDisplayName(address, withName = true, withCompany = true) {
  const parts = [
    withName ? [address?.first_name, address?.last_name].filter((p) => p && p !== '').join(' ') : undefined,
    withCompany ? address?.company : undefined,
    address?.address1,
    address?.address2,
    address?.city,
    address?.country,
  ];

  return parts.filter((part) => part && part !== '').join(', ');
}

export const formatCustomerForSchemaFromRestApi: FormatFunction = (customer, context) => {
  let obj: any = {
    ...customer,
    admin_url: `${context.endpoint}/admin/customers/${customer.id}`,
    // Disabled for now, prefer to use simple checkboxes
    // email_marketing_consent: formatEmailMarketingConsent(customer.email_marketing_consent),
    // sms_marketing_consent: formatEmailMarketingConsent(customer.sms_marketing_consent),
  };

  if (customer.first_name || customer.last_name) {
    obj.display = [customer.first_name, customer.last_name].filter((p) => p && p !== '').join(' ');
  } else if (customer.email) {
    obj.display = customer.email;
  } else {
    obj.display = customer.id;
  }
  if (customer.default_address) {
    obj.default_address = {
      display: formatCustomerAddressDisplayName(customer.default_address),
      ...customer.default_address,
    };
  }
  if (customer.addresses) {
    obj.addresses = customer.addresses.map((address) => ({
      display: formatCustomerAddressDisplayName(address),
      ...address,
    }));
  }
  if (customer.email_marketing_consent) {
    obj.accepts_email_marketing = customer.email_marketing_consent.state === CONSENT_STATE__SUBSCRIBED.value;
  }
  if (customer.sms_marketing_consent) {
    obj.accepts_sms_marketing = customer.sms_marketing_consent.state === CONSENT_STATE__SUBSCRIBED.value;
  }

  return obj;
};
// #endregion

// #region Rest requests
export const fetchCustomerRest = (customer_id: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${customer_id}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
};

export function createCustomerRest(params: CustomerCreateRestParams, context: coda.ExecutionContext) {
  const restParams = cleanQueryParams(params);
  // validateCustomerParams(restParams);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers.json`;
  const payload = { customer: restParams };
  return makePostRequest({ url, payload }, context);
}

export const updateCustomerRest = async (
  customerId: number,
  params: CustomerUpdateRestParams,
  context: coda.ExecutionContext
) => {
  const restParams = cleanQueryParams(params);
  // validateCustomerParams(params);
  const payload = { customer: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${customerId}.json`;
  return makePutRequest({ url, payload }, context);
};

export const deleteCustomer = async (customer_id: number, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers/${customer_id}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion

// #region Unused stuff
/*
function formatEmailMarketingConsent(consent) {
  if (!consent) return undefined;
  return MARKETING_CONSENT_ALL_OPTIONS.find((option) => {
    return option.state === consent.state && option.opt_in_level === consent.opt_in_level;
  })?.display;
}
*/

/*
function formatCustomerAddressForSchemaFromGraphQl(address) {
  return {
    ...address,
    country_code: address.countryCodeV2,
    country_name: address.country,
    first_name: address.firstName,
    last_name: address.lastName,
    province_code: address.provinceCode,
    display: address.formatted.join(', '),
  };
}
*/

/*
export const formatCustomerForSchemaFromGraphQlApi = (
  customer,
  context: coda.ExecutionContext,
  metafieldDefinitions: MetafieldDefinition[]
) => {
  let obj: any = {
    ...customer,
    id: graphQlGidToId(customer.id),
    admin_graphql_api_id: customer.id,
    admin_url: `${context.endpoint}/admin/customers/${graphQlGidToId(customer.id)}`,
    display: customer.displayName,
    first_name: customer.firstName,
    last_name: customer.lastName,
    total_spent: customer.amountSpent?.amount,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    multipass_identifier: customer.multipassIdentifier,
    orders_count: customer.numberOfOrders,
    addresses: customer.addresses ? customer.addresses.map(formatCustomerAddressForSchemaFromGraphQl) : undefined,
    default_address: customer.defaultAddress
      ? formatCustomerAddressForSchemaFromGraphQl(customer.defaultAddress)
      : undefined,

    // customer.admin_url = `${context.endpoint}/admin/customers/${customer.id}`;
    // customer.email_marketing_consent = formatEmailMarketingConsent(customer.email_marketing_consent);
    // if (customer.first_name || customer.last_name) {
    //   customer.display = [customer.first_name, customer.last_name].join(' ');
    // } else if (customer.email) {
    //   customer.display = customer.email;
    // } else {
    //   customer.display = customer.id;
  };

  if (customer?.metafields?.nodes?.length) {
    const metafields = formatMetafieldsForSchema(customer.metafields.nodes as Metafield[], metafieldDefinitions);
    obj = {
      ...obj,
      ...metafields,
    };
  }

  // // TODO: format CustomerAddressSchema so that the object pill display something when address1 is empty. Something like name + country name

  return obj;
};
*/

/*
export const syncCustomersRest = async (
  [created_at_max, created_at_min, ids, since_id, updated_at_max, updated_at_min, syncMetafields],
  context: coda.SyncExecutionContext
) => {
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const {
    prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys,
    standardFromKeys: effectiveStandardPropertyKeys,
  } = separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
  let metafieldDefinitions: MetafieldDefinition[] = [];

  // No need to check for syncMetafields value since the schema will be refetched before ach sync and any metafield column previously enabled will be removed
  // if (syncMetafields) {
  const effectiveMetafieldRealKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
  const shouldSyncMetafields = !!effectiveMetafieldRealKeys.length;
  if (shouldSyncMetafields) {
    metafieldDefinitions =
      prevContinuation?.extraContinuationData?.metafieldDefinitions ??
      (await fetchMetafieldDefinitions('CUSTOMER', context));
  }
  // }

  const syncedStandardFields = handleFieldDependencies(effectiveStandardPropertyKeys, customerFieldDependencies);
  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields: syncedStandardFields.join(', '),
    ids,
    // limit: REST_DEFAULT_LIMIT,
    // TODO: calculate best possible value based on effectiveMetafieldKeys.length
    limit: shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
    since_id,
    updated_at_max,
    updated_at_min,
  });

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers.json`, params);

  let restResult = [];
  let { response, continuation } = await makeSyncTableGetRequest(
    { url, extraContinuationData: { metafieldDefinitions } },
    context
  );
  if (response && response.body?.customers) {
    restResult = response.body.customers.map((customer) => formatCustomerForSchemaFromRestApi(customer, context));
  }

  // let { result, continuation } = await makeSyncTableGetRequest(
  //   {
  //     url,
  //     formatFunction: formatCustomerForSchemaFromRestApi,
  //     mainDataKey: 'customers',
  //     extraContinuationData: { metafieldDefinitions },
  //   },
  //   context
  // );

  // Add metafields by doing multiple Rest Admin API calls
  // if (shouldSyncMetafields) {
  //   restResult = await Promise.all(
  //     restResult.map(async (resource) => {
  //       const response = await fetchResourceMetafields(resource.id, 'customer', {}, context);

  //       // Only keep metafields that have a definition are in the schema
  //       const metafields: MetafieldRest[] = response.body.metafields.filter((meta: MetafieldRest) =>
  //         effectiveMetafieldRealKeys.includes(`${meta.namespace}.${meta.key}`)
  //       );
  //       if (metafields.length) {
  //         return {
  //           ...resource,
  //           ...formatMetafieldsForSchema(metafields, metafieldDefinitions),
  //         };
  //       }
  //       return resource;
  //     })
  //   );
  // }

  return {
    result: restResult,
    continuation,
  };
};
*/

/**
 * Sync customers using GraphQL Admin API
 */
/*
export const syncCustomersGraphQlAdmin = async (
  [created_at_max, created_at_min, ids, since_id, updated_at_max, updated_at_min, syncMetafields],
  context: coda.SyncExecutionContext
) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  // TODO: get an approximation for first run by using count of relation columns ?
  const defaultMaxEntriesPerRun = 50;
  const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
    defaultMaxEntriesPerRun,
    prevContinuation,
    context
  );
  if (shouldDeferBy > 0) {
    return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
  }

  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys } =
    separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
  const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
  const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

  // Include optional nested fields. We only request these when necessary as they increase the query cost
  const optionalNestedFields = [];
  if (effectivePropertyKeys.includes('featuredImage')) optionalNestedFields.push('featuredImage');
  if (effectivePropertyKeys.includes('options')) optionalNestedFields.push('options');
  // Metafield optional nested fields
  let metafieldDefinitions: MetafieldDefinition[] = [];
  if (shouldSyncMetafields) {
    metafieldDefinitions =
      prevContinuation?.extraContinuationData?.metafieldDefinitions ??
      (await fetchMetafieldDefinitions('CUSTOMER', context));
    optionalNestedFields.push('metafields');
  }

  const queryFilters = {};
  // Remove any undefined filters
  Object.keys(queryFilters).forEach((key) => {
    if (queryFilters[key] === undefined) delete queryFilters[key];
  });

  const payload = {
    query: QueryCustomersAdmin,
    variables: {
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
      metafieldKeys: effectiveMetafieldKeys,
      countMetafields: effectiveMetafieldKeys.length,
      searchQuery: '',
      includeMetafields: optionalNestedFields.includes('metafields'),
    } as GetCustomersWithMetafieldsQueryVariables,
  };

  const { response, continuation } = await makeSyncTableGraphQlRequest(
    {
      payload,
      maxEntriesPerRun,
      prevContinuation,
      extraContinuationData: { metafieldDefinitions },
      getPageInfo: (data: any) => data.customers?.pageInfo,
    },
    context
  );
  if (response && response.body.data?.customers) {
    const data = response.body.data as GetCustomersWithMetafieldsQuery;
    return {
      result: data.customers.nodes.map((customer) =>
        formatCustomerForSchemaFromGraphQlApi(customer, context, metafieldDefinitions)
      ),
      continuation,
    };
  } else {
    return {
      result: [],
      continuation,
    };
  }
};
*/
// #endregion
