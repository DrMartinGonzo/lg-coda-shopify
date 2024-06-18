import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

// missing props from Rest TransactionSchema :
// - device_id
// - location_id
// - message
// - source_name

export const OrderTransactionSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('order transaction'),
    amount: {
      ...PROPS.CURRENCY,
      fromKey: 'amount',
      fixedId: 'amount',
      description: 'The amount of the transaction in shop currency.',
    },
    createdAt: {
      ...PROPS.DATETIME_STRING,
      fromKey: 'created_at',
      fixedId: 'createdAt',
      description: 'Date and time when the transaction was created.',
    },
    currency: {
      type: coda.ValueType.String,
      fixedId: 'currency',
      description: 'The three-letter code (ISO 4217 format) for the currency used for the payment.',
    },
    errorCode: {
      type: coda.ValueType.String,
      fromKey: 'error_code',
      fixedId: 'errorCode',
      description: 'A standardized error code, independent of the payment provider.',
    },
    gateway: {
      type: coda.ValueType.String,
      fromKey: 'gateway',
      fixedId: 'gateway',
      description: 'The payment gateway used to process the transaction.',
    },
    kind: {
      type: coda.ValueType.String,
      fromKey: 'kind',
      fixedId: 'kind',
      description: 'The kind of transaction.',
    },
    parentTransactionId: {
      ...PROPS.ID_NUMBER,
      fromKey: 'parent_id',
      fixedId: 'parentTransactionId',
      description: 'The associated parent transaction ID.',
    },
    paymentId: {
      type: coda.ValueType.String,
      fromKey: 'payment_id',
      fixedId: 'paymentId',
      description: 'The payment ID associated with the transaction.',
    },
    processedAt: {
      ...PROPS.DATETIME_STRING,
      fromKey: 'processed_at',
      fixedId: 'processedAt',
      description: 'Date and time when the transaction was processed.',
    },
    status: {
      type: coda.ValueType.String,
      fromKey: 'status',
      fixedId: 'status',
      description: 'The status of this transaction.',
    },
    test: {
      type: coda.ValueType.Boolean,
      fromKey: 'test',
      fixedId: 'test',
      description: 'Whether the transaction is a test transaction.',
    },
    totalUnsettled: {
      ...PROPS.CURRENCY,
      fromKey: 'total_unsettled',
      fixedId: 'totalUnsettled',
      description:
        'Specifies the available amount to capture on the gateway in shop currency. Only available when an amount is capturable or manually mark as paid.',
    },
  },

  displayProperty: 'id',
  idProperty: 'id',
  featuredProperties: ['id', 'amount'],
});
