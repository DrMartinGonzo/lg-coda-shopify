import * as coda from '@codahq/packs-sdk';
import toSentenceCase from 'to-sentence-case';

import { NOT_FOUND } from '../constants';
import { graphQlGidToId } from '../helpers-graphql';
import { OrderTransactionFieldsFragment } from '../types/admin.generated';

// #region Helpers
// TODO
export function validateOrderTransactionParams(params) {
  return true;
}
// #endregion

// #region Formatting functions
export const formatOrderTransactionForSchemaFromGraphQlApi = (
  orderTransaction: OrderTransactionFieldsFragment,
  parentOrder: { id: string; name: string }
) => {
  let obj: any = {
    ...orderTransaction,
    id: graphQlGidToId(orderTransaction.id),
    label: `Order ${parentOrder.name} - ${toSentenceCase(orderTransaction.kind)}`,
    order_id: graphQlGidToId(parentOrder.id),
    order: {
      id: graphQlGidToId(parentOrder.id),
      name: parentOrder.name,
    },
  };

  if (orderTransaction.parentTransaction?.id) {
    obj.parentTransactionId = graphQlGidToId(orderTransaction.parentTransaction.id);
    obj.parentTransaction = {
      id: graphQlGidToId(orderTransaction.parentTransaction.id),
      label: NOT_FOUND,
    };
  }
  if (orderTransaction.paymentIcon?.url) {
    obj.paymentIcon = orderTransaction.paymentIcon.url;
  }
  if (orderTransaction.amountSet?.shopMoney?.amount) {
    obj.amount = parseFloat(orderTransaction.amountSet.shopMoney.amount);
  }
  if (orderTransaction.totalUnsettledSet?.shopMoney?.amount) {
    obj.totalUnsettled = parseFloat(orderTransaction.totalUnsettledSet.shopMoney.amount);
  }

  return obj;
};
// #endregion
