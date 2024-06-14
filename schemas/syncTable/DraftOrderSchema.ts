import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { DiscountApplicationSchema } from '../basic/DiscountApplicationSchema';
import { orderLineItemTaxLinesProp } from '../basic/OrderLineItemSchema';
import { ShippingLineSchema } from '../basic/ShippingLineSchema';
import { customerTaxExemptProp, customerTaxExemptionsProp } from './CustomerSchema';
import {
  OrderReference,
  orderBillingAddressProp,
  orderCurrencyProp,
  orderCurrentPriceDescription,
  orderCustomerProp,
  orderEmailProp,
  orderLineItemsProp,
  orderNoteAttributesProp,
  orderNoteProp,
  orderPaymentTermsProp,
  orderShippingAddressProp,
  orderTagsProp,
  orderTaxesIncludedProp,
} from './OrderSchema';

export const DraftOrderSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('draft order'),
    applied_discount: {
      ...DiscountApplicationSchema,
      fixedId: 'applied_discount',
      fromKey: 'applied_discount',
      description:
        'The discount applied to the line item or the draft order resource. Each draft order resource can have one applied_discount resource and each draft order line item can have its own applied_discount.',
    },
    billing_address: orderBillingAddressProp,
    completed_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'completed_at',
      fromKey: 'completed_at',
      description: 'The date and time when the order is created and the draft order is completed.',
    },
    created_at: PROPS.makeCreatedAtProp('draft order'),
    currency: orderCurrencyProp,
    customer: orderCustomerProp,
    email: { ...orderEmailProp, mutable: true },
    graphql_gid: PROPS.makeGraphQlGidProp('draft order'),
    id: PROPS.makeRequiredIdNumberProp('draft order'),
    invoice_sent_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'invoice_sent_at',
      fromKey: 'invoice_sent_at',
      description: 'The date and time when the invoice was emailed to the customer.',
    },
    invoice_url: {
      ...PROPS.LINK,
      fixedId: 'invoice_url',
      fromKey: 'invoice_url',
      description: 'The URL for the invoice.',
    },
    line_items: orderLineItemsProp,
    name: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'name',
      fromKey: 'name',
      description: 'Name of the draft order.',
    },
    note: {
      ...orderNoteProp,
      mutable: true,
    },
    note_attributes: orderNoteAttributesProp,
    order_id: {
      ...PROPS.ID_NUMBER,
      fromKey: 'order_id',
      fixedId: 'order_id',
      description:
        "The ID of the order that's created and associated with the draft order after the draft order is completed",
    },
    order: {
      ...OrderReference,
      fromKey: 'order',
      fixedId: 'order',
      description:
        "A relation to the order that's created and associated with the draft order after the draft order is completed.",
    },
    payment_terms: orderPaymentTermsProp,
    shipping_address: orderShippingAddressProp,
    shipping_line: {
      ...ShippingLineSchema,
      fixedId: 'shipping_line',
      fromKey: 'shipping_line',
      description: 'The shipping method used.',
    },
    status: {
      type: coda.ValueType.String,
      fixedId: 'status',
      fromKey: 'status',
      description: 'Status of the draft order.',
    },
    subtotal_price: {
      ...PROPS.CURRENCY,
      fixedId: 'subtotal_price',
      fromKey: 'subtotal_price',
      description: orderCurrentPriceDescription('subtotal price'),
    },
    tags: { ...orderTagsProp, mutable: true },
    tax_exempt: {
      ...customerTaxExemptProp,
      description:
        "Whether taxes are exempt for the draft order. If set to false, then Shopify refers to the taxable field for each line_item. If a customer is applied to the draft order, then Shopify uses the customer's tax_exempt field instead.",
    },
    tax_exemptions: customerTaxExemptionsProp,
    tax_lines: orderLineItemTaxLinesProp,
    taxes_included: orderTaxesIncludedProp,
    total_price: {
      ...PROPS.CURRENCY,
      fixedId: 'total_price',
      fromKey: 'total_price',
      description: orderCurrentPriceDescription('total price'),
    },
    total_tax: {
      ...PROPS.CURRENCY,
      fixedId: 'total_tax',
      fromKey: 'total_tax',
      description: orderCurrentPriceDescription('total taxes'),
    },
    updated_at: PROPS.makeUpdatedAtProp('draft order'),
  },

  displayProperty: 'name',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: [
    'name',
    'id',
    'status',
    'customer',
    'line_items',
    'total_price',
    'billing_address',
    'shipping_address',
    'created_at',
  ],

  // Card fields.
  subtitleProperties: ['status', 'customer', 'total_price', 'created_at'],
  snippetProperty: 'note',
  linkProperty: 'admin_url',
});
export const DraftOrderReference = coda.makeReferenceSchemaFromObjectSchema(
  DraftOrderSyncTableSchema,
  PACK_IDENTITIES.DraftOrder
);
export const formatDraftOrderReference: FormatRowReferenceFn<number, 'name'> = (id: number, name = NOT_FOUND) => ({
  id,
  name,
});
