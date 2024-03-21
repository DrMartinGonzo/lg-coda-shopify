// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { Identity } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { OrderTransactionSyncTableSchema } from '../../schemas/syncTable/OrderTransactionSchema';
import { filters } from '../../shared-parameters';
import { ShopRestFetcher } from '../shop/ShopRestFetcher';
import { formatOrderTransactionForSchemaFromGraphQlApi } from './orderTransactions-functions';
import {
  OrderTransactionFieldsFragment,
  QueryOrderTransactions,
  buildOrderTransactionsSearchQuery,
} from './orderTransactions-graphql';
import { deepCopy } from '../../utils/helpers';

// #endregion

async function getOrderTransactionSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  let augmentedSchema = deepCopy(OrderTransactionSyncTableSchema);

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
      [
        orderCreatedAt,
        orderUpdatedAt,
        orderProcessedAt,
        orderFinancialStatus,
        orderFulfillmentStatus,
        orderStatus,
        gateways,
      ],
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
        status: orderStatus,
      };
      // Remove any undefined filters
      Object.keys(queryFilters).forEach((key) => {
        if (queryFilters[key] === undefined) delete queryFilters[key];
      });
      const payload = {
        query: printGql(QueryOrderTransactions),
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
        } as VariablesOf<typeof QueryOrderTransactions>,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof QueryOrderTransactions>>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.orders?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.orders) {
        const data = response.body.data;
        return {
          result: data.orders.nodes
            .map((order) => {
              const transactions = readFragment(OrderTransactionFieldsFragment, order.transactions);
              return transactions
                .filter((transaction) => {
                  if (gateways && gateways.length) return gateways.includes(transaction.gateway);
                  return true;
                })
                .map((transaction) => formatOrderTransactionForSchemaFromGraphQlApi(transaction, order));
            })
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
