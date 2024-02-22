// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CODA_SUPPORTED_CURRENCIES,
  IDENTITY_ORDER,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  fetchOrder,
  formatOrderForDocExport,
  formatOrderForSchemaFromRestApi,
  handleOrderUpdateJob,
  validateOrderParams,
} from './orders-functions';
import { OrderSchema, orderFieldDependencies } from '../schemas/syncTable/OrderSchema';
import { sharedParameters } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { GetOrdersMetafieldsQuery, GetOrdersMetafieldsQueryVariables } from '../types/admin.generated';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, extractNextUrlPagination, makeGetRequest, makeSyncTableGetRequest } from '../helpers-rest';
import { QueryOrdersMetafieldsAdmin, buildOrdersSearchQuery } from './orders-graphql';
import { fetchShopDetails } from '../shop/shop-functions';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';

// #endregion

async function getOrderSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = OrderSchema;
  // let augmentedSchema = OrderSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(OrderSchema, MetafieldOwnerType.Order, context);
  }

  const shop = await fetchShopDetails(['currency'], context);
  if (shop && shop['currency']) {
    let currencyCode = shop['currency'];
    if (!CODA_SUPPORTED_CURRENCIES.includes(currencyCode)) {
      console.error(`Shop currency ${currencyCode} not supported. Falling back to USD.`);
      currencyCode = 'USD';
    }

    // Refund order adjustments
    [augmentedSchema.properties.refunds.items.properties.order_adjustments.items.properties].forEach((properties) => {
      properties.amount.currencyCode = currencyCode;
      properties.tax_amount.currencyCode = currencyCode;
    });

    // Refund transactions
    [augmentedSchema.properties.refunds.items.properties.transactions.items.properties].forEach((properties) => {
      properties.amount.currencyCode = currencyCode;
      properties.total_unsettled.currencyCode = currencyCode;
    });

    // Refund line items
    [augmentedSchema.properties.refunds.items.properties.refund_line_items.items.properties].forEach((properties) => {
      properties.subtotal.currencyCode = currencyCode;
      properties.total_tax.currencyCode = currencyCode;
    });

    // Line items
    [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
      properties.price.currencyCode = currencyCode;
      properties.total_discount.currencyCode = currencyCode;
      properties.discount_allocations.items.properties.amount.currencyCode = currencyCode;
    });

    // Shipping lines
    [augmentedSchema.properties.shipping_lines.items.properties].forEach((properties) => {
      properties.discounted_price.currencyCode = currencyCode;
      properties.price.currencyCode = currencyCode;
    });

    // Tax lines
    [
      augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
      augmentedSchema.properties.shipping_lines.items.properties.tax_lines.items.properties,
      augmentedSchema.properties.tax_lines.items.properties,
      augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
      augmentedSchema.properties.refunds.items.properties.duties.items.properties.tax_lines.items.properties,
    ].forEach((properties) => {
      properties.price.currencyCode = currencyCode;
    });

    // Main props
    augmentedSchema.properties.current_subtotal_price.currencyCode = currencyCode;
    augmentedSchema.properties.current_total_additional_fees.currencyCode = currencyCode;
    augmentedSchema.properties.current_total_discounts.currencyCode = currencyCode;
    augmentedSchema.properties.current_total_duties.currencyCode = currencyCode;
    augmentedSchema.properties.current_total_price.currencyCode = currencyCode;
    augmentedSchema.properties.current_total_tax.currencyCode = currencyCode;

    augmentedSchema.properties.subtotal_price.currencyCode = currencyCode;

    augmentedSchema.properties.total_discounts.currencyCode = currencyCode;
    augmentedSchema.properties.total_line_items_price.currencyCode = currencyCode;
    augmentedSchema.properties.total_outstanding.currencyCode = currencyCode;
    augmentedSchema.properties.total_price.currencyCode = currencyCode;
    augmentedSchema.properties.total_shipping_price.currencyCode = currencyCode;
    augmentedSchema.properties.total_tax.currencyCode = currencyCode;
    augmentedSchema.properties.total_tip_received.currencyCode = currencyCode;
  }

  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

/**
 * The properties that can be updated when updating an order.
 */
const standardUpdateProps = [
  {
    display: 'Note',
    key: 'note',
    type: 'string',
  },
  {
    display: 'Email',
    key: 'email',
    type: 'string',
  },
  {
    display: 'Phone',
    key: 'phone',
    type: 'string',
  },
  {
    display: 'Buyer accepts marketing',
    key: 'buyer_accepts_marketing',
    type: 'boolean',
  },
  {
    display: 'Tags',
    key: 'tags',
    type: 'string',
  },
];

const parameters = {
  orderId: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'orderID',
    description: 'The id of the order.',
  }),
  filterFields: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fields',
    description: 'Comma separated string of fields to retrieve.',
  }),
};

// #region Sync tables
export const Sync_Orders = coda.makeSyncTable({
  name: 'Orders',
  description: 'Return Orders from this shop. You can also fetch metafields by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_ORDER,
  schema: OrderSchema,
  dynamicOptions: {
    getSchema: getOrderSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrders',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      sharedParameters.orderStatus,
      sharedParameters.optionalSyncMetafields,

      { ...sharedParameters.filterCreatedAtRange, optional: true },
      { ...sharedParameters.filterUpdatedAtRange, optional: true },
      { ...sharedParameters.filterProcessedAtRange, optional: true },

      { ...sharedParameters.filterFinancialStatus, optional: true },
      { ...sharedParameters.filterFulfillmentStatus, optional: true },
      { ...sharedParameters.filterIds, optional: true },
      { ...sharedParameters.filterSinceId, optional: true },
    ],
    execute: async function (
      [
        status = 'any',
        syncMetafields,
        created_at,
        updated_at,
        processed_at,
        financial_status,
        fulfillment_status,
        ids,
        since_id,
      ],
      context
    ) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getOrderSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      let restLimit = REST_DEFAULT_LIMIT;
      let maxEntriesPerRun = restLimit;
      let shouldDeferBy = 0;

      if (shouldSyncMetafields) {
        // TODO: calc this
        const defaultMaxEntriesPerRun = 200;
        const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        maxEntriesPerRun = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
        restLimit = maxEntriesPerRun;
        shouldDeferBy = syncTableMaxEntriesAndDeferWait.shouldDeferBy;
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
        }
      }

      let restItems = [];
      let restContinuation: SyncTableRestContinuation = null;
      const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

      // Rest Admin API Sync
      if (!skipNextRestSync) {
        const syncedStandardFields = handleFieldDependencies(standardFromKeys, orderFieldDependencies);
        const restParams = cleanQueryParams({
          fields: syncedStandardFields.join(', '),
          limit: restLimit,
          ids: ids && ids.length ? ids.join(',') : undefined,
          financial_status,
          fulfillment_status,
          status,
          since_id,
          created_at_min: created_at ? created_at[0] : undefined,
          created_at_max: created_at ? created_at[1] : undefined,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
          processed_at_min: processed_at ? processed_at[0] : undefined,
          processed_at_max: processed_at ? processed_at[1] : undefined,
        });

        // validateOrdersParams(restParams);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders.json`,
            restParams
          );
        }
        const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
        restContinuation = continuation;

        if (response && response.body?.orders) {
          restItems = response.body.orders.map((order) => formatOrderForSchemaFromRestApi(order, context));
        }

        if (!shouldSyncMetafields) {
          return {
            result: restItems,
            continuation: restContinuation,
          };
        }
      }

      // GraphQL Admin API metafields augmented Sync
      if (shouldSyncMetafields) {
        const { toProcess, remaining } = getMixedSyncTableRemainingAndToProcessItems(
          prevContinuation,
          restItems,
          maxEntriesPerRun
        );
        const uniqueIdsToFetch = arrayUnique(toProcess.map((c) => c.id)).sort();
        const graphQlPayload = {
          query: QueryOrdersMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildOrdersSearchQuery({ ids: uniqueIdsToFetch }),
          } as GetOrdersMetafieldsQueryVariables,
        };

        let { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeMixedSyncTableGraphQlRequest(
            {
              payload: graphQlPayload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableMixedContinuation,
              nextRestUrl: restContinuation?.nextUrl,
              extraContinuationData: {
                currentBatch: {
                  remaining: remaining,
                  processing: toProcess,
                },
              },
              getPageInfo: (data: GetOrdersMetafieldsQuery) => data.orders?.pageInfo,
            },
            context
          );

        if (augmentedResponse && augmentedResponse.body?.data) {
          const customersData = augmentedResponse.body.data as GetOrdersMetafieldsQuery;
          const augmentedItems = toProcess
            .map((resource) => {
              const graphQlNodeMatch = customersData.orders.nodes.find((c) => graphQlGidToId(c.id) === resource.id);

              // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
              if (!graphQlNodeMatch) return;

              if (graphQlNodeMatch?.metafields?.nodes?.length) {
                graphQlNodeMatch.metafields.nodes.forEach((metafield) => {
                  const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
                  resource[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
                });
              }
              return resource;
            })
            .filter((p) => p); // filter out undefined items

          return {
            result: augmentedItems,
            continuation: augmentedContinuation,
          };
        }

        return {
          result: [],
          continuation: augmentedContinuation,
        };
      }

      return {
        result: [],
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Order }, context)
        : [];

      const jobs = updates.map((update) => handleOrderUpdateJob(update, metafieldDefinitions, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
    },
  },
});
// #endregion

// #region Formulas
export const Formula_Order = coda.makeFormula({
  name: 'Order',
  description: 'Get a single order data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.orderId],
  cacheTtlSecs: 10,
  resultType: coda.ValueType.Object,
  schema: OrderSchema,
  execute: fetchOrder,
});

export const Formula_Orders = coda.makeFormula({
  name: 'Orders',
  description: 'Get orders data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...sharedParameters.orderStatus, optional: true },
    { ...sharedParameters.filterCreatedAtRange, optional: true },
    { ...sharedParameters.filterFinancialStatus, optional: true },
    { ...sharedParameters.filterFulfillmentStatus, optional: true },
    { ...sharedParameters.filterIds, optional: true },
    { ...sharedParameters.filterProcessedAtRange, optional: true },
    { ...sharedParameters.filterUpdatedAtRange, optional: true },
    { ...parameters.filterFields, optional: true },
  ],
  cacheTtlSecs: 10,
  resultType: coda.ValueType.Array,
  items: OrderSchema,
  execute: async function (
    [status, created_at, financial_status, fulfillment_status, ids, processed_at, updated_at, fields],
    context
  ) {
    const params = cleanQueryParams({
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      processed_at_min: processed_at ? processed_at[0] : undefined,
      processed_at_max: processed_at ? processed_at[1] : undefined,
      fields,
      financial_status,
      fulfillment_status,
      ids: ids && ids.length ? ids.join(',') : undefined,
      limit: REST_DEFAULT_LIMIT,
      status,
    });
    validateOrderParams(params);

    let items = [];
    let nextUrl: string;
    let run = true;
    while (run) {
      let url =
        nextUrl ??
        coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders.json`, params);
      const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
      const { body } = response;
      if (body.orders && body.orders.length) {
        items = items.concat(body.orders.map((order) => formatOrderForSchemaFromRestApi(order, context)));
      }

      nextUrl = extractNextUrlPagination(response);
      if (!nextUrl) run = false;
    }

    return items;
  },
});

export const Formula_OrderExportFormat = coda.makeFormula({
  name: 'OrderExportFormat',
  description: 'Return JSON suitable for our custom lg-coda-export-documents pack.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.orderId],
  cacheTtlSecs: 10,
  resultType: coda.ValueType.String,
  execute: async ([orderID], context) => {
    const order = await fetchOrder([orderID], context);
    return formatOrderForDocExport(order);
  },
});

export const Format_Order: coda.Format = {
  name: 'Order',
  instructions: 'Paste the ID of the order into the column.',
  formulaName: 'Order',
};
// #endregion
