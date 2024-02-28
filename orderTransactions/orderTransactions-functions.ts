import * as coda from '@codahq/packs-sdk';
import toSentenceCase from 'to-sentence-case';

import { graphQlGidToId } from '../helpers-graphql';
import { OrderTransactionFieldsFragment } from '../types/admin.generated';
import { formatOrderReferenceValueForSchema } from '../schemas/syncTable/OrderSchema';
import {
  OrderTransactionSyncTableSchema,
  formatOrderTransactionReferenceValueForSchema,
} from '../schemas/syncTable/OrderTransactionSchema';

// #region Formatting functions
export const formatOrderTransactionForSchemaFromGraphQlApi = (
  orderTransaction: OrderTransactionFieldsFragment,
  parentOrder: { id: string; name: string }
) => {
  const parentOrderId = graphQlGidToId(parentOrder.id);
  let obj: any = {
    ...orderTransaction,
    id: graphQlGidToId(orderTransaction.id),
    label: `Order ${parentOrder.name} - ${toSentenceCase(orderTransaction.kind)}`,
    orderId: parentOrderId,
    order: formatOrderReferenceValueForSchema(parentOrderId, parentOrder.name),
  };

  if (orderTransaction.parentTransaction?.id) {
    const parentTransactionId = graphQlGidToId(orderTransaction.parentTransaction.id);
    obj.parentTransactionId = parentTransactionId;
    obj.parentTransaction = formatOrderTransactionReferenceValueForSchema(parentTransactionId);
  }
  /**
   * Unused. see comment in {@link OrderTransactionSyncTableSchema}
   */
  /*
  if (orderTransaction.user?.id) {
    obj.userId = graphQlGidToId(orderTransaction.user.id);
  }
  */
  if (orderTransaction.paymentIcon?.url) {
    obj.paymentIcon = orderTransaction.paymentIcon.url;
  }
  if (orderTransaction.amountSet?.shopMoney?.amount) {
    obj.amount = parseFloat(orderTransaction.amountSet.shopMoney.amount);
  }
  if (orderTransaction.amountSet?.presentmentMoney?.currencyCode) {
    obj.currency = orderTransaction.amountSet.presentmentMoney.currencyCode;
  }
  if (orderTransaction.totalUnsettledSet?.shopMoney?.amount) {
    obj.totalUnsettled = parseFloat(orderTransaction.totalUnsettledSet.shopMoney.amount);
  }

  return obj;
};
// #endregion
