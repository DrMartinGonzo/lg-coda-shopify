// #region Imports

import { safeToFloat } from '../../utils/helpers';
import { OrderLineItemApiData } from '../rest/OrderLineItemModel';
import { RefundApiData, RefundLineItemApiData, TransactionApiData } from '../rest/OrderModel';

// #endregion

export function formatOrderLineItemPropertyForDraftOrder({
  price_set,
  total_discount_set,
  ...line
}: OrderLineItemApiData) {
  return {
    ...line,
    price: safeToFloat(line.price),
  };
}
export function formatOrderLineItemPropertyForOrder({ price_set, total_discount_set, ...line }: OrderLineItemApiData) {
  return {
    ...line,
    price: safeToFloat(line.price),
    total_discount: safeToFloat(line.total_discount),
  };
}

export function formatRefundProperty(refund: RefundApiData) {
  return {
    id: refund.id,
    created_at: refund.created_at,
    duties: refund.duties,
    note: refund.note,
    order_adjustments: refund.order_adjustments,
    processed_at: refund.processed_at,
    refund_duties: refund.refund_duties,
    refund_line_items: refund.refund_line_items.map(formatRefundLineItemProperty),
    user_id: refund.user_id,
    transactions: refund.transactions.map(formatTransactionProperty),
  };
}

function formatRefundLineItemProperty(line: RefundLineItemApiData) {
  return {
    id: line.id,
    line_item_id: line.line_item_id,
    quantity: line.quantity,
    restock_type: line.restock_type,
    location_id: line.location_id,
    subtotal: safeToFloat(line.subtotal_set?.shop_money?.amount),
    total_tax: safeToFloat(line.total_tax_set?.shop_money?.amount),
  };
}

function formatTransactionProperty(transaction: TransactionApiData) {
  return {
    id: transaction.id,
    amount: safeToFloat(transaction.amount),
    created_at: transaction.created_at,
    currency: transaction.currency,
    error_code: transaction.error_code,
    gateway: transaction.gateway,
    kind: transaction.kind,
    parent_id: transaction.parent_id,
    payment_id: transaction.payment_id,
    processed_at: transaction.processed_at,
    status: transaction.status,
    test: transaction.test,
    total_unsettled: safeToFloat(transaction.total_unsettled_set?.shop_money?.amount),
  };
}
