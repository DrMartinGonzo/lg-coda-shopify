// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN,
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
  CustomerSyncTableSchema,
} from '../schemas/syncTable/CustomerSchema';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { RestResourceName } from '../types/RequestsRest';

import type { Customer as CustomerRest } from '@shopify/shopify-api/rest/admin/2023-10/customer';
import type { CustomerRow } from '../types/CodaRows';
import type { CustomerCreateRestParams, CustomerUpdateRestParams } from '../types/Customer';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';

// #endregion

// #region Class
export class CustomerRestFetcher extends SimpleRest<RestResourceName.Customer, typeof CustomerSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Customer, CustomerSyncTableSchema, context);
  }

  formatRowToApi = (
    row: Partial<CustomerRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): CustomerUpdateRestParams | CustomerCreateRestParams | undefined => {
    let restParams: CustomerUpdateRestParams | CustomerCreateRestParams = {};

    if (row.first_name !== undefined) restParams.first_name = row.first_name;
    if (row.last_name !== undefined) restParams.last_name = row.last_name;
    if (row.email !== undefined) restParams.email = row.email;
    if (row.phone !== undefined) restParams.phone = row.phone;
    if (row.note !== undefined) restParams.note = row.note;
    if (row.tags !== undefined) restParams.tags = row.tags;

    if (row.accepts_email_marketing !== undefined)
      restParams.email_marketing_consent = {
        state:
          row.accepts_email_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    if (row.accepts_sms_marketing !== undefined)
      restParams.sms_marketing_consent = {
        state: row.accepts_sms_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as CustomerCreateRestParams;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (customer): CustomerRow => {
    let obj: CustomerRow = {
      ...customer,
      admin_url: `${this.context.endpoint}/admin/customers/${customer.id}`,
      display: formatCustomerDisplayValue(customer),
      // Disabled for now, prefer to use simple checkboxes
      // email_marketing_consent: formatEmailMarketingConsent(customer.email_marketing_consent),
      // sms_marketing_consent: formatEmailMarketingConsent(customer.sms_marketing_consent),
    };

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

  updateWithMetafields = async (
    row: {
      original?: CustomerRow;
      updated: CustomerRow;
    },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<CustomerRow> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}
// #endregion

// #region Formatting
export function formatCustomerDisplayValue(
  customer: Pick<CustomerRest, 'id' | 'first_name' | 'last_name' | 'email'>
): string {
  if (customer.first_name || customer.last_name) {
    return [customer.first_name, customer.last_name].filter((p) => p && p !== '').join(' ');
  } else if (customer.email) {
    return customer.email;
  }
  return customer.id.toString();
}
// #endregion

// #region Unused stuff
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
  if (response?.body.data?.customers) {
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
