import * as coda from '@codahq/packs-sdk';

import { OrderReference } from '../orders/orders-schema';
import { IDENTITY_ORDER_TRANSACTION, PACK_ID } from '../constants';

export const paymentDetailsSchema = coda.makeObjectSchema({
  properties: {
    avsResultCode: {
      type: coda.ValueType.String,
      description: 'The response code from the address verification system (AVS). The code is always a single letter.',
    },
    bin: {
      type: coda.ValueType.String,
      description:
        "The issuer identification number (IIN), formerly known as bank identification number (BIN) of the customer's credit card. This is made up of the first few digits of the credit card number.",
    },
    company: {
      type: coda.ValueType.String,
      description: "The name of the company that issued the customer's credit card.",
    },
    cvvResultCode: {
      type: coda.ValueType.String,
      description:
        'The response code from the credit card company indicating whether the customer entered the card security code, or card verification value, correctly. The code is a single letter or empty string.',
    },
    expirationMonth: {
      type: coda.ValueType.Number,
      description: 'The month in which the used credit card expires.',
    },
    expirationYear: { type: coda.ValueType.Number, description: 'The year in which the used credit card expires.' },
    name: {
      type: coda.ValueType.String,
      description: 'The holder of the credit card.',
    },
    number: {
      type: coda.ValueType.String,
      description: "The customer's credit card number, with most of the leading digits redacted.",
    },
    wallet: { type: coda.ValueType.String, description: 'Digital wallet used for the payment.' },
  },
  displayProperty: 'number',
});
/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const OrderTransactionSchema = coda.makeObjectSchema({
  properties: {
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The ID of the order transaction.',
    },
    label: {
      type: coda.ValueType.String,
      fromKey: 'label',
      fixedId: 'label',
      required: true,
    },
    accountNumber: {
      type: coda.ValueType.String,
      fromKey: 'accountNumber',
      fixedId: 'accountNumber',
      description: 'The masked account number associated with the payment method.',
    },
    amount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fromKey: 'amount',
      fixedId: 'amount',
      description: 'The amount of the transaction in shop currency.',
    },
    totalUnsettled: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fromKey: 'totalUnsettled',
      fixedId: 'totalUnsettled',
      description:
        'Specifies the available amount to capture on the gateway in shop currency. Only available when an amount is capturable or manually mark as paid.',
    },
    authorizationCode: {
      type: coda.ValueType.String,
      fromKey: 'authorizationCode',
      fixedId: 'authorizationCode',
      description: 'Authorization code associated with the transaction.',
    },
    authorizationExpiresAt: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fromKey: 'authorizationExpiresAt',
      fixedId: 'authorizationExpiresAt',
      description:
        'The time when the authorization expires. This field is available only to stores on a Shopify Plus plan and is populated only for Shopify Payments authorizations.',
    },
    createdAt: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fromKey: 'createdAt',
      fixedId: 'createdAt',
      description: 'Date and time when the transaction was created.',
    },
    processedAt: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fromKey: 'processedAt',
      fixedId: 'processedAt',
      description: 'Date and time when the transaction was processed.',
    },
    kind: {
      type: coda.ValueType.String,
      fromKey: 'kind',
      fixedId: 'kind',
      description: 'The kind of transaction.',
    },
    status: {
      type: coda.ValueType.String,
      fromKey: 'status',
      fixedId: 'status',
      description: 'The status of this transaction.',
    },
    gateway: {
      type: coda.ValueType.String,
      fromKey: 'gateway',
      fixedId: 'gateway',
      description: 'The payment gateway used to process the transaction.',
    },
    parentTransaction: {
      ...coda.makeObjectSchema({
        codaType: coda.ValueHintType.Reference,
        properties: {
          id: { type: coda.ValueType.Number, required: true },
          label: { type: coda.ValueType.String, required: true },
        },
        displayProperty: 'label',
        idProperty: 'id',
        identity: { name: IDENTITY_ORDER_TRANSACTION },
      }),
      fromKey: 'parentTransaction',
      fixedId: 'parentTransaction',
      description: 'The associated parent transaction, for example the authorization of a capture.',
    },
    parentTransactionId: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fromKey: 'parentTransactionId',
      fixedId: 'parentTransactionId',
      description: 'The associated parent transaction Id.',
    },
    receiptJson: {
      type: coda.ValueType.String,
      fromKey: 'receiptJson',
      fixedId: 'receiptJson',
      description:
        'The transaction receipt that the payment gateway attaches to the transaction. The value of this field depends on which payment gateway processed the transaction.',
    },
    settlementCurrency: {
      type: coda.ValueType.String,
      fromKey: 'settlementCurrency',
      fixedId: 'settlementCurrency',
      description: 'The settlement currency.',
    },
    settlementCurrencyRate: {
      type: coda.ValueType.Number,
      fromKey: 'settlementCurrencyRate',
      fixedId: 'settlementCurrencyRate',
      description: 'TThe rate used when converting the transaction amount to settlement currency.',
    },
    errorCode: {
      type: coda.ValueType.String,
      fromKey: 'errorCode',
      fixedId: 'errorCode',
      description: 'A standardized error code, independent of the payment provider.',
    },
    test: {
      type: coda.ValueType.Boolean,
      fromKey: 'test',
      fixedId: 'test',
      description: 'Whether the transaction is a test transaction.',
    },
    order_id: {
      type: coda.ValueType.Number,
      fromKey: 'order_id',
      fixedId: 'order_id',
      useThousandsSeparator: false,
      description: 'The associated order ID.',
    },
    order: {
      ...OrderReference,
      fromKey: 'order',
      fixedId: 'order',
      description: 'A relation to the associated order.',
    },
    paymentDetails: {
      ...paymentDetailsSchema,
      fromKey: 'paymentDetails',
      fixedId: 'paymentDetails',
      description: 'Payment details related to a transaction.',
    },
    paymentId: {
      type: coda.ValueType.String,
      fromKey: 'paymentId',
      fixedId: 'paymentId',
      description: 'The payment ID associated with the transaction.',
    },
    paymentIcon: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fromKey: 'paymentIcon',
      fixedId: 'paymentIcon',
      description: 'The payment icon to display for the transaction.',
    },
  },

  displayProperty: 'label',
  idProperty: 'id',
  featuredProperties: ['id', 'amount'],
});
