// #region Imports
import * as coda from '@codahq/packs-sdk';

import { formatOrderTransactionForSchemaFromGraphQlApi } from './orderTransactions-functions';
import { OrderTransactionSyncTableSchema } from '../schemas/syncTable/OrderTransactionSchema';
import { filters } from '../shared-parameters';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';

import { QueryOrderTransactions, buildOrderTransactionsSearchQuery } from './orderTransactions-graphql';
import { ShopRestFetcher } from '../shop/shop-functions';
import { Identity } from '../constants';

import type { SyncTableGraphQlContinuation } from '../types/SyncTable';
import type {
  GetOrderTransactionsQuery,
  GetOrderTransactionsQueryVariables,
} from '../typesNew/generated/admin.generated';

// #endregion

async function getOrderTransactionSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  let augmentedSchema = OrderTransactionSyncTableSchema;

  const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();
  // Main props
  augmentedSchema.properties.amount['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.totalUnsettled['currencyCode'] = shopCurrencyCode;

  return augmentedSchema;
}

// #region Sync tables
export const Sync_OrderTransactions = coda.makeSyncTable({
  name: 'OrderTransactions',
  description: 'Return Order Transactions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.OrderTransaction,
  schema: OrderTransactionSyncTableSchema,
  dynamicOptions: {
    getSchema: getOrderTransactionSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderTransactions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.general.createdAtRange, name: 'orderCreatedAt', optional: true },
      { ...filters.general.updatedAtRange, name: 'orderUpdatedAt', optional: true },
      { ...filters.general.processedAtRange, name: 'orderProcessedAt', optional: true },
      { ...filters.order.financialStatus, name: 'orderFinancialStatus', optional: true },
      { ...filters.order.fulfillmentStatus, name: 'orderFulfillmentStatus', optional: true },
      { ...filters.order.status, name: 'orderStatus', suggestedValue: 'closed', optional: true },
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
          includeAmount: effectivePropertyKeys.includes('amount'),
          includeIcon: effectivePropertyKeys.includes('paymentIcon'),
          includeTotalUnsettled: effectivePropertyKeys.includes('totalUnsettled'),
          includeTransactionCurrency: effectivePropertyKeys.includes('currency'),
        } as GetOrderTransactionsQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<GetOrderTransactionsQuery>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.orders?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.orders) {
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
