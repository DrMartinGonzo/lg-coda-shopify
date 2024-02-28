import * as coda from '@codahq/packs-sdk';

import { OrderReference } from './OrderSchema';
import { IDENTITY_ORDER_TRANSACTION, NOT_FOUND } from '../../constants';
import { OrderTransactionSchema } from '../basic/OrderTransactionSchema';
import { PaymentDetailsSchema } from '../basic/PaymentDetailsSchema';

export const OrderTransactionSyncTableSchema = coda.makeObjectSchema({
  properties: {
    ...OrderTransactionSchema.properties,

    accountNumber: {
      type: coda.ValueType.String,
      fromKey: 'accountNumber',
      fixedId: 'accountNumber',
      description: 'The masked account number associated with the payment method.',
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
    order: {
      ...OrderReference,
      fromKey: 'order',
      fixedId: 'order',
      description: 'A relation to the associated order.',
    },
    orderId: {
      type: coda.ValueType.Number,
      fromKey: 'orderId',
      fixedId: 'orderId',
      useThousandsSeparator: false,
      description: 'The associated order ID.',
    },
    parentTransaction: coda.makeReferenceSchemaFromObjectSchema(OrderTransactionSchema, IDENTITY_ORDER_TRANSACTION),
    paymentDetails: {
      ...PaymentDetailsSchema,
      fromKey: 'paymentDetails',
      fixedId: 'paymentDetails',
      description: 'Payment details related to a transaction.',
    },
    paymentIcon: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fromKey: 'paymentIcon',
      fixedId: 'paymentIcon',
      description: 'The payment icon to display for the transaction.',
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
      description: 'The rate used when converting the transaction amount to settlement currency.',
    },
    /*
    shopifyPaymentsSet: {
      type: coda.ValueType.String,
      fromKey: 'shopifyPaymentsSet',
      fixedId: 'shopifyPaymentsSet',
      description:
        'Contains all Shopify Payments information related to an order transaction. This field is available only to stores on a Shopify Plus plan.',
    },
    */
    /**
     * userId is disabled because it requires access: `read_users` access scope.
     * Also: The app must be a finance embedded app or installed on a Shopify
     * Plus or Advanced store. Contact Shopify Support to enable this scope for your app
     */
    /*
    userId: {
      type: coda.ValueType.Number,
      fromKey: 'userId',
      fixedId: 'userId',
      useThousandsSeparator: false,
      description:
        'The ID for the user who was logged into the Shopify POS device when the order was processed, if applicable.',
    },
    */
  },

  displayProperty: 'label',
  idProperty: 'id',
  featuredProperties: ['id', 'amount'],
});

export const formatOrderTransactionReferenceValueForSchema = (id: number, label = NOT_FOUND) => ({ id, label });
