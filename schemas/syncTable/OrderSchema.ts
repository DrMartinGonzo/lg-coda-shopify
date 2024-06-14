import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { NOT_FOUND } from '../../constants/strings-constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { AddressSchema } from '../basic/AddressSchema';
import { CompanySchema } from '../basic/CompanySchema';
import { DiscountApplicationSchema } from '../basic/DiscountApplicationSchema';
import { DiscountCodeSchema } from '../basic/DiscountCodeSchema';
import { FulfillmentSchema } from '../basic/FulfillmentSchema';
import { NameValueSchema } from '../basic/NameValueSchema';
import { OrderLineItemSchema, orderLineItemTaxLinesProp } from '../basic/OrderLineItemSchema';
import { PaymentTermsSchema } from '../basic/PaymentTermsSchema';
import { RefundSchema } from '../basic/RefundSchema';
import { ShippingLineSchema } from '../basic/ShippingLineSchema';
import { CustomerReference } from './CustomerSchema';

// #region helpers
export function orderCurrentPriceDescription(name: string) {
  return `The current ${name} of the order in the shop currency. The value of this field reflects order edits, returns, and refunds.`;
}
function orderPriceDescription(name: string, extra = '') {
  return `The ${name} of the order${extra} in shop currency.`;
}

export const orderBillingAddressProp = {
  ...AddressSchema,
  fixedId: 'billing_address',
  fromKey: 'billing_address',
  description:
    "The mailing address associated with the payment method. This address is an optional field that won't be available on orders that do not require a payment method.",
};
export const orderShippingAddressProp = {
  ...AddressSchema,
  fixedId: 'shipping_address',
  fromKey: 'shipping_address',
  description:
    'The mailing address to where the order will be shipped. This address is optional and will not be available on orders that do not require shipping.',
};
export const orderCurrencyProp = {
  ...PROPS.STRING,
  fixedId: 'currency',
  fromKey: 'currency',
  description: 'The three-letter code (ISO 4217 format) for the shop currency.',
};
export const orderCustomerProp = {
  ...CustomerReference,
  fixedId: 'customer',
  fromKey: 'customer',
  description:
    'A relation to the customer. The order might not have a customer and apps should not depend on the existence of a customer object. This value might be null if the order was created through Shopify POS.',
};
export const orderEmailProp = {
  ...PROPS.EMAIL,
  fixedId: 'email',
  fromKey: 'email',
  description: "The customer's email address.",
};
export const orderLineItemsProp = {
  type: coda.ValueType.Array,
  items: OrderLineItemSchema,
  fixedId: 'line_items',
  fromKey: 'line_items',
  description: 'A list of line item objects, each containing information about an item in the order.',
} as coda.ArraySchema<typeof OrderLineItemSchema> & coda.ObjectSchemaProperty;
export const orderNoteAttributesProp = {
  type: coda.ValueType.Array,
  items: NameValueSchema,
  fixedId: 'note_attributes',
  fromKey: 'note_attributes',
  description:
    'Extra information that is added to the order. Appears in the Additional details section of an order details page. Each array entry must contain a hash with name and value keys.',
} as coda.ArraySchema<typeof NameValueSchema> & coda.ObjectSchemaProperty;
export const orderNoteProp = {
  ...PROPS.STRING,
  fixedId: 'note',
  fromKey: 'note',
  description: 'An optional note that a shop owner can attach to the order.',
};
export const orderPaymentTermsProp = {
  ...PaymentTermsSchema,
  fixedId: 'payment_terms',
  fromKey: 'payment_terms',
  description: 'The terms and conditions under which a payment should be processed.',
};
export const orderTagsProp = {
  ...PROPS.makeTagsProp('order'),
  description:
    'Tags attached to the order, formatted as a string of comma-separated values. Each individual tag is limited to 40 characters in length.',
};
export const orderTaxesIncludedProp = {
  ...PROPS.BOOLEAN,
  fixedId: 'taxes_included',
  fromKey: 'taxes_included',
  description: 'Whether taxes are included in the order subtotal.',
};
// #endregion

export const OrderSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('order'),
    graphql_gid: PROPS.makeGraphQlGidProp('order'),
    id: PROPS.makeRequiredIdNumberProp('order'),
    app_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'app_id',
      fromKey: 'app_id',
      description: 'The ID of the app that created the order.',
    },
    billing_address: orderBillingAddressProp,
    buyer_accepts_marketing: {
      type: coda.ValueType.Boolean,
      fixedId: 'buyer_accepts_marketing',
      fromKey: 'buyer_accepts_marketing',
      mutable: true,
      description: 'Whether the customer consented to receive email updates from the shop.',
    },
    cancel_reason: {
      type: coda.ValueType.String,
      fixedId: 'cancel_reason',
      fromKey: 'cancel_reason',
      description: `The reason why the order was canceled. Valid values:
- Hide cancel_reason properties
- customer: The customer canceled the order.
- fraud: The order was fraudulent.
- inventory: Items in the order were not in inventory.
- declined: The payment was declined.
- other: A reason not in this list.`,
    },
    cancelled_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'cancelled_at',
      fromKey: 'cancelled_at',
      description: "The date and time when the order was canceled. Returns null if the order isn't canceled.",
    },
    /*
    client_details: {
      ...ClientDetailsSchema,
      fixedId: 'client_details',
      fromKey: 'client_details',
      description: 'Information about the browser that the customer used when they placed their order.',
    },
    */
    browser_ip: {
      type: coda.ValueType.String,
      fixedId: 'browser_ip',
      fromKey: 'browser_ip',
      description:
        'The IP address of the browser used by the customer when they placed the order. Both IPv4 and IPv6 are supported.',
    },
    browser_user_agent: {
      type: coda.ValueType.String,
      fixedId: 'browser_user_agent',
      description: 'Details of the browsing client, including software and operating versions.',
    },
    browser_accept_language: {
      type: coda.ValueType.String,
      fixedId: 'browser_accept_language',
      description: 'The languages and locales that the browser understands.',
    },
    closed_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'closed_at',
      fromKey: 'closed_at',
      description: "The date and time when the order was closed. Returns null if the order isn't closed.",
    },
    company: {
      ...CompanySchema,
      fixedId: 'company',
      fromKey: 'company',
      description:
        'Represents information about the purchasing company for the order. null will be returned if there is no purchasing company.',
    },
    confirmation_number: {
      type: coda.ValueType.String,
      fixedId: 'confirmation_number',
      fromKey: 'confirmation_number',
      description:
        "A randomly generated alpha-numeric identifier for the order that may be shown to the customer instead of the sequential order name. This value isn't guaranteed to be unique.",
    },
    created_at: PROPS.makeCreatedAtProp('order'),
    currency: orderCurrencyProp,
    current_total_additional_fees: {
      ...PROPS.CURRENCY,
      fixedId: 'current_total_additional_fees',
      description: orderCurrentPriceDescription('total additional fees'),
    },
    current_total_discounts: {
      ...PROPS.CURRENCY,
      fixedId: 'current_total_discounts',
      fromKey: 'current_total_discounts',
      description: orderCurrentPriceDescription('total discounts'),
    },
    current_total_duties: {
      ...PROPS.CURRENCY,
      fixedId: 'current_total_duties',
      description: orderCurrentPriceDescription('total duties'),
    },
    current_total_price: {
      ...PROPS.CURRENCY,
      fixedId: 'current_total_price',
      fromKey: 'current_total_price',
      description: orderCurrentPriceDescription('total price'),
    },

    current_subtotal_price: {
      ...PROPS.CURRENCY,
      fixedId: 'current_subtotal_price',
      fromKey: 'current_subtotal_price',
      description: orderCurrentPriceDescription('subtotal price'),
    },
    current_total_tax: {
      ...PROPS.CURRENCY,
      fixedId: 'current_total_tax',
      fromKey: 'current_total_tax',
      description: orderCurrentPriceDescription('total taxes'),
    },
    customer: orderCustomerProp,
    customer_locale: {
      type: coda.ValueType.String,
      fixedId: 'customer_locale',
      fromKey: 'customer_locale',
      description: 'The two or three-letter language code, optionally followed by a region modifier.',
    },
    discount_applications: {
      type: coda.ValueType.Array,
      items: DiscountApplicationSchema,
      fixedId: 'discount_applications',
      fromKey: 'discount_applications',
      description: 'An ordered list of stacked discount applications.',
    },
    discount_codes: {
      type: coda.ValueType.Array,
      items: DiscountCodeSchema,
      fixedId: 'discount_codes',
      fromKey: 'discount_codes',
      description: 'A list of discounts applied to the order.',
    },
    email: { ...orderEmailProp, mutable: true },
    estimated_taxes: {
      type: coda.ValueType.Boolean,
      fixedId: 'estimated_taxes',
      fromKey: 'estimated_taxes',
      description:
        "Whether taxes on the order are estimated. Many factors can change between the time a customer places an order and the time the order is shipped, which could affect the calculation of taxes. This property returns false when taxes on the order are finalized and aren't subject to any changes.",
    },
    financial_status: {
      type: coda.ValueType.String,
      fixedId: 'financial_status',
      fromKey: 'financial_status',
      description: `The status of payments associated with the order. Can only be set when the order is created. Valid values:
- pending: The payments are pending. Payment might fail in this state. Check again to confirm whether the payments have been paid successfully.
- authorized: The payments have been authorized.
- partially_paid: The order has been partially paid
- paid: The payments have been paid.
- partially_refunded: The payments have been partially refunded
- refunded: The payments have been refunded.
- voided: The payments have been voided.`,
    },
    fulfillments: {
      type: coda.ValueType.Array,
      items: FulfillmentSchema,
      fixedId: 'fulfillments',
      description: 'An list of fulfillments associated with the order.',
    },
    fulfillment_status: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_status',
      fromKey: 'fulfillment_status',
      description: `The order's status in terms of fulfilled line items. Valid values:
- fulfilled: Every line item in the order has been fulfilled.
- null: None of the line items in the order have been fulfilled.
- partial: At least one line item in the order has been fulfilled.
- restocked: Every line item in the order has been restocked and the order canceled.`,
    },
    landing_site: {
      type: coda.ValueType.String,
      fixedId: 'landing_site',
      fromKey: 'landing_site',
      description: 'The URL for the page where the buyer landed when they entered the shop.',
    },
    line_items: orderLineItemsProp,
    location_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'location_id',
      fromKey: 'location_id',
      description:
        'The ID of one of the locations that was assigned to fulfill the order when the order was created. Orders can have multiple fulfillment orders. These fulfillment orders can each be assigned to a different location which is responsible for fulfilling a subset of the items in an order. This field will only point to one of these locations.',
    },
    merchant_of_record_app_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'merchant_of_record_app_id',
      fromKey: 'merchant_of_record_app_id',
      description: 'The application acting as Merchant of Record for the order.',
    },
    name: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'name',
      fromKey: 'name',
      description:
        "The order name, generated by combining the order_number property with the order prefix and suffix that are set in the merchant's general settings.",
    },
    note: {
      ...orderNoteProp,
      mutable: true,
    },
    note_attributes: orderNoteAttributesProp,
    number: {
      type: coda.ValueType.Number,
      fixedId: 'number',
      fromKey: 'number',
      useThousandsSeparator: false,
      description: "The order's position in the shop's count of orders. Numbers are sequential and start at 1.",
    },
    order_number: {
      type: coda.ValueType.Number,
      fixedId: 'order_number',
      fromKey: 'order_number',
      useThousandsSeparator: false,
      description:
        "The order's position in the shop's count of orders starting at 1001. Order numbers are sequential and start at 1001.",
    },
    original_total_additional_fees: {
      ...PROPS.CURRENCY,
      fixedId: 'original_total_additional_fees',
      description: orderPriceDescription('additional fees'),
    },
    original_total_duties: {
      ...PROPS.CURRENCY,
      fixedId: 'original_total_duties',
      description: orderPriceDescription('total duties'),
    },
    payment_terms: orderPaymentTermsProp,
    payment_gateway_names: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.String },
      fixedId: 'payment_gateway_names',
      fromKey: 'payment_gateway_names',
      description: 'The list of payment gateways used for the order.',
    },
    phone: {
      type: coda.ValueType.String,
      fixedId: 'phone',
      fromKey: 'phone',
      mutable: true,
      description: 'The customer’s phone number for receiving SMS notifications.',
    },
    po_number: {
      type: coda.ValueType.String,
      fixedId: 'po_number',
      fromKey: 'po_number',
      description: 'The purchase order number associated to this order.',
    },
    presentment_currency: {
      type: coda.ValueType.String,
      fixedId: 'presentment_currency',
      fromKey: 'presentment_currency',
      description: 'The presentment currency that was used to display prices to the customer.',
    },
    processed_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'processed_at',
      fromKey: 'processed_at',
      description: 'The date and time when an order was processed.',
    },
    referring_site: {
      type: coda.ValueType.String,
      fixedId: 'referring_site',
      fromKey: 'referring_site',
      description: 'The website where the customer clicked a link to the shop.',
    },
    refunds: {
      type: coda.ValueType.Array,
      items: RefundSchema,
      fixedId: 'refunds',
      fromKey: 'refunds',
      description: 'A list of refunds applied to the order.',
    },
    shipping_address: orderShippingAddressProp,
    shipping_lines: {
      type: coda.ValueType.Array,
      items: ShippingLineSchema,
      fixedId: 'shipping_lines',
      fromKey: 'shipping_lines',
      description: 'An array of objects, each of which details a shipping method used.',
    },
    source_name: {
      type: coda.ValueType.String,
      fixedId: 'source_name',
      fromKey: 'source_name',
      description: 'The source of the checkout.',
    },
    source_identifier: {
      type: coda.ValueType.String,
      fixedId: 'source_identifier',
      fromKey: 'source_identifier',
      description:
        "The ID of the order placed on the originating platform. This value doesn't correspond to the Shopify ID that's generated from a completed draft.",
    },
    source_url: {
      ...PROPS.LINK,
      fixedId: 'source_url',
      fromKey: 'source_url',
      description:
        "A valid URL to the original order on the originating surface. This URL is displayed to merchants on the Order Details page. If the URL is invalid, then it won't be displayed.",
    },
    subtotal_price: {
      ...PROPS.CURRENCY,
      fixedId: 'subtotal_price',
      fromKey: 'subtotal_price',
      description:
        'The price of the order in the shop currency after discounts but before shipping, duties, taxes, and tips.',
    },
    tags: {
      ...orderTagsProp,
      mutable: true,
    },
    tax_lines: orderLineItemTaxLinesProp,
    taxes_included: orderTaxesIncludedProp,
    test: {
      type: coda.ValueType.Boolean,
      fixedId: 'test',
      fromKey: 'test',
      description: 'Whether this is a test order.',
    },
    total_discounts: {
      ...PROPS.CURRENCY,
      fixedId: 'total_discounts',
      fromKey: 'total_discounts',
      description: orderPriceDescription('total discounts applied to the price'),
    },

    total_line_items_price: {
      ...PROPS.CURRENCY,
      fixedId: 'total_line_items_price',
      fromKey: 'total_line_items_price',
      description: orderPriceDescription('sum of all line item prices'),
    },
    total_outstanding: {
      ...PROPS.CURRENCY,
      fixedId: 'total_outstanding',
      fromKey: 'total_outstanding',
      description: orderPriceDescription('total outstanding amount'),
    },
    total_price: {
      ...PROPS.CURRENCY,
      fixedId: 'total_price',
      fromKey: 'total_price',
      description: orderPriceDescription('sum of all line item prices, discounts, shipping, taxes, and tips'),
    },
    total_shipping_price: {
      ...PROPS.CURRENCY,
      fixedId: 'total_shipping_price',
      description: orderPriceDescription('total shipping price', ', excluding discounts and returns,'),
    },
    total_tax: {
      ...PROPS.CURRENCY,
      fixedId: 'total_tax',
      fromKey: 'total_tax',
      description: orderPriceDescription('sum of all the taxes'),
    },
    total_tip_received: {
      ...PROPS.CURRENCY,
      fixedId: 'total_tip_received',
      fromKey: 'total_tip_received',
      description: orderPriceDescription('sum of all the tips'),
    },
    total_weight: {
      type: coda.ValueType.Number,
      fixedId: 'total_weight',
      fromKey: 'total_weight',
      description:
        'The sum of all line item weights in grams. The sum is not adjusted as items are removed from the order.',
    },
    updated_at: PROPS.makeUpdatedAtProp('order'),
    user_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'user_id',
      fromKey: 'user_id',
      description: 'The ID of the user logged into Shopify POS who processed the order, if applicable.',
    },
    order_status_url: {
      ...PROPS.LINK,
      fixedId: 'order_status_url',
      fromKey: 'order_status_url',
      description: 'The URL pointing to the order status web page, if applicable.',
    },
    confirmed: {
      type: coda.ValueType.Boolean,
      fixedId: 'confirmed',
      fromKey: 'confirmed',
      description: 'Whether inventory has been reserved for the order.',
    },

    /*
    checkout_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'checkout_id',
    },
    */
    /*
    contact_email: {
      ...PROPS.EMAIL,
      fixedId: 'contact_email',
    },
    */
    /*
    reference: {
      type: coda.ValueType.String,
      fixedId: 'reference',
    },
    */
  },

  displayProperty: 'name',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['id', 'customer', 'shipping_lines', 'line_items'],
});
export const OrderReference = coda.makeReferenceSchemaFromObjectSchema(OrderSyncTableSchema, PACK_IDENTITIES.Order);
export const formatOrderReference: FormatRowReferenceFn<number, 'name'> = (id: number, name = NOT_FOUND) => ({
  id,
  name,
});
