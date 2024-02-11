import * as coda from '@codahq/packs-sdk';

import { CustomerReference } from '../customers/customers-schema';
import { BaseAddressSchema } from '../addresses/addresses-schema';
import { FieldDependency } from '../types/tableSync';
import { IDENTITY_ORDER } from '../constants';

const MoneySchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number, description: 'Decimal money amount.' },
    currency_code: { type: coda.ValueType.String, description: 'Currency of the money.' },
  },
  displayProperty: 'amount',
});

const NameValueSchema = coda.makeObjectSchema({
  properties: {
    name: { type: coda.ValueType.String },
    value: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
});

const PriceSetSchema = coda.makeObjectSchema({
  properties: {
    shop_money: MoneySchema,
    presentment_money: MoneySchema,
  },
  displayProperty: 'shop_money',
});

const ExtendedAuthorizationAttributesSchema = coda.makeObjectSchema({
  properties: {
    standard_authorization_expires_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'standard_authorization_expires_at',
      fromKey: 'standard_authorization_expires_at',
      description: 'The time after which capture will incur an additional fee.',
    },
    extended_authorization_expires_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'extended_authorization_expires_at',
      fromKey: 'extended_authorization_expires_at',
      description:
        'The time after which the extended authorization expires. After the expiry, the merchant is unable to capture the payment.',
    },
  },
});

const TaxLineSchema = coda.makeObjectSchema({
  properties: {
    title: {
      type: coda.ValueType.String,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The name of the tax.',
    },
    price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'price',
      fromKey: 'price',
      description: 'The amount of tax to be charged in the shop currency.',
    },
    /*
    price_set: {
      ...PriceSetSchema,
      fixedId: 'price_set',
      fromKey: 'price_set',
      description: 'The amount added to the order for this tax in shop and presentment currencies.',
    },
    */
    rate: {
      type: coda.ValueType.Number,
      fixedId: 'rate',
      fromKey: 'rate',
      description: 'The tax rate applied to the order to calculate the tax price.',
    },
    channel_liable: {
      type: coda.ValueType.Boolean,
      fixedId: 'channel_liable',
      fromKey: 'channel_liable',
      description:
        'Whether the channel that submitted the tax line is liable for remitting. A value of null indicates unknown liability for the tax line.',
    },
  },
  displayProperty: 'price',
});

// Information about the browser that the customer used when they placed their order:
const ClientDetailsSchema = coda.makeObjectSchema({
  properties: {
    accept_language: {
      type: coda.ValueType.String,
      description: 'The languages and locales that the browser understands.',
    },
    browser_height: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The browser screen height in pixels, if available.',
    },
    browser_ip: { type: coda.ValueType.String, description: 'The browser IP address.' },
    browser_width: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The browser screen width in pixels, if available.',
    },
    session_hash: { type: coda.ValueType.String, description: 'A hash of the session.' },
    user_agent: {
      type: coda.ValueType.String,
      description: 'Details of the browsing client, including software and operating versions.',
    },
  },
  displayProperty: 'user_agent',
});

const CompanySchema = coda.makeObjectSchema({
  properties: {
    company_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'company_id',
      useThousandsSeparator: false,
      description: 'The browser screen height in pixels, if available.',
    },
    location_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The browser screen width in pixels, if available.',
    },
  },
  displayProperty: 'company_id',
});

const DiscountAllocationSchema = coda.makeObjectSchema({
  properties: {
    amount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'amount',
      fromKey: 'amount',
    },
    /*
    amount_set: PriceSetSchema,
    */
    discount_application_index: {
      type: coda.ValueType.Number,
      description:
        'An ordered index that can be used to identify the discount application and indicate the precedence of the discount application for calculations',
    },
  },
  displayProperty: 'amount',
  // idProperty: 'amount',
  // featuredProperties: ['amount'],
});

const DiscountApplicationSchema = coda.makeObjectSchema({
  properties: {
    allocation_method: {
      type: coda.ValueType.String,
      description:
        'The method by which the discount application value has been allocated to entitled lines. Valid values:\n- across: The value is spread across all entitled lines.\n- each: The value is applied onto every entitled line.\n- one: The value is applied onto a single line.',
    },
    code: {
      type: coda.ValueType.String,
      description:
        'The discount code that was used to apply the discount. Available only for discount code applications.',
    },
    description: {
      type: coda.ValueType.String,
      description:
        'The description of the discount application, as defined by the merchant or the Shopify Script. Available only for manual and script discount applications.',
    },
    target_selection: {
      type: coda.ValueType.String,
      description:
        'The lines on the order, of the type defined by target_type, that the discount is allocated over. Valid values:\n- all: The discount is allocated onto all lines,\n- entitled: The discount is allocated only onto lines it is entitled for.\n- explicit: The discount is allocated onto explicitly selected lines.',
    },
    target_type: {
      type: coda.ValueType.String,
      description:
        'The type of line on the order that the discount is applicable on. Valid values:\n- line_item: The discount applies to line items.\n- shipping_line: The discount applies to shipping lines.',
    },
    title: {
      type: coda.ValueType.String,
      description:
        'The title of the discount application, as defined by the merchant. Available only for manual discount applications.',
    },
    type: {
      type: coda.ValueType.String,
      description:
        'The discount application type. Valid values:\n- automatic: The discount was applied automatically, such as by a Buy X Get Y automatic discount.\n- discount_code: The discount was applied by a discount code.\n- manual: The discount was manually applied by the merchant (for example, by using an app or creating a draft order).\n- script: The discount was applied by a Shopify Script.',
    },
    value: {
      type: coda.ValueType.String,
      description:
        'The value of the discount application as a decimal. This represents the intention of the discount application. For example, if the intent was to apply a 20% discount, then the value will be 20.0. If the intent was to apply a $15 discount, then the value will be 15.0.',
    },
    value_type: {
      type: coda.ValueType.String,
      description:
        'The type of the value. Valid values:\n- fixed_amount: A fixed amount discount value in the currency of the order.\n- percentage: A percentage discount value.',
    },
  },
  displayProperty: 'code',
});

const DiscountCodeSchema = coda.makeObjectSchema({
  properties: {
    amount: {
      type: coda.ValueType.Number,
      description:
        "The amount that's deducted from the order total. When you create an order, this value is the percentage or monetary amount to deduct. After the order is created, this property returns the calculated amount.",
    },
    code: {
      type: coda.ValueType.String,
      description:
        'When the associated discount application is of type code, this property returns the discount code that was entered at checkout. Otherwise this property returns the title of the discount that was applied.',
    },
    type: {
      type: coda.ValueType.String,
      description:
        "The type of discount. Default value: fixed_amount. Valid values:\n- fixed_amount: Applies amount as a unit of the store's currency. For example, if amount is 30 and the store's currency is USD, then 30 USD is deducted from the order total when the discount is applied.\n- percentage: Applies a discount of amount as a percentage of the order total.\n- shipping: Applies a free shipping discount on orders that have a shipping rate less than or equal to amount. For example, if amount is 30, then the discount will give the customer free shipping for any shipping rate that is less than or equal to $30.",
    },
  },
  displayProperty: 'code',
});

const DutySchema = coda.makeObjectSchema({
  properties: {
    duty_id: { type: coda.ValueType.Number, fromKey: 'id', useThousandsSeparator: false },
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
    country_code_of_origin: { type: coda.ValueType.String },
    harmonized_system_code: { type: coda.ValueType.String },
    // admin_graphql_api_id: { type: coda.ValueType.String },
    // price: { type: coda.ValueType.Number },
  },
  displayProperty: 'duty_id',
});

const AttributedStaffSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fixedId: 'graphql_gid',
      fromKey: 'id',
      description: 'The id of the staff member.',
    },
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The quantity of the line item attributed to the staff member.',
    },
  },
});

const LineItemSchema = coda.makeObjectSchema({
  properties: {
    line_item_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'line_item_id',
      useThousandsSeparator: false,
      description: 'The ID of the line item.',
    },
    attributed_staffs: {
      type: coda.ValueType.Array,
      items: AttributedStaffSchema,
      fromKey: 'attributed_staffs',
      fixedId: 'attributed_staffs',
      description: 'The staff members attributed to the line item.',
    },
    fulfillable_quantity: {
      type: coda.ValueType.Number,
      fixedId: 'fulfillable_quantity',
      fromKey: 'fulfillable_quantity',
      description:
        'The amount available to fulfill, calculated as follows\nquantity - max(refunded_quantity, fulfilled_quantity) - pending_fulfilled_quantity - open_fulfilled_quantity',
    },
    fulfillment_service: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_service',
      fromKey: 'fulfillment_service',
      description: 'The handle of a fulfillment service that stocks the product variant belonging to a line item.',
    },
    fulfillment_status: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_status',
      fromKey: 'fulfillment_status',
      description:
        'How far along an order is in terms line items fulfilled. Valid values:\n- null\n- fulfilled\n- partial\n- not_eligible.',
    },
    grams: {
      type: coda.ValueType.Number,
      fixedId: 'grams',
      fromKey: 'grams',
      description: 'The weight of the item in grams.',
    },
    price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'price',
      fromKey: 'price',
      description: 'The price of the item before discounts have been applied in the shop currency.',
    },
    /*
    price_set: {
      ...PriceSetSchema,
      fixedId: 'price_set',
      fromKey: 'price_set',
      description: 'The price of the line item in shop and presentment currencies.',
    },
    */
    product_id: {
      type: coda.ValueType.Number,
      fixedId: 'product_id',
      fromKey: 'product_id',
      useThousandsSeparator: false,
      description:
        'The ID of the product that the line item belongs to. Can be null if the original product associated with the order is deleted at a later date',
    },
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The number of items that were purchased',
    },
    requires_shipping: {
      type: coda.ValueType.Boolean,
      fixedId: 'requires_shipping',
      fromKey: 'requires_shipping',
      description: 'Whether the item requires shipping',
    },
    sku: {
      type: coda.ValueType.String,
      fixedId: 'sku',
      fromKey: 'sku',
      description: "The item's SKU (stock keeping unit).",
    },
    title: {
      type: coda.ValueType.String,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The title of the product',
    },
    variant_id: {
      type: coda.ValueType.Number,
      fixedId: 'variant_id',
      fromKey: 'variant_id',
      useThousandsSeparator: false,
      description: 'The ID of the product variant',
    },
    variant_title: {
      type: coda.ValueType.String,
      fixedId: 'variant_title',
      fromKey: 'variant_title',
      description: 'The title of the product variant',
    },
    vendor: {
      type: coda.ValueType.String,
      fixedId: 'vendor',
      fromKey: 'vendor',
      description: "The name of the item's supplier",
    },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      fromKey: 'name',
      description: 'The name of the product variant',
    },
    gift_card: {
      type: coda.ValueType.Boolean,
      fixedId: 'gift_card',
      fromKey: 'gift_card',
      description:
        'Whether the item is a gift card. If true, then the item is not taxed or considered for shipping charges.',
    },
    properties: {
      type: coda.ValueType.Array,
      items: NameValueSchema,
      fixedId: 'properties',
      fromKey: 'properties',
      description:
        'An array of custom information for the item that has been added to the cart. Often used to provide product customization options.',
    },
    taxable: {
      type: coda.ValueType.Boolean,
      fixedId: 'taxable',
      fromKey: 'taxable',
      description: 'Whether the item was taxable',
    },
    tax_lines: {
      type: coda.ValueType.Array,
      items: TaxLineSchema,
      fixedId: 'tax_lines',
      fromKey: 'tax_lines',
      description: 'A list of tax line objects, each of which details a tax applied to the item.',
    },
    tip_payment_gateway: {
      type: coda.ValueType.String,
      fixedId: 'tip_payment_gateway',
      fromKey: 'tip_payment_gateway',
      description: 'The payment gateway used to tender the tip, such as shopify_payments. Present only on tips.',
    },
    tip_payment_method: {
      type: coda.ValueType.String,
      fixedId: 'tip_payment_method',
      fromKey: 'tip_payment_method',
      description: 'The payment method used to tender the tip, such as Visa. Present only on tips.',
    },
    total_discount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_discount',
      fromKey: 'total_discount',
      description:
        'The total amount of the discount allocated to the line item in the shop currency. This field must be explicitly set using draft orders, Shopify scripts, or the API. Instead of using this field, Shopify recommends using discount_allocations, which provides the same information.',
    },
    /*
    total_discount_set: {
      ...PriceSetSchema,
      fixedId: 'total_discount_set',
      fromKey: 'total_discount_set',
      description:
        'The total amount allocated to the line item in the presentment currency. Instead of using this field, Shopify recommends using discount_allocations, which provides the same information.',
    },
    */
    discount_allocations: {
      type: coda.ValueType.Array,
      items: DiscountAllocationSchema,
      fixedId: 'discount_allocations',
      fromKey: 'discount_allocations',
      description:
        'An ordered list of amounts allocated by discount applications. Each discount allocation is associated with a particular discount application.',
    },
    duties: {
      type: coda.ValueType.Array,
      items: DutySchema,
      fixedId: 'duties',
      fromKey: 'duties',
      description: 'A list of duty objects, each containing information about a duty on the line item.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the line item.',
      fixedId: 'graphql_gid',
    },
    // product_exists: {
    //   type: coda.ValueType.Boolean,
    //   fixedId: "product_exists",
    // },
    // variant_inventory_management: {
    //   type: coda.ValueType.String,
    //   fixedId: "variant_inventory_management",
    // },
  },
  displayProperty: 'name',
  idProperty: 'line_item_id',
});

const FulfillmentSchema = coda.makeObjectSchema({
  properties: {
    // TODO: check if admin_graphql_api_id is really returned by Shopify for fulfillments
    graphql_gid: {
      type: coda.ValueType.String,
      fixedId: 'graphql_gid',
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the fulfillment.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the fulfillment was created.',
    },
    fulfillment_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'fulfillment_id',
      useThousandsSeparator: false,
      description: 'The ID for the fulfillment.',
    },
    line_items: {
      type: coda.ValueType.Array,
      items: LineItemSchema,
      fixedId: 'line_items',
      fromKey: 'line_items',
      description: "A list of the fulfillment's line items",
    },
    location_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'location_id',
      fromKey: 'location_id',
      description: 'The unique identifier of the location that the fulfillment was processed at.',
    },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      fromKey: 'name',
      description:
        "The uniquely identifying fulfillment name, consisting of two parts separated by a '.'. The first part represents the order name and the second part represents the fulfillment number. The fulfillment number automatically increments depending on how many fulfillments are in an order (e.g. #1001.1, #1001.2).",
    },
    notify_customer: {
      type: coda.ValueType.Boolean,
      fixedId: 'notify_customer',
      fromKey: 'notify_customer',
      description:
        'Whether the customer should be notified. If set to true, then an email will be sent when the fulfillment is created or updated. The default value is false.',
    },
    order_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'order_id',
      fromKey: 'order_id',
      description: 'The unique numeric identifier for the order.',
    },
    origin_address: {
      type: coda.ValueType.Object,
      properties: {
        address1: { type: coda.ValueType.String, description: 'The street address of the fulfillment location.' },
        address2: {
          type: coda.ValueType.String,
          description: 'The second line of the address. Typically the number of the apartment, suite, or unit.',
        },
        city: { type: coda.ValueType.String, description: 'The city of the fulfillment location.' },
        country_code: {
          type: coda.ValueType.String,
          description: 'The two-letter country code (ISO 3166-1 alpha-2 format) of the fulfillment location.',
        },
        province_code: { type: coda.ValueType.String, description: 'The province of the fulfillment location.' },
        zip: { type: coda.ValueType.String, description: 'The zip code of the fulfillment location.' },
      },
      fixedId: 'origin_address',
      fromKey: 'origin_address',
      description:
        'The address of the fulfillment location. This property is intended for tax purposes, as a full address is required for tax providers to accurately calculate taxes.',
    },
    // A text field that provides information about the receipt:
    receipt: {
      type: coda.ValueType.Object,
      properties: {
        testcase: { type: coda.ValueType.Boolean, description: 'Whether the fulfillment was a testcase.' },
        authorization: { type: coda.ValueType.String, description: 'The authorization code.' },
      },
      fixedId: 'receipt',
      fromKey: 'receipt',
      description: 'A text field that provides information about the receipt.',
    },
    service: {
      type: coda.ValueType.String,
      fixedId: 'service',
      fromKey: 'service',
      description: 'The fulfillment service associated with the fulfillment.',
    },
    shipment_status: {
      type: coda.ValueType.String,
      fixedId: 'shipment_status',
      fromKey: 'shipment_status',
      description:
        "The current shipment status of the fulfillment. Valid values:\n- label_printed: A label for the shipment was purchased and printed.\n- label_purchased: A label for the shipment was purchased, but not printed.\n- attempted_delivery: Delivery of the shipment was attempted, but unable to be completed.\n- ready_for_pickup: The shipment is ready for pickup at a shipping depot.\n- confirmed: The carrier is aware of the shipment, but hasn't received it yet.\n- in_transit: The shipment is being transported between shipping facilities on the way to its destination.\n- out_for_delivery: The shipment is being delivered to its final destination.\n- delivered: The shipment was succesfully delivered.\n- failure: Something went wrong when pulling tracking information for the shipment, such as the tracking number was invalid or the shipment was canceled.",
    },
    status: {
      type: coda.ValueType.String,
      fixedId: 'status',
      fromKey: 'status',
      description:
        "The status of the fulfillment. Valid values:\n- pending: Shopify has created the fulfillment and is waiting for the third-party fulfillment service to transition it to 'open' or 'success'.\n- open: The fulfillment has been acknowledged by the service and is in processing.\n- success: The fulfillment was successful.\n- cancelled: The fulfillment was cancelled.\n- error: There was an error with the fulfillment request.\n- failure: The fulfillment request failed.",
    },
    tracking_company: {
      type: coda.ValueType.String,
      fixedId: 'tracking_company',
      fromKey: 'tracking_company',
      description: 'The name of the tracking company.',
    },
    tracking_numbers: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.String },
      fixedId: 'tracking_numbers',
      fromKey: 'tracking_numbers',
      description: 'A list of tracking numbers provided by the shipping company.',
    },
    tracking_number: {
      type: coda.ValueType.String,
      fixedId: 'tracking_number',
      fromKey: 'tracking_number',
      description:
        'A tracking number provided by the shipping company. If multiple tracking numbers are set on this fulfillment, only the first one will be returned in the tracking_number field. Use the tracking_numbers array field to access all tracking numbers associated with this fulfillment.',
    },
    tracking_urls: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
      fixedId: 'tracking_urls',
      fromKey: 'tracking_urls',
      description: 'The URLs of tracking pages for the fulfillment.',
    },
    tracking_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'tracking_url',
      fromKey: 'tracking_url',
      description:
        'The URL to track the fulfillment. If multiple tracking urls are set on this fulfillment, only the first one will be returned in the tracking_url field. Use the tracking_urls array field for accessing all tracking URLs associated with this fulfillment.',
    },
    // The URLs of tracking pages for the fulfillment.
    // The date and time (ISO 8601 format) when the fulfillment was last modified..
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the fulfillment was last modified.',
    },
  },
  displayProperty: 'name',
});

const OrderAdjustmentSchema = coda.makeObjectSchema({
  properties: {
    order_adjustment_id: {
      type: coda.ValueType.Number,
      fixedId: 'order_adjustment_id',
      fromKey: 'id',
      useThousandsSeparator: false,
      description: 'The unique identifier for the order adjustment',
    },
    order_id: {
      type: coda.ValueType.Number,
      fixedId: 'order_id',
      fromKey: 'order_id',
      description: 'The unique identifier for the order that the order adjustment is associated with.',
    },
    refund_id: {
      type: coda.ValueType.Number,
      fixedId: 'refund_id',
      fromKey: 'refund_id',
      description: 'The unique identifier for the refund that the order adjustment is associated with.',
    },
    kind: {
      type: coda.ValueType.String,
      fixedId: 'kind',
      fromKey: 'kind',
      description: 'The order adjustment type. Valid values:\n- shipping_refund\n- refund_discrepancy.',
    },
    reason: {
      type: coda.ValueType.String,
      fixedId: 'reason',
      fromKey: 'reason',
      description:
        'The reason for the order adjustment. To set this value, include discrepancy_reason when you create a refund.',
    },
    amount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'amount',
      fromKey: 'amount',
      description:
        "The value of the discrepancy between the calculated refund and the actual refund. If the kind property's value is shipping_refund, then amount returns the value of shipping charges refunded to the customer.",
    },
    /*
    amount_set: {
      ...PriceSetSchema,
      fixedId: 'amount_set',
      fromKey: 'amount_set',
      description: 'The amount of the order adjustment in shop and presentment currencies.',
    },
    */
    tax_amount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'tax_amount',
      fromKey: 'tax_amount',
      description: 'The taxes that are added to amount, such as applicable shipping taxes added to a shipping refund.',
    },
    /*
    tax_amount_set: {
      ...PriceSetSchema,
      fixedId: 'tax_amount_set',
      fromKey: 'tax_amount_set',
      description: 'The tax amount of the order adjustment in shop and presentment currencies.',
    },
    */
  },
  displayProperty: 'order_adjustment_id',
});

const CurrencyExchangeAdjustmentSchema = coda.makeObjectSchema({
  properties: {
    currency_exchange_adjustment_id: {
      type: coda.ValueType.Number,
      fixedId: 'currency_exchange_adjustment_id',
      fromKey: 'id',
      useThousandsSeparator: false,
      description: 'The ID of the adjustment.',
    },
    adjustment: {
      type: coda.ValueType.Number,
      fixedId: 'adjustment',
      fromKey: 'adjustment',
      description: 'The difference between the amounts on the associated transaction and the parent transaction.',
    },
    original_amount: {
      type: coda.ValueType.Number,
      fixedId: 'original_amount',
      fromKey: 'original_amount',
      description: 'The amount of the parent transaction in the shop currency.',
    },
    final_amount: {
      type: coda.ValueType.Number,
      fixedId: 'final_amount',
      fromKey: 'final_amount',
      description: 'The amount of the associated transaction in the shop currency.',
    },
    currency: {
      type: coda.ValueType.String,
      fixedId: 'currency',
      fromKey: 'currency',
      description: 'The shop currency.',
    },
  },
  displayProperty: 'order_adjustment_id',
});

// Schedules associated to payment terms.
const PaymentSchedulesSchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number, description: 'The amount that is owed according to the payment terms.' },
    currency: { type: coda.ValueType.String, description: 'The presentment currency for the payment.' },
    issued_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the payment terms were initiated.',
    },
    due_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description:
        'The date and time when the payment is due. Calculated based on issued_at and due_in_days or a customized fixed date if the type is fixed.',
    },
    completed_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description:
        'The date and time when the purchase is completed. Returns null initially and updates when the payment is captured.',
    },
    expected_payment_method: { type: coda.ValueType.String, description: 'The name of the payment method gateway.' },
  },
  displayProperty: 'amount',
});

// The terms and conditions under which a payment should be processed.
const PaymentTermsSchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number, description: 'The amount that is owed according to the payment terms.' },
    currency: { type: coda.ValueType.String, description: 'The presentment currency for the payment.' },
    payment_terms_name: {
      type: coda.ValueType.String,
      description: 'The name of the selected payment terms template for the order.',
    },
    payment_terms_type: {
      type: coda.ValueType.String,
      description: 'e type of selected payment terms template for the order.',
    },
    due_in_days: {
      type: coda.ValueType.Number,
      description:
        'The number of days between the invoice date and due date that is defined in the selected payment terms template.',
    },
    payment_schedules: {
      type: coda.ValueType.Array,
      items: PaymentSchedulesSchema,
      description: 'An array of schedules associated to the payment terms.',
    },
  },
  displayProperty: 'payment_terms_name',
});

const PaymentDetailsSchema = coda.makeObjectSchema({
  properties: {
    credit_card_bin: {
      type: coda.ValueType.String,
      fromKey: 'credit_card_bin',
      fixedId: 'credit_card_bin',
      description:
        "The issuer identification number (IIN), formerly known as bank identification number (BIN) of the customer's credit card. This is made up of the first few digits of the credit card number.",
    },
    avs_result_code: {
      type: coda.ValueType.String,
      fixedId: 'avs_result_code',
      fromKey: 'avs_result_code',
      description:
        'The response code from the address verification system. The code is always a single letter. Refer to this chart for the codes and their definitions.',
    },
    cvv_result_code: {
      type: coda.ValueType.String,
      fixedId: 'cvv_result_code',
      fromKey: 'cvv_result_code',
      description:
        'The response code from the credit card company indicating whether the customer entered the card security code, or card verification value, correctly. The code is a single letter or empty string; see this chart for the codes and their definitions.',
    },
    credit_card_number: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_number',
      fromKey: 'credit_card_number',
      description: "The customer's credit card number, with most of the leading digits redacted.",
    },
    credit_card_company: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_company',
      fromKey: 'credit_card_company',
      description: "The name of the company that issued the customer's credit card.",
    },
    credit_card_name: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_name',
      fromKey: 'credit_card_name',
      description: 'The holder of the credit card.',
    },
    credit_card_wallet: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_wallet',
      fromKey: 'credit_card_wallet',
      description: 'The wallet type where this credit card was retrieved from.',
    },
    credit_card_expiration_month: {
      type: coda.ValueType.Number,
      fixedId: 'credit_card_expiration_month',
      fromKey: 'credit_card_expiration_month',
      description: 'The month in which the credit card expires.',
    },
    credit_card_expiration_year: {
      type: coda.ValueType.Number,
      fixedId: 'credit_card_expiration_year',
      fromKey: 'credit_card_expiration_year',
      description: 'The year in which the credit card expires.',
    },
    // TODO: buyer_action_info
    /*
    Example return value, but need to find the correct exact schema. On dirait que la clé dépend de payment_method_name
        "buyer_action_info": {
          "multibanco": {
            "Entity": "12345",
            "Reference": "999999999"
          }
        },
    */
    /*
    buyer_action_info: {
      type: coda.ValueType.String,
      fixedId: 'buyer_action_info',
      fromKey: 'buyer_action_info',
      useThousandsSeparator: false,
      description:
        'Details for payment methods that require additional buyer action to complete the order transaction.',
    },
    */
    payment_method_name: {
      type: coda.ValueType.String,
      fixedId: 'payment_method_name',
      fromKey: 'payment_method_name',
      description: 'The name of the payment method used by the buyer to complete the order transaction.',
    },
  },
  displayProperty: 'payment_method_name',
});

const TransactionSchema = coda.makeObjectSchema({
  properties: {
    transaction_id: {
      type: coda.ValueType.Number,
      fixedId: 'transaction_id',
      fromKey: 'id',
      useThousandsSeparator: false,
      description: 'The ID for the transaction.',
    },
    amount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      description:
        "The amount of money included in the transaction. If you don't provide a value for `amount`, then it defaults to the total cost of the order (even if a previous transaction has been made towards it).",
    },
    authorization: {
      type: coda.ValueType.String,
      description: 'The authorization code associated with the transaction.',
    },
    authorization_expires_at: {
      type: coda.ValueType.String,
      description: 'The date and time when the Shopify Payments authorization expires.',
    },
    created_at: { type: coda.ValueType.String, description: 'The date and time when the transaction was created.' },
    currency: {
      type: coda.ValueType.String,
      description: 'The three-letter code (ISO 4217 format) for the currency used for the payment.',
    },
    device_id: { type: coda.ValueType.Number, useThousandsSeparator: false, description: 'The ID for the device.' },
    error_code: {
      type: coda.ValueType.String,
      description:
        'A standardized error code, independent of the payment provider. Valid values:\n- incorrect_number\n- invalid_number\n- invalid_expiry_date\n- invalid_cvc\n- expired_card\n- incorrect_cvc\n- incorrect_zip\n- incorrect_address\n- card_declined\n- processing_error\n- call_issuer\n- pick_up_card',
    },
    extended_authorization_attributes: {
      ...ExtendedAuthorizationAttributesSchema,
      fixedId: 'extended_authorization_attributes',
      fromKey: 'extended_authorization_attributes',
      description:
        'The attributes associated with a Shopify Payments extended authorization period. Available only if the following criteria applies:\n- The store is on a Shopify Plus plan.\n- The store uses Shopify Payments.\n- The transaction being retrieved is an extended authorization',
    },
    gateway: {
      type: coda.ValueType.String,
      fixedId: 'gateway',
      fromKey: 'gateway',
      description: 'The name of the gateway the transaction was issued through',
    },
    kind: {
      type: coda.ValueType.String,
      fixedId: 'kind',
      fromKey: 'kind',
      description:
        "The transaction's type. Valid values:\n- authorization: Money that the customer has agreed to pay. The authorization period can be between 7 and 30 days (depending on your payment service) while a store waits for a payment to be captured.\n- capture: A transfer of money that was reserved during the authorization of a shop.\n- sale: The authorization and capture of a payment performed in one single step.\n- void: The cancellation of a pending authorization or capture.\n- refund: The partial or full return of captured money to the customer.",
    },
    location_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'location_id',
      fromKey: 'location_id',
      description: 'The ID of the physical location where the transaction was processed.',
    },
    message: {
      type: coda.ValueType.String,
      fixedId: 'message',
      fromKey: 'message',
      description:
        'A string generated by the payment provider with additional information about why the transaction succeeded or failed.',
    },
    order_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'order_id',
      fromKey: 'order_id',
      description: 'The ID for the order that the transaction is associated with.',
    },
    payment_details: {
      ...PaymentDetailsSchema,
      fixedId: 'payment_details',
      fromKey: 'payment_details',
      description: 'payment_details.',
    },
    parent_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'parent_id',
      fromKey: 'parent_id',
      description: 'The ID of an associated transaction.',
    },
    // payments_refund_attributes: {
    //   type: coda.ValueType.Number,
    //   useThousandsSeparator: false,
    //   fixedId: 'payments_refund_attributes',
    //   fromKey: 'payments_refund_attributes',
    //   description: 'The attributes associated with a Shopify Payments refund.',
    // },
    processed_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'processed_at',
      fromKey: 'processed_at',
      description: 'The date and time when a transaction was processed.',
    },
    // TODO: implement this
    /*
    receipt: {
      type: coda.ValueType.String,
      fixedId: 'receipt',
      fromKey: 'receipt',
      description:
        'A transaction receipt attached to the transaction by the gateway. The value of this field depends on which gateway the shop is using.',
    },
    */
    source_name: {
      type: coda.ValueType.String,
      fixedId: 'source_name',
      fromKey: 'source_name',
      description: 'The origin of the transaction.',
    },
    status: {
      type: coda.ValueType.String,
      fixedId: 'status',
      fromKey: 'status',
      description: 'The status of the transaction. Valid values:\n- pending\n- failure\n- success\n- error.',
    },
    // TODO: add this to format it from total_unsettled_set in a formatTransaction function
    total_unsettled: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_unsettled',
      description:
        'Specifies the available amount to capture on the gateway in shop currency. Only available when an amount is capturable or manually mark as paid.',
    },
    /*
    total_unsettled_set: {
      ...PriceSetSchema,
      fixedId: 'total_unsettled_set',
      fromKey: 'total_unsettled_set',
      description:
        'Specifies the available amount with currency to capture on the gateway in shop and presentment currencies. Only available when an amount is capturable or manually mark as paid.',
    },
    */
    test: {
      type: coda.ValueType.Boolean,
      fixedId: 'test',
      fromKey: 'test',
      description: 'Whether the transaction is a test transaction.',
    },
    user_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'user_id',
      fromKey: 'user_id',
      description:
        'The ID for the user who was logged into the Shopify POS device when the order was processed, if applicable.',
    },
    // ! Requires the header X-Shopify-Api-Features = include-currency-exchange-adjustments.
    /*
    currency_exchange_adjustment: {
      ...CurrencyExchangeAdjustmentSchema,
      fixedId: 'currency_exchange_adjustment',
      fromKey: 'currency_exchange_adjustment',
      description:
        'An adjustment on the transaction showing the amount lost or gained due to fluctuations in the currency exchange rate.',
    },
    */
  },
  displayProperty: 'transaction_id',
});

// A list of refunded line items.
const RefundLineItemSchema = coda.makeObjectSchema({
  properties: {
    refund_line_item_id: {
      type: coda.ValueType.Number,
      fixedId: 'refund_line_item_id',
      fromKey: 'id',
      useThousandsSeparator: false,
      description: 'The unique identifier of the line item in the refund.',
    },
    /*
    line_item: {
      type: coda.ValueType.Number,
      fixedId: 'line_item',
      fromKey: 'line_item',
      useThousandsSeparator: false,
      description: 'A line item being refunded.',
    },
    */
    line_item_id: {
      type: coda.ValueType.Number,
      fixedId: 'line_item_id',
      fromKey: 'line_item_id',
      useThousandsSeparator: false,
      description: 'The ID of the related line item in the order.',
    },
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The refunded quantity of the associated line item.',
    },
    restock_type: {
      type: coda.ValueType.String,
      fixedId: 'restock_type',
      fromKey: 'restock_type',
      description:
        "How this refund line item affects inventory levels. Valid values:\n- no_restock: Refunding these items won't affect inventory. The number of fulfillable units for this line item will remain unchanged. For example, a refund payment can be issued but no items will be refunded or made available for sale again.\n- cancel: The items have not yet been fulfilled. The canceled quantity will be added back to the available count. The number of fulfillable units for this line item will decrease.\n- return: The items were already delivered, and will be returned to the merchant. The refunded quantity will be added back to the available count. The number of fulfillable units for this line item will remain unchanged.\n- legacy_restock: The deprecated restock property was used for this refund. These items were made available for sale again. This value is not accepted when creating new refunds.",
    },
    location_id: {
      type: coda.ValueType.Number,
      fixedId: 'location_id',
      fromKey: 'location_id',
      useThousandsSeparator: false,
      description:
        'The unique identifier of the location where the items will be restocked. Required when restock_type has the value return or cancel.',
    },
    subtotal: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'subtotal',
      fromKey: 'subtotal',
      description: 'The subtotal of the refund line item.',
    },
    /*
    subtotal_set: {
      ...PriceSetSchema,
      fixedId: 'subtotal_set',
      fromKey: 'subtotal_set',
      description: 'The subtotal of the refund line item in shop and presentment currencies.',
    },
    */
    total_tax: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'total_tax',
      fromKey: 'total_tax',
      description: 'The total tax on the refund line item.',
    },
    /*
    total_tax_set: {
      ...PriceSetSchema,
      fixedId: 'total_tax_set',
      fromKey: 'total_tax_set',
      description: 'The total tax of the line item in shop and presentment currencies.',
    },
    */
  },
  displayProperty: 'refund_line_item_id',
});

// A list of refunded duties.
const RefundDutySchema = coda.makeObjectSchema({
  properties: {
    duty_id: {
      type: coda.ValueType.Number,
      fixedId: 'duty_id',
      fromKey: 'duty_id',
      useThousandsSeparator: false,
      description: 'The unique identifier of the duty.',
    },
    refund_type: {
      type: coda.ValueType.String,
      fixedId: 'refund_type',
      fromKey: 'refund_type',
      description:
        'Specifies how you want the duty refunded.Valid values:\n- FULL: Refunds all the duties associated with a duty ID. You do not need to include refund line items if you are using the full refund type.\n- PROPORTIONAL: Refunds duties in proportion to the line item quantity that you want to refund. If you choose the proportional refund type, then you must also pass the refund line items to calculate the portion of duties to refund.',
    },
  },
  displayProperty: 'duty_id',
});

// A list of refunds applied to the order.
const RefundSchema = coda.makeObjectSchema({
  properties: {
    refund_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'refund_id',
      useThousandsSeparator: false,
      description: 'The unique identifier for the refund.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the refund was created.',
    },
    duties: {
      type: coda.ValueType.Array,
      items: DutySchema,
      fixedId: 'duties',
      fromKey: 'duties',
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
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
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
      items: TransactionSchema,
      fixedId: 'transactions',
      fromKey: 'transactions',
      description:
        'A list of transactions involved in the refund. A single order can have multiple transactions associated with it.',
    },
    user_id: {
      type: coda.ValueType.Number,
      fixedId: 'user_id',
      fromKey: 'user_id',
      useThousandsSeparator: false,
      description: 'The unique identifier of the user who performed the refund.',
    },
  },
  displayProperty: 'refund_id',
});

// An array of objects, each of which details a shipping method used.
const ShippingLineSchema = coda.makeObjectSchema({
  properties: {
    shipping_line_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'shipping_line_id',
      useThousandsSeparator: false,
      description: 'The ID of the shipping line.',
    },
    code: {
      type: coda.ValueType.String,
      fixedId: 'code',
      fromKey: 'code',
      description: 'A reference to the shipping method.',
    },
    discounted_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'discounted_price',
      fromKey: 'discounted_price',
      description:
        "The price of the shipping method after line-level discounts have been applied. Doesn't reflect cart-level or order-level discounts.",
    },
    /*
    discounted_price_set: {
      ...PriceSetSchema,
      fixedId: 'discounted_price_set',
      fromKey: 'discounted_price_set',
      description:
        'The price of the shipping method in both shop and presentment currencies after line-level discounts have been applied',
    },
    */
    price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'price',
      fromKey: 'price',
      description: "The price of this shipping method in the shop currency. Can't be negative.",
    },
    /*
    price_set: {
      ...PriceSetSchema,
      fixedId: 'price_set',
      fromKey: 'price_set',
      description: 'The price of the shipping method in shop and presentment currencies.',
    },
    */
    source: {
      type: coda.ValueType.String,
      fixedId: 'source',
      fromKey: 'source',
      description: 'The source of the shipping method.',
    },
    title: {
      type: coda.ValueType.String,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The title of the shipping method.',
    },
    tax_lines: {
      type: coda.ValueType.Array,
      items: TaxLineSchema,
      fixedId: 'tax_lines',
      fromKey: 'tax_lines',
      description: 'A list of tax line objects, each of which details a tax applicable to this shipping line.',
    },
    carrier_identifier: {
      type: coda.ValueType.String,
      fixedId: 'carrier_identifier',
      fromKey: 'carrier_identifier',
      description:
        'A reference to the carrier service that provided the rate. Present when the rate was computed by a third-party carrier service.',
    },
    // TODO: string or number ?
    requested_fulfillment_service_id: {
      type: coda.ValueType.Number,
      fixedId: 'requested_fulfillment_service_id',
      fromKey: 'requested_fulfillment_service_id',
      description:
        'A reference to the fulfillment service that is being requested for the shipping method. Present if the shipping method requires processing by a third party fulfillment service; null otherwise.',
    },
  },
  displayProperty: 'title',
  idProperty: 'shipping_line_id',
});

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const OrderSchema = coda.makeObjectSchema({
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
    order_id: {
      type: coda.ValueType.Number,
      required: true,
      fromKey: 'id',
      fixedId: 'order_id',
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
      ...BaseAddressSchema,
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
      items: LineItemSchema,
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
      description: "The order's position in the shop's count of orders. Numbers are sequential and start at 1.",
    },
    order_number: {
      type: coda.ValueType.Number,
      fixedId: 'order_number',
      fromKey: 'order_number',
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
      ...BaseAddressSchema,
      fixedId: 'shipping_address',
      fromKey: 'shipping_address',
      description:
        'The mailing address to where the order will be shipped. This address is optional and will not be available on orders that do not require shipping',
    },
    shipping_lines: {
      type: coda.ValueType.Array,
      items: ShippingLineSchema,
      fixedId: 'shipping_lines',
      fromKey: 'shipping_lines',
      description: 'An array of objects, each of which details a shipping method used',
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
  idProperty: 'order_id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['order_id', 'customer', 'shipping_lines', 'line_items'],
});
export const orderFieldDependencies: FieldDependency<typeof OrderSchema.properties>[] = [
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
export const OrderReference = coda.makeReferenceSchemaFromObjectSchema(OrderSchema, IDENTITY_ORDER);
