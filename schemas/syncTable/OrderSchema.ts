import * as coda from '@codahq/packs-sdk';

import { NOT_FOUND } from '../../constants';
import { CustomerReference } from './CustomerSchema';
import { NameValueSchema } from '../basic/NameValueSchema';
import { TaxLineSchema } from '../basic/TaxLineSchema';
import { FulfillmentSchema } from '../basic/FulfillmentSchema';
import { OrderLineItemSchema } from '../basic/OrderLineItemSchema';
import { AddressSchema } from '../basic/AddressSchema';
import { CompanySchema } from '../basic/CompanySchema';
import { DiscountApplicationSchema } from '../basic/DiscountApplicationSchema';
import { DiscountCodeSchema } from '../basic/DiscountCodeSchema';
import { ShippingLineSchema } from '../basic/ShippingLineSchema';
import { PaymentTermsSchema } from '../basic/PaymentTermsSchema';
import { RefundSchema } from '../basic/RefundSchema';
import { Identity } from '../../constants';

import type { FieldDependency } from '../Schema.types';

export const OrderSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the order in the Shopify admin.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the order.',
    },
    id: {
      type: coda.ValueType.Number,
      required: true,
      fromKey: 'id',
      fixedId: 'id',
      useThousandsSeparator: false,
      description:
        'The ID of the order, used for API purposes. This is different from the order_number property, which is the ID used by the shop owner and customer.',
    },
    app_id: {
      type: coda.ValueType.Number,
      fixedId: 'app_id',
      fromKey: 'app_id',
      useThousandsSeparator: false,
      description: 'The ID of the app that created the order.',
    },
    billing_address: {
      ...AddressSchema,
      fixedId: 'billing_address',
      fromKey: 'billing_address',
      description:
        "The mailing address associated with the payment method. This address is an optional field that won't be available on orders that do not require a payment method.",
    },
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
      description:
        'The reason why the order was canceled. Valid values:\n- Hide cancel_reason properties\n- customer: The customer canceled the order.\n- fraud: The order was fraudulent.\n- inventory: Items in the order were not in inventory.\n- declined: The payment was declined.\n- other: A reason not in this list.',
    },
    cancelled_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
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
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
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
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The autogenerated date and time when the order was created in Shopify. ',
    },
    currency: {
      type: coda.ValueType.String,
      fixedId: 'currency',
      fromKey: 'currency',
      description: 'The three-letter code (ISO 4217 format) for the shop currency.',
    },
    current_total_additional_fees: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'current_total_additional_fees',
      description:
        'The current total additional fees on the order in shop currency. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    /*
    current_total_additional_fees_set: {
      ...PriceSetSchema,
      fixedId: 'current_total_additional_fees_set',
      fromKey: 'current_total_additional_fees_set',
      description:
        'The current total additional fees on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    */
    current_total_discounts: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'current_total_discounts',
      fromKey: 'current_total_discounts',
      description:
        'The current total discounts on the order in the shop currency. The value of this field reflects order edits, returns, and refunds.',
    },
    /*
    current_total_discounts_set: {
      ...PriceSetSchema,
      fixedId: 'current_total_discounts_set',
      fromKey: 'current_total_discounts_set',
      description:
        'The current total discounts on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    */
    current_total_duties: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'current_total_duties',
      description:
        'The current total duties charged on the order in shop currency. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    /*
    current_total_duties_set: {
      ...PriceSetSchema,
      fixedId: 'current_total_duties_set',
      fromKey: 'current_total_duties_set',
      description:
        'The current total duties charged on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    */
    current_total_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'current_total_price',
      fromKey: 'current_total_price',
      description:
        'The current total price of the order in the shop currency. The value of this field reflects order edits, returns, and refunds.',
    },
    /*
    current_total_price_set: {
      ...PriceSetSchema,
      fixedId: 'current_total_price_set',
      fromKey: 'current_total_price_set',
      description:
        'The current total price of the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds',
    },
    */
    current_subtotal_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'current_subtotal_price',
      fromKey: 'current_subtotal_price',
      description:
        'The current subtotal price of the order in the shop currency. The value of this field reflects order edits, returns, and refunds.',
    },
    /*
    current_subtotal_price_set: {
      ...PriceSetSchema,
      fixedId: 'current_subtotal_price_set',
      fromKey: 'current_subtotal_price_set',
      description:
        'The current subtotal price of the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    */
    current_total_tax: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'current_total_tax',
      fromKey: 'current_total_tax',
      description:
        'The current total taxes charged on the order in the shop currency. The value of this field reflects order edits, returns, or refunds.',
    },
    /*
    current_total_tax_set: {
      ...PriceSetSchema,
      fixedId: 'current_total_tax_set',
      fromKey: 'current_total_tax_set',
      description:
        'The current total taxes charged on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.',
    },
    */
    customer: {
      ...CustomerReference,
      fixedId: 'customer',
      fromKey: 'customer',
      description:
        'Information about the customer. The order might not have a customer and apps should not depend on the existence of a customer object. This value might be null if the order was created through Shopify POS.',
    },
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
    email: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Email,
      fixedId: 'email',
      fromKey: 'email',
      mutable: true,
      description: "The customer's email address.",
    },
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
      description:
        'The status of payments associated with the order. Can only be set when the order is created. Valid values:\n- pending: The payments are pending. Payment might fail in this state. Check again to confirm whether the payments have been paid successfully.\n- authorized: The payments have been authorized.\n- partially_paid: The order has been partially paid.\n- paid: The payments have been paid.\n- partially_refunded: The payments have been partially refunded.\n- refunded: The payments have been refunded.\n- voided: The payments have been voided.',
    },
    fulfillments: {
      type: coda.ValueType.Array,
      items: FulfillmentSchema,
      fixedId: 'fulfillments',
      description: 'An array of fulfillments associated with the order.',
    },
    fulfillment_status: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_status',
      fromKey: 'fulfillment_status',
      description:
        "The order's status in terms of fulfilled line items. Valid values:\n- fulfilled: Every line item in the order has been fulfilled.\n- null: None of the line items in the order have been fulfilled.\n- partial: At least one line item in the order has been fulfilled.\n- restocked: Every line item in the order has been restocked and the order canceled.",
    },
    landing_site: {
      type: coda.ValueType.String,
      fixedId: 'landing_site',
      fromKey: 'landing_site',
      description: 'The URL for the page where the buyer landed when they entered the shop.',
    },
    line_items: {
      type: coda.ValueType.Array,
      items: OrderLineItemSchema,
      fixedId: 'line_items',
      fromKey: 'line_items',
      description: 'A list of line item objects, each containing information about an item in the order.',
    },
    location_id: {
      type: coda.ValueType.Number,
      fixedId: 'location_id',
      fromKey: 'location_id',
      useThousandsSeparator: false,
      description:
        'The ID of one of the locations that was assigned to fulfill the order when the order was created. Orders can have multiple fulfillment orders. These fulfillment orders can each be assigned to a different location which is responsible for fulfilling a subset of the items in an order. This field will only point to one of these locations.',
    },
    merchant_of_record_app_id: {
      type: coda.ValueType.Number,
      fixedId: 'merchant_of_record_app_id',
      fromKey: 'merchant_of_record_app_id',
      useThousandsSeparator: false,
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
      type: coda.ValueType.String,
      fixedId: 'note',
      fromKey: 'note',
      mutable: true,
      description: 'An optional note that a shop owner can attach to the order.',
    },
    note_attributes: {
      type: coda.ValueType.Array,
      items: NameValueSchema,
      fixedId: 'note_attributes',
      fromKey: 'note_attributes',
      description:
        'Extra information that is added to the order. Appears in the Additional details section of an order details page. Each array entry must contain a hash with name and value keys.',
    },
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
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'original_total_additional_fees',
      description: 'The original total additional fees on the order in shop currency.',
    },
    /*
    original_total_additional_fees_set: {
      ...PriceSetSchema,
      fixedId: 'original_total_additional_fees_set',
      fromKey: 'original_total_additional_fees_set',
      description: 'The original total additional fees on the order in shop and presentment currencies.',
    },
    */
    original_total_duties: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'original_total_duties',
      description: 'The original total duties charged on the order in shop currency.',
    },
    /*
    original_total_duties_set: {
      ...PriceSetSchema,
      fixedId: 'original_total_duties_set',
      fromKey: 'original_total_duties_set',
      description: 'The original total duties charged on the order in shop and presentment currencies.',
    },
    */
    payment_terms: {
      ...PaymentTermsSchema,
      fixedId: 'payment_terms',
      fromKey: 'payment_terms',
      description: 'The terms and conditions under which a payment should be processed.',
    },
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
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
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
    shipping_address: {
      ...AddressSchema,
      fixedId: 'shipping_address',
      fromKey: 'shipping_address',
      description:
        'The mailing address to where the order will be shipped. This address is optional and will not be available on orders that do not require shipping.',
    },
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
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'source_url',
      fromKey: 'source_url',
      description:
        "A valid URL to the original order on the originating surface. This URL is displayed to merchants on the Order Details page. If the URL is invalid, then it won't be displayed.",
    },
    subtotal_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'subtotal_price',
      fromKey: 'subtotal_price',
      description:
        'The price of the order in the shop currency after discounts but before shipping, duties, taxes, and tips.',
    },
    /*
    subtotal_price_set: {
      ...PriceSetSchema,
      fixedId: 'subtotal_price_set',
      fromKey: 'subtotal_price_set',
      description:
        'The subtotal of the order in shop and presentment currencies after discounts but before shipping, duties, taxes, and tips.',
    },
    */
    tags: {
      type: coda.ValueType.String,
      fixedId: 'tags',
      fromKey: 'tags',
      mutable: true,
      description:
        'Tags attached to the order, formatted as a string of comma-separated values. Each individual tag is limited to 40 characters in length.',
    },
    tax_lines: {
      type: coda.ValueType.Array,
      items: TaxLineSchema,
      fixedId: 'tax_lines',
      fromKey: 'tax_lines',
      description: 'An array of tax line objects, each of which details a tax applicable to the order.',
    },
    taxes_included: {
      type: coda.ValueType.Boolean,
      fixedId: 'taxes_included',
      fromKey: 'taxes_included',
      description: 'Whether taxes are included in the order subtotal.',
    },
    test: {
      type: coda.ValueType.Boolean,
      fixedId: 'test',
      fromKey: 'test',
      description: 'Whether this is a test order.',
    },
    total_discounts: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_discounts',
      fromKey: 'total_discounts',
      description: 'The total discounts applied to the price of the order in the shop currency.',
    },
    /*
    total_discounts_set: {
      ...PriceSetSchema,
      fixedId: 'total_discounts_set',
      fromKey: 'total_discounts_set',
      description: 'The total discounts applied to the price of the order in shop and presentment currencies.',
    },
    */

    total_line_items_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_line_items_price',
      fromKey: 'total_line_items_price',
      description: 'The sum of all line item prices in the shop currency.',
    },
    /*
    total_line_items_price_set: {
      ...PriceSetSchema,
      fixedId: 'total_line_items_price_set',
      fromKey: 'total_line_items_price_set',
      description: 'The total of all line item prices in shop and presentment currencies.',
    },
    */
    total_outstanding: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_outstanding',
      fromKey: 'total_outstanding',
      description: 'The total outstanding amount of the order in the shop currency.',
    },
    total_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_price',
      fromKey: 'total_price',
      description:
        'The sum of all line item prices, discounts, shipping, taxes, and tips in the shop currency. Must be positive.',
    },
    /*
    total_price_set: {
      ...PriceSetSchema,
      fixedId: 'total_price_set',
      fromKey: 'total_price_set',
      description: 'The total price of the order in shop and presentment currencies.',
    },
    */
    total_shipping_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_shipping_price',
      description: 'The total shipping price of the order, excluding discounts and returns in shop currency.',
    },
    /*
    total_shipping_price_set: {
      ...PriceSetSchema,
      fixedId: 'total_shipping_price_set',
      fromKey: 'total_shipping_price_set',
      description:
        'The total shipping price of the order, excluding discounts and returns, in shop and presentment currencies. If taxes_included is set to true, then total_shipping_price_set includes taxes.',
    },
    */
    total_tax: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_tax',
      fromKey: 'total_tax',
      description: 'The sum of all the taxes applied to the order in the shop currency. Must be positive.',
    },
    /*
    total_tax_set: {
      ...PriceSetSchema,
      fixedId: 'total_tax_set',
      fromKey: 'total_tax_set',
      description: 'The total tax applied to the order in shop and presentment currencies.',
    },
    */
    total_tip_received: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_tip_received',
      fromKey: 'total_tip_received',
      description: 'The sum of all the tips in the order in the shop currency.',
    },
    total_weight: {
      type: coda.ValueType.Number,
      fixedId: 'total_weight',
      fromKey: 'total_weight',
      description:
        'The sum of all line item weights in grams. The sum is not adjusted as items are removed from the order.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description:
        'The date and time when the order was last modified. Filtering orders by updated_at is not an effective method for fetching orders because its value can change when no visible fields of an order have been updated.',
    },
    user_id: {
      type: coda.ValueType.Number,
      fixedId: 'user_id',
      fromKey: 'user_id',
      useThousandsSeparator: false,
      description: 'The ID of the user logged into Shopify POS who processed the order, if applicable.',
    },
    order_status_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
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
      type: coda.ValueType.Number,
      fixedId: 'checkout_id',
      useThousandsSeparator: false,
    },
    */
    /*
    contact_email: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Email,
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
export const orderFieldDependencies: FieldDependency<typeof OrderSyncTableSchema.properties>[] = [
  //   {
  //   field: 'handle',
  //   dependencies: ['storeUrl'],
  // },
  {
    field: 'client_details',
    dependencies: ['browser_user_agent', 'browser_accept_language'],
  },
  {
    field: 'current_total_duties_set',
    dependencies: ['current_total_duties'],
  },
  {
    field: 'current_total_additional_fees_set',
    dependencies: ['current_total_additional_fees'],
  },
  {
    field: 'original_total_additional_fees_set',
    dependencies: ['original_total_additional_fees'],
  },
  {
    field: 'original_total_duties_set',
    dependencies: ['original_total_duties'],
  },
  {
    field: 'total_shipping_price_set',
    dependencies: ['total_shipping_price'],
  },
  {
    field: 'id',
    dependencies: ['admin_url'],
  },
];
export const OrderReference = coda.makeReferenceSchemaFromObjectSchema(OrderSyncTableSchema, Identity.Order);
export const formatOrderReference = (id: number, name = NOT_FOUND) => ({ id, name });
