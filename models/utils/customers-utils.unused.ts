// #region Imports

// #endregion

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
  const defaultLimit = 50;
  const { limit, shouldDeferBy } = await getGraphQlSyncTableMaxLimitAndDeferWait(
    defaultLimit,
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
      limit,
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
      limit,
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
