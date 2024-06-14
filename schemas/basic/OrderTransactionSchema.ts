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
    label: {
      type: coda.ValueType.String,
      fromKey: 'label',
      fixedId: 'label',
      required: true,
    },
    amount: {
      ...PROPS.CURRENCY,
      fromKey: 'amount',
      fixedId: 'amount',
      description: 'The amount of the transaction in shop currency.',
    },
    currency: {
      type: coda.ValueType.String,
      fixedId: 'currency',
      description: 'The three-letter code (ISO 4217 format) for the currency used for the payment.',
    },
    createdAt: {
      ...PROPS.DATETIME_STRING,
      fromKey: 'createdAt',
      fixedId: 'createdAt',
      description: 'Date and time when the transaction was created.',
    },
    errorCode: {
      type: coda.ValueType.String,
      fromKey: 'errorCode',
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
      fromKey: 'parentTransactionId',
      fixedId: 'parentTransactionId',
      description: 'The associated parent transaction ID.',
    },
    paymentId: {
      type: coda.ValueType.String,
      fromKey: 'paymentId',
      fixedId: 'paymentId',
      description: 'The payment ID associated with the transaction.',
    },
    processedAt: {
      ...PROPS.DATETIME_STRING,
      fromKey: 'processedAt',
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
      fromKey: 'totalUnsettled',
      fixedId: 'totalUnsettled',
      description:
        'Specifies the available amount to capture on the gateway in shop currency. Only available when an amount is capturable or manually mark as paid.',
    },
  },

  displayProperty: 'label',
  idProperty: 'id',
  featuredProperties: ['id', 'amount'],
});
