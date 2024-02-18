// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CODA_SUPPORTED_CURRENCIES, IDENTITY_ORDER_TRANSACTION } from '../constants';
import { formatOrderTransactionForSchemaFromGraphQlApi } from './orderTransactions-functions';
import { OrderTransactionSchema } from '../schemas/syncTable/OrderTransactionSchema';
import { sharedParameters } from '../shared-parameters';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { GetOrderTransactionsQuery, GetOrderTransactionsQueryVariables } from '../types/admin.generated';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';

import { QueryOrderTransactions, buildOrderTransactionsSearchQuery } from './orderTransactions-graphql';
import { fetchShopDetails } from '../shop/shop-functions';

// #endregion

async function getOrderTransactionSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  let augmentedSchema: any = OrderTransactionSchema;
  // let augmentedSchema = OrderSchema;

  const shop = await fetchShopDetails(['currency'], context);
  if (shop && shop['currency']) {
    let currencyCode = shop['currency'];
    if (!CODA_SUPPORTED_CURRENCIES.includes(currencyCode)) {
      console.error(`Shop currency ${currencyCode} not supported. Falling back to USD.`);
      currencyCode = 'USD';
    }

    // Main props
    augmentedSchema.properties.amount.currencyCode = currencyCode;
    augmentedSchema.properties.totalUnsettled.currencyCode = currencyCode;
  }

  return augmentedSchema;
}

// #region Sync tables
export const Sync_OrderTransactions = coda.makeSyncTable({
  name: 'OrderTransactions',
  description: 'All Shopify order transactions.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_ORDER_TRANSACTION,
  schema: OrderTransactionSchema,
  dynamicOptions: {
    getSchema: getOrderTransactionSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderTransactions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...sharedParameters.filterCreatedAtRange, name: 'orderCreatedAt', optional: true },
      { ...sharedParameters.filterUpdatedAtRange, name: 'orderUpdatedAt', optional: true },
      { ...sharedParameters.filterProcessedAtRange, name: 'orderProcessedAt', optional: true },
      { ...sharedParameters.filterFinancialStatus, name: 'orderFinancialStatus', optional: true },
      { ...sharedParameters.filterFulfillmentStatus, name: 'orderFulfillmentStatus', optional: true },
      { ...sharedParameters.orderStatus, name: 'orderStatus', suggestedValue: 'closed', optional: true },
      coda.makeParameter({
        type: coda.ParameterType.StringArray,
        name: 'gateways',
        description: 'Filter orders by the payment gateways used to process the transaction.',
        optional: true,
      }),
    ],
    execute: async function (
      [orderCreatedAt, orderUpdatedAt, orderProcessedAt, orderFinancialStatus, orderFulfillmentStatus, gateways],
      context: coda.SyncExecutionContext
    ) {
      const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
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

      const queryFilters = {
        created_at_min: orderCreatedAt ? orderCreatedAt[0] : undefined,
        created_at_max: orderCreatedAt ? orderCreatedAt[1] : undefined,
        updated_at_min: orderUpdatedAt ? orderUpdatedAt[0] : undefined,
        updated_at_max: orderUpdatedAt ? orderUpdatedAt[1] : undefined,
        processed_at_min: orderProcessedAt ? orderProcessedAt[0] : undefined,
        processed_at_max: orderProcessedAt ? orderProcessedAt[1] : undefined,
        financial_status: orderFinancialStatus,
        fulfillment_status: orderFulfillmentStatus,
        gateways,
      };
      // Remove any undefined filters
      Object.keys(queryFilters).forEach((key) => {
        if (queryFilters[key] === undefined) delete queryFilters[key];
      });
      const payload = {
        query: QueryOrderTransactions,
        variables: {
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
          searchQuery: buildOrderTransactionsSearchQuery(queryFilters),
          includeParentTransaction:
            effectivePropertyKeys.includes('parentTransaction') ||
            effectivePropertyKeys.includes('parentTransactionId'),
          includePaymentDetails: effectivePropertyKeys.includes('paymentDetails'),
          includeReceiptJson: effectivePropertyKeys.includes('receiptJson'),
        } as GetOrderTransactionsQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.orders?.pageInfo,
        },
        context
      );
      if (response && response.body.data?.orders) {
        const data = response.body.data as GetOrderTransactionsQuery;
        return {
          result: data.orders.nodes
            .map((order) =>
              order.transactions
                .filter((transaction) => {
                  if (gateways && gateways.length) return gateways.includes(transaction.gateway);
                  return true;
                })
                .map((transaction) => formatOrderTransactionForSchemaFromGraphQlApi(transaction, order))
            )
            .flat(),
          continuation,
        };
      } else {
        return {
          result: [],
          continuation,
        };
      }
    },
  },
});
// #endregion
