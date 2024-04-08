import * as coda from '@codahq/packs-sdk';
import toSentenceCase from 'to-sentence-case';

import { ClientGraphQl } from '../../Fetchers/ClientGraphQl';
import { graphQlGidToId } from '../../helpers-graphql';
import { OrderTransactionRow } from '../../schemas/CodaRows.types';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatOrderTransactionReference } from '../../schemas/syncTable/OrderTransactionSchema';
import { ResultOf } from '../../utils/graphql';
import { OrderTransaction, orderTransactionResource } from './orderTransactionResource';
import { orderTransactionFieldsFragment } from './orderTransactions-graphql';

export class OrderTransactionGraphQlFetcher extends ClientGraphQl<OrderTransaction> {
  constructor(context: coda.ExecutionContext) {
    super(orderTransactionResource, context);
  }

  formatApiToRow(
    orderTransaction: ResultOf<typeof orderTransactionFieldsFragment>,
    parentOrder?: { id: string; name: string }
  ): OrderTransactionRow {
    if (parentOrder === undefined) {
      throw new Error('parentOrder is undefined');
    }

    const parentOrderId = graphQlGidToId(parentOrder.id);
    let obj: OrderTransactionRow = {
      // ...orderTransaction,
      id: graphQlGidToId(orderTransaction.id),
      label: `Order ${parentOrder.name} - ${toSentenceCase(orderTransaction.kind)}`,
      orderId: parentOrderId,
      order: formatOrderReference(parentOrderId, parentOrder.name),

      accountNumber: orderTransaction.accountNumber,
      authorizationCode: orderTransaction.authorizationCode,
      authorizationExpiresAt: orderTransaction.authorizationExpiresAt,
      createdAt: orderTransaction.createdAt,
      currency: orderTransaction.amountSet?.presentmentMoney?.currencyCode,
      errorCode: orderTransaction.errorCode,
      gateway: orderTransaction.gateway,
      kind: orderTransaction.kind,
      paymentDetails: orderTransaction.paymentDetails,
      paymentIcon: orderTransaction.paymentIcon?.url,
      paymentId: orderTransaction.paymentId,
      processedAt: orderTransaction.processedAt,
      receiptJson: orderTransaction.receiptJson,
      settlementCurrency: orderTransaction.settlementCurrency,
      settlementCurrencyRate: orderTransaction.settlementCurrencyRate,
      status: orderTransaction.status,
      test: orderTransaction.test,
    };

    if (orderTransaction.parentTransaction?.id) {
      const parentTransactionId = graphQlGidToId(orderTransaction.parentTransaction.id);
      obj.parentTransactionId = parentTransactionId;
      obj.parentTransaction = formatOrderTransactionReference(parentTransactionId);
    }
    if (orderTransaction.amountSet?.shopMoney?.amount) {
      obj.amount = parseFloat(orderTransaction.amountSet.shopMoney.amount);
    }
    if (orderTransaction.totalUnsettledSet?.shopMoney?.amount) {
      obj.totalUnsettled = parseFloat(orderTransaction.totalUnsettledSet.shopMoney.amount);
    }
    /**
     * Unused. see comment in {@link OrderTransactionSyncTableSchema}
     */
    /*
    if (orderTransaction.user?.id) {
      obj.userId = graphQlGidToId(orderTransaction.user.id);
    }
    */

    return obj;
  }
}
