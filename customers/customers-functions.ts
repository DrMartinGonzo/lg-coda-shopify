import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { CACHE_SINGLE_FETCH, REST_DEFAULT_API_VERSION } from '../constants';
import { FormatFunction } from '../types/misc';

import {
  CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN,
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
  CustomerSchema,
} from '../schemas/syncTable/CustomerSchema';
import { idToGraphQlGid } from '../helpers-graphql';
import {
  separatePrefixedMetafieldsKeysFromKeys,
  handleResourceMetafieldsUpdateGraphQl,
  getMetafieldKeyValueSetsFromUpdate,
} from '../metafields/metafields-functions';
import { CustomerCreateRestParams, CustomerUpdateRestParams } from '../types/Customer';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { GraphQlResource } from '../types/GraphQl';

// #region Helpers
/*
export function customerCodaParamsToRest(params: CustomerCreateRestParams & CustomerUpdateRestParams) {
  if (params.accepts_email_marketing !== undefined) {
    params.email_marketing_consent = {
      state:
        params.accepts_email_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
      opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
    };
  }
  if (params.accepts_sms_marketing !== undefined) {
    params.sms_marketing_consent = {
      state:
        params.accepts_sms_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
      opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
    };
  }

  return params;
}
*/

function formatCustomerStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof CustomerSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    const value = values[fromKey];

    // Edge cases
    if (fromKey === 'accepts_email_marketing') {
      restParams.email_marketing_consent = {
        state: value === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    } else if (fromKey === 'accepts_sms_marketing') {
      restParams.sms_marketing_consent = {
        state: value === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }
    // Disabled for now, prefer to use simple checkboxes
    /*
    else if (fromKey === 'email_marketing_consent') {
      const matchingOption = MARKETING_CONSENT_UPDATE_OPTIONS.find((option) => option.display === value);
      restParams.email_marketing_consent = {
        state: matchingOption.state,
        opt_in_level: matchingOption.opt_in_level,
      };
    } else if (fromKey === 'sms_marketing_consent') {
      const matchingOption = MARKETING_CONSENT_UPDATE_OPTIONS.find((option) => option.display === value);
      restParams.sms_marketing_consent = {
        state: matchingOption.state,
        opt_in_level: matchingOption.opt_in_level,
      };
    }
    */
    // No processing needed
    else {
      restParams[fromKey] = value;
    }
  });

  return restParams;
}

export async function handleCustomerUpdateJob(
  update: coda.SyncUpdate<string, string, typeof CustomerSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const customerId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: CustomerUpdateRestParams = formatCustomerStandardFieldsRestParams(
      standardFromKeys,
      update.newValue
    );
    subJobs.push(updateCustomerRest(customerId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateGraphQl(
        idToGraphQlGid(GraphQlResource.Customer, customerId),
        getMetafieldKeyValueSetsFromUpdate(prefixedMetafieldFromKeys, update.newValue, metafieldDefinitions),
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

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
      display: formatAddressDisplayName(customer.default_address),
      ...customer.default_address,
    };
  }
  if (customer.addresses) {
    obj.addresses = customer.addresses.map((address) => ({
      display: formatAddressDisplayName(address),
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
  context: coda.ExecutionContext
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
    const metafields = formatMetafieldsForSchema(customer.metafields.nodes as Metafield[]);
    obj = {
      ...obj,
      ...metafields,
    };
  }

  // // TODO: format CustomerAddressSchema so that the object pill display something when address1 is empty. Something like name + country name

  return obj;
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
  if (shouldSyncMetafields) {
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
      getPageInfo: (data: any) => data.customers?.pageInfo,
    },
    context
  );
  if (response && response.body.data?.customers) {
    const data = response.body.data as GetCustomersWithMetafieldsQuery;
    return {
      result: data.customers.nodes.map((customer) =>
        formatCustomerForSchemaFromGraphQlApi(customer, context)
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
