import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { OrderAdjustmentSchema } from './OrderAdjustmentSchema';
import { orderLineItemDutiesProp } from './OrderLineItemSchema';
import { OrderTransactionSchema } from './OrderTransactionSchema';
import { RefundDutySchema } from './RefundDutySchema';
import { RefundLineItemSchema } from './RefundLineItemSchema';

export const RefundSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('refund'),
    created_at: PROPS.makeCreatedAtProp('refund'),
    duties: {
      ...orderLineItemDutiesProp,
      description: 'A list of duties that have been reimbursed as part of the refund.',
    },
    note: {
      type: coda.ValueType.String,
      fixedId: 'note',
      fromKey: 'note',
      description: 'An optional note attached to a refund.',
    },
    order_adjustments: {
      type: coda.ValueType.Array,
      items: OrderAdjustmentSchema,
      fixedId: 'order_adjustments',
      fromKey: 'order_adjustments',
      description:
        'A list of order adjustments attached to the refund. Order adjustments are generated to account for refunded shipping costs and differences between calculated and actual refund amounts.',
    },
    processed_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'processed_at',
      fromKey: 'processed_at',
      description: 'The date and time when the refund was imported.',
    },
    refund_duties: {
      type: coda.ValueType.Array,
      items: RefundDutySchema,
      fixedId: 'refund_duties',
      fromKey: 'refund_duties',
      description: 'A list of refunded duties.',
    },
    refund_line_items: {
      type: coda.ValueType.Array,
      items: RefundLineItemSchema,
      fixedId: 'refund_line_items',
      fromKey: 'refund_line_items',
      description: 'A list of refunded line items.',
    },
    transactions: {
      type: coda.ValueType.Array,
      items: OrderTransactionSchema,
      fixedId: 'transactions',
      fromKey: 'transactions',
      description:
        'A list of transactions involved in the refund. A single order can have multiple transactions associated with it.',
    },
    user_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'user_id',
      fromKey: 'user_id',
      description: 'The unique identifier of the user who performed the refund.',
    },
  },
  displayProperty: 'id',
});
