import * as coda from '@codahq/packs-sdk';

import { GraphQlFetchResponse, SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { OrderTransactionRow } from '../../schemas/CodaRows.types';
import { VariablesOf, readFragmentArray } from '../../utils/graphql';
import { OrderTransactionGraphQlFetcher } from './OrderTransactionGraphQlFetcher';
import { OrderTransaction, orderTransactionResource } from './orderTransactionResource';
import { Sync_OrderTransactions } from './orderTransactions-coda';
import {
  buildOrderTransactionsSearchQuery,
  getOrderTransactionsQuery,
  orderTransactionFieldsFragment,
} from './orderTransactions-graphql';

export class OrderTransactionSyncTable extends SyncTableGraphQl<OrderTransaction> {
  constructor(fetcher: OrderTransactionGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(orderTransactionResource, fetcher, params);
    // TODO: get an approximation for first run by using count of relation columns ?
    this.initalMaxEntriesPerRun = 50;
  }

  setPayload(): void {
    const [
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderStatus,
      gateways,
    ] = this.codaParams as SyncTableParamValues<typeof Sync_OrderTransactions>;

    // Set query filters and remove any undefined filters
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
    Object.keys(queryFilters).forEach((key) => {
      if (queryFilters[key] === undefined) delete queryFilters[key];
    });

    this.documentNode = getOrderTransactionsQuery;
    this.variables = {
      maxEntriesPerRun: this.maxEntriesPerRun,
      cursor: this.prevContinuation?.cursor ?? null,
      searchQuery: buildOrderTransactionsSearchQuery(queryFilters),
      includeParentTransaction:
        this.effectivePropertyKeys.includes('parentTransaction') ||
        this.effectivePropertyKeys.includes('parentTransactionId'),
      includePaymentDetails: this.effectivePropertyKeys.includes('paymentDetails'),
      includeReceiptJson: this.effectivePropertyKeys.includes('receiptJson'),
      includeAmount: this.effectivePropertyKeys.includes('amount'),
      includeIcon: this.effectivePropertyKeys.includes('paymentIcon'),
      includeTotalUnsettled: this.effectivePropertyKeys.includes('totalUnsettled'),
      includeTransactionCurrency: this.effectivePropertyKeys.includes('currency'),
    } as VariablesOf<typeof getOrderTransactionsQuery>;
  }

  handleSyncTableResponse = (
    response: GraphQlFetchResponse<typeof getOrderTransactionsQuery>
  ): Array<OrderTransactionRow> => {
    const [, , , , , , gateways] = this.codaParams as SyncTableParamValues<typeof Sync_OrderTransactions>;

    if (response?.body?.data.orders) {
      const orderItems = response.body.data.orders.nodes;
      if (orderItems && orderItems.length) {
        return orderItems
          .map((order) => {
            const transactions = readFragmentArray(orderTransactionFieldsFragment, order.transactions);
            return transactions
              .filter((transaction) => {
                if (gateways && gateways.length) return gateways.includes(transaction.gateway);
                return true;
              })
              .map((transaction) =>
                (this.fetcher as OrderTransactionGraphQlFetcher).formatApiToRow(transaction, order)
              );
          })
          .flat();
      }
    }

    return [] as Array<OrderTransactionRow>;
  };
}
