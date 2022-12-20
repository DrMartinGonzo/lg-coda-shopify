import * as coda from '@codahq/packs-sdk';

import { CustomerReference } from '../customers/customers-schema';

const AddressSchema = coda.makeObjectSchema({
  properties: {
    // The street address of the address.
    address1: { type: coda.ValueType.String },
    // An optional additional field for the street address of the address.
    address2: { type: coda.ValueType.String },
    // The city, town, or village of the address.
    city: { type: coda.ValueType.String },
    // The company of the person associated with the address.
    company: { type: coda.ValueType.String },
    // The name of the country of the address.
    country: { type: coda.ValueType.String },
    // The two-letter code (ISO 3166-1 format) for the country of the address.
    country_code: { type: coda.ValueType.String },
    // The first name of the person.
    first_name: { type: coda.ValueType.String },
    // The last name of the person.
    last_name: { type: coda.ValueType.String },
    // The full name of the person.
    name: { type: coda.ValueType.String },
    // The latitude of the address.
    latitude: { type: coda.ValueType.String },
    // The longitude of the address.
    longitude: { type: coda.ValueType.String },
    // The phone number at the address.
    phone: { type: coda.ValueType.String },
    // province: The name of the region (for example, province, state, or prefecture) of the address.
    province: { type: coda.ValueType.String },
    // province_code: The two-letter abbreviation of the region of the address.
    province_code: { type: coda.ValueType.String },
    // The postal code (for example, zip, postcode, or Eircode) of the address.
    zip: { type: coda.ValueType.String },
  },
  displayProperty: 'address1',
  // idProperty: 'amount',
  // featuredProperties: ['amount'],
});

const MoneySchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number },
    currency_code: { type: coda.ValueType.String },
  },
  displayProperty: 'amount',
  // idProperty: 'amount',
  // featuredProperties: ['amount'],
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
  // idProperty: 'shop_money',
  // featuredProperties: ['shop_money'],
});

const TaxLineSchema = coda.makeObjectSchema({
  properties: {
    // The name of the tax.
    title: { type: coda.ValueType.String },
    // The amount of tax to be charged in the shop currency.
    price: { type: coda.ValueType.Number },
    price_set: PriceSetSchema,
    // The rate of tax to be applied.
    rate: { type: coda.ValueType.Number },
    // Whether the channel that submitted the tax line is liable for remitting. A value of null indicates unknown liability for the tax line.
    channel_liable: { type: coda.ValueType.Boolean },
  },
  displayProperty: 'price',
  // idProperty: 'price',
  // featuredProperties: ['price'],
});

// Information about the browser that the customer used when they placed their order:
const ClientDetailsSchema = coda.makeObjectSchema({
  properties: {
    // The languages and locales that the browser understands.
    accept_language: { type: coda.ValueType.String },
    // The browser screen height in pixels, if available.
    browser_height: { type: coda.ValueType.String },
    // The browser IP address.
    browser_ip: { type: coda.ValueType.String },
    // Details of the browsing client, including software and operating versions.
    user_agent: { type: coda.ValueType.String },
    // The browser screen width in pixels, if available.
    browser_width: { type: coda.ValueType.String },
    // A hash of the session.
    session_hash: { type: coda.ValueType.String },
  },
  displayProperty: 'user_agent',
});

const DiscountAllocationSchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number },
    amount_set: PriceSetSchema,
    discount_application_index: { type: coda.ValueType.Number },
  },
  displayProperty: 'amount',
  // idProperty: 'amount',
  // featuredProperties: ['amount'],
});

const DiscountApplicationSchema = coda.makeObjectSchema({
  properties: {
    allocation_method: { type: coda.ValueType.String },
    code: { type: coda.ValueType.String },
    description: { type: coda.ValueType.String },
    target_selection: { type: coda.ValueType.String },
    target_type: { type: coda.ValueType.String },
    title: { type: coda.ValueType.String },
    type: { type: coda.ValueType.String },
    value: { type: coda.ValueType.String },
    value_type: { type: coda.ValueType.String },
  },
  displayProperty: 'code',
});

const DiscountCodeSchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number },
    code: { type: coda.ValueType.String },
    type: { type: coda.ValueType.String },
  },
  displayProperty: 'code',
});

const DutySchema = coda.makeObjectSchema({
  properties: {
    duty_id: { type: coda.ValueType.Number, fromKey: 'id' },
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
    country_code_of_origin: { type: coda.ValueType.String },
    harmonized_system_code: { type: coda.ValueType.String },
    // admin_graphql_api_id: { type: coda.ValueType.String },
    // price: { type: coda.ValueType.Number },
  },
  displayProperty: 'duty_id',
});

const LineItemSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */
    /*
      origin_location: {
        type: coda.ValueType.Object,
        properties: {
          address1: { type: coda.ValueType.String },
          address2: { type: coda.ValueType.String },
          city: { type: coda.ValueType.String },
          country_code: { type: coda.ValueType.String },
          location_id: { type: coda.ValueType.Number, fromKey: 'id' },
          name: { type: coda.ValueType.String },
          province_code: { type: coda.ValueType.String },
          zip: { type: coda.ValueType.String },
        },
      },
     */
    line_item_id: { type: coda.ValueType.Number, fromKey: 'id' },
    fulfillable_quantity: { type: coda.ValueType.Number },
    fulfillment_service: { type: coda.ValueType.String },
    fulfillment_status: { type: coda.ValueType.String },
    grams: { type: coda.ValueType.Number },
    price: { type: coda.ValueType.Number },
    price_set: PriceSetSchema,
    product_id: { type: coda.ValueType.Number },
    quantity: { type: coda.ValueType.Number },
    requires_shipping: { type: coda.ValueType.Boolean },
    sku: { type: coda.ValueType.Boolean },
    title: { type: coda.ValueType.String },
    variant_id: { type: coda.ValueType.Number },
    variant_title: { type: coda.ValueType.String },
    vendor: { type: coda.ValueType.String },
    name: { type: coda.ValueType.String },
    gift_card: { type: coda.ValueType.Boolean },
    properties: { type: coda.ValueType.Array, items: NameValueSchema },
    taxable: { type: coda.ValueType.Boolean },
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
    tip_payment_gateway: { type: coda.ValueType.String },
    tip_payment_method: { type: coda.ValueType.String },
    total_discount: { type: coda.ValueType.String },
    total_discount_set: PriceSetSchema,
    discount_allocations: { type: coda.ValueType.Array, items: DiscountAllocationSchema },

    duties: {
      type: coda.ValueType.Array,
      items: DutySchema,
    },

    // admin_graphql_api_id: { type: coda.ValueType.String },
    product_exists: { type: coda.ValueType.Boolean },
    variant_inventory_management: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
  idProperty: 'line_item_id',
});

const FulfillmentSchema = coda.makeObjectSchema({
  properties: {
    /**
     * Disabled
     */
    /*
    admin_graphql_api_id: { type: coda.ValueType.String },
    */

    // The date and time when the fulfillment was created. The API returns this value in ISO 8601 format.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The ID for the fulfillment.
    fulfillment_id: { type: coda.ValueType.Number, fromKey: 'id' },
    // A list of the fulfillment's line items
    line_items: { type: coda.ValueType.Array, items: LineItemSchema },
    // The unique identifier of the location that the fulfillment was processed at.
    location_id: { type: coda.ValueType.Number },
    // The uniquely identifying fulfillment name, consisting of two parts
    // separated by a .. The first part represents the order name and the
    // second part represents the fulfillment number. The fulfillment
    // number automatically increments depending on how many fulfillments
    // are in an order
    name: { type: coda.ValueType.String },
    // Whether the customer should be notified. If set to true, then an email will be sent when the fulfillment is created or updated. For orders that were initially created using the API, the default value is false. For all other orders, the default value is true.
    notify_customer: { type: coda.ValueType.Boolean },
    // The unique numeric identifier for the order.
    order_id: { type: coda.ValueType.Number },
    // The address from which the fulfillment occurred:
    origin_address: {
      type: coda.ValueType.Object,
      properties: {
        // The street address of the fulfillment location.
        address1: { type: coda.ValueType.String },
        // The second line of the address. Typically the number of the apartment, suite, or unit.
        address2: { type: coda.ValueType.String },
        // The city of the fulfillment location.
        city: { type: coda.ValueType.String },
        country_code: { type: coda.ValueType.String },
        // The province of the fulfillment location.
        province_code: { type: coda.ValueType.String },
        // The zip code of the fulfillment location.
        zip: { type: coda.ValueType.String },
      },
    },
    // A text field that provides information about the receipt:
    receipt: {
      type: coda.ValueType.Object,
      properties: {
        // Whether the fulfillment was a testcase.
        testcase: { type: coda.ValueType.Boolean },
        // The authorization code.
        authorization: { type: coda.ValueType.String },
      },
    },
    // The fulfillment service associated with the fulfillment.
    service: { type: coda.ValueType.String },
    // The current shipment status of the fulfillment. Valid values:
    //  - label_printed: A label for the shipment was purchased and printed.
    //  - label_purchased: A label for the shipment was purchased, but not printed.
    //  - attempted_delivery: Delivery of the shipment was attempted, but unable to be completed.
    //  - ready_for_pickup: The shipment is ready for pickup at a shipping depot.
    //  - confirmed: The carrier is aware of the shipment, but hasn't received it yet.
    //  - in_transit: The shipment is being transported between shipping facilities on the way to its destination.
    //  - out_for_delivery: The shipment is being delivered to its final destination.
    //  - delivered: The shipment was succesfully delivered.
    //  - failure: Something went wrong when pulling tracking information for the shipment, such as the tracking number was invalid or the shipment was canceled.
    shipment_status: { type: coda.ValueType.String },
    // The status of the fulfillment. Valid values:
    //  - pending: Shopify has created the fulfillment and is waiting for the third-party fulfillment service to transition it to 'open' or 'success'.
    //  - open: The fulfillment has been acknowledged by the service and is in processing.
    //  - success: The fulfillment was successful.
    //  - cancelled: The fulfillment was cancelled.
    //  - error: There was an error with the fulfillment request.
    //  - failure: The fulfillment request failed.
    status: { type: coda.ValueType.String },
    // The name of the tracking company. The following tracking companies display for shops located in any country:

    tracking_company: { type: coda.ValueType.String },
    tracking_number: { type: coda.ValueType.String },
    // A list of tracking numbers, provided by the shipping company.
    tracking_numbers: { type: coda.ValueType.Array, items: { type: coda.ValueType.String } },
    tracking_url: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
    // The URLs of tracking pages for the fulfillment.
    tracking_urls: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
    },
    // The date and time (ISO 8601 format) when the fulfillment was last modified..
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The name of the inventory management service.
    variant_inventory_management: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
});

const OrderAdjustmentSchema = coda.makeObjectSchema({
  properties: {
    order_adjustment_id: { type: coda.ValueType.Number, fromKey: 'id' },
    order_id: { type: coda.ValueType.Number },
    refund_id: { type: coda.ValueType.Number },
    amount: { type: coda.ValueType.Number },
    tax_amount: { type: coda.ValueType.Number },
    kind: { type: coda.ValueType.String },
    reason: { type: coda.ValueType.String },
    amount_set: PriceSetSchema,
    tax_amount_set: PriceSetSchema,
  },
  displayProperty: 'order_adjustment_id',
});

// Schedules associated to payment terms.
const PaymentSchedulesSchema = coda.makeObjectSchema({
  properties: {
    // amount: The amount that is owed according to the payment terms.
    amount: { type: coda.ValueType.Number },
    // currency: The presentment currency for the payment.
    currency: { type: coda.ValueType.String },
    // issued_at: The date and time when the payment terms were initiated.
    issued_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // due_at: The date and time when the payment is due. Calculated based on issued_at and due_in_days or a customized fixed date if the type is fixed.
    due_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // completed_at: The date and time when the purchase is completed. Returns null initially and updates when the payment is captured.
    completed_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // expected_payment_method: The name of the payment method gateway.
    expected_payment_method: { type: coda.ValueType.String },
  },
  displayProperty: 'amount',
});

// The terms and conditions under which a payment should be processed.
const PaymentTermsSchema = coda.makeObjectSchema({
  properties: {
    // amount: The amount that is owed according to the payment terms.
    amount: { type: coda.ValueType.Number },
    // currency: The presentment currency for the payment.
    currency: { type: coda.ValueType.String },
    // payment_terms_name: The name of the selected payment terms template for the order.
    payment_terms_name: { type: coda.ValueType.String },
    // payment_terms_type: The type of selected payment terms template for the order.
    payment_terms_type: { type: coda.ValueType.String },
    // due_in_days: The number of days between the invoice date and due date that is defined in the selected payment terms template.
    due_in_days: { type: coda.ValueType.Number },
    // payment_schedules: An array of schedules associated to the payment terms.
    payment_schedules: { type: coda.ValueType.Array, items: PaymentSchedulesSchema },
  },
  displayProperty: 'payment_terms_name',
});

const TransactionSchema = coda.makeObjectSchema({
  properties: {
    transaction_id: { type: coda.ValueType.Number, fromKey: 'id' },
    amount: { type: coda.ValueType.Number },
    authorization: { type: coda.ValueType.String },
    authorization_expires_at: { type: coda.ValueType.String },
    created_at: { type: coda.ValueType.String },
    currency: { type: coda.ValueType.String },
    device_id: { type: coda.ValueType.Number },
    error_code: { type: coda.ValueType.String },
    extended_authorization_attributes: {
      type: coda.ValueType.Object,
      properties: {
        standard_authorization_expires_at: { type: coda.ValueType.String },
        extended_authorization_expires_at: { type: coda.ValueType.String },
      },
    },
    gateway: { type: coda.ValueType.String },
    kind: { type: coda.ValueType.String },
    location_id: { type: coda.ValueType.Number },
  },
  displayProperty: 'gateway',
});

// A list of refunded line items.
const RefundLineItemSchema = coda.makeObjectSchema({
  properties: {
    // The unique identifier of the line item in the refund.
    refund_line_item_id: { type: coda.ValueType.Number, fromKey: 'id' },
    // The ID of the related line item in the order.
    line_item_id: { type: coda.ValueType.Number },
    // The refunded quantity of the associated line item.
    quantity: { type: coda.ValueType.Number },
    // restock_type: How this refund line item affects inventory levels. Valid values:
    //  - no_restock: Refunding these items won't affect inventory. The number of fulfillable units for this line item will remain unchanged. For example, a refund payment can be issued but no items will be refunded or made available for sale again.
    //  - cancel: The items have not yet been fulfilled. The canceled quantity will be added back to the available count. The number of fulfillable units for this line item will decrease.
    //  - return: The items were already delivered, and will be returned to the merchant. The refunded quantity will be added back to the available count. The number of fulfillable units for this line item will remain unchanged.
    //  - legacy_restock: The deprecated restock property was used for this refund. These items were made available for sale again. This value is not accepted when creating new refunds.
    restock_type: { type: coda.ValueType.String },
    // The unique identifier of the location where the items will be restocked. Required when restock_type has the value return or cancel.
    location_id: { type: coda.ValueType.Number },
    // The subtotal of the refund line item.
    subtotal: { type: coda.ValueType.Number },
    // The total tax on the refund line item.
    total_tax: { type: coda.ValueType.Number },
    // The subtotal of the refund line item in shop and presentment currencies.
    subtotal_set: PriceSetSchema,
    // The total tax of the line item in shop and presentment currencies.
    total_tax_set: PriceSetSchema,
  },
  displayProperty: 'refund_line_item_id',
});

// A list of refunded duties.
const RefundDutySchema = coda.makeObjectSchema({
  properties: {
    // The unique identifier of the duty.
    duty_id: { type: coda.ValueType.Number },
    // Specifies how you want the duty refunded
    refund_type: { type: coda.ValueType.String },
  },
  displayProperty: 'duty_id',
});

// A list of refunds applied to the order.
const RefundSchema = coda.makeObjectSchema({
  properties: {
    // The unique identifier for the refund.
    refund_id: { type: coda.ValueType.Number, fromKey: 'id' },
    // The date and time (ISO 8601 format) when the refund was created.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // A list of duties that have been reimbursed as part of the refund.
    duties: { type: coda.ValueType.Array, items: DutySchema },
    // An optional note attached to a refund.
    note: { type: coda.ValueType.String },
    // A list of order adjustments attached to the refund. Order adjustments are generated to account for refunded shipping costs and differences between calculated and actual refund amounts.
    order_adjustments: { type: coda.ValueType.Array, items: OrderAdjustmentSchema },
    // The date and time (ISO 8601 format) when the refund was imported. This value can be set to a date in the past when importing from other systems. If no value is provided, then it will be auto-generated as the current time in Shopify. Public apps need to be granted permission by Shopify to import orders with the processed_at timestamp set to a value earlier the created_at timestamp. Private apps can't be granted permission by Shopify.
    processed_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // A list of refunded duties.
    refund_duties: { type: coda.ValueType.Array, items: RefundDutySchema },
    // A list of refunded line items.
    refund_line_items: { type: coda.ValueType.Array, items: RefundLineItemSchema },
    // A list of transactions involved in the refund. A single order can have multiple transactions associated with it. For more information, see the Transaction resource.
    transactions: { type: coda.ValueType.Array, items: TransactionSchema },
    // The unique identifier of the user who performed the refund.
    user_id: { type: coda.ValueType.Number },
  },
  displayProperty: 'refund_id',
});

// An array of objects, each of which details a shipping method used.
const ShippingLineSchema = coda.makeObjectSchema({
  // requested_fulfillment_service_id: A reference to the fulfillment service that is being requested for the shipping method. Present if the shipping method requires processing by a third party fulfillment service; null otherwise.
  properties: {
    // The ID of shipping line
    shipping_line_id: { type: coda.ValueType.Number, fromKey: 'id' },
    // A reference to the shipping method.
    code: { type: coda.ValueType.String },
    // A reference to the carrier service that provided the rate. Present when the rate was computed by a third-party carrier service.
    carrier_identifier: { type: coda.ValueType.String },
    // The price of the shipping method after line-level discounts have been applied. Doesn't reflect cart-level or order-level discounts.
    discounted_price: { type: coda.ValueType.Number },
    // The price of the shipping method in both shop and presentment currencies after line-level discounts have been applied.
    discounted_price_set: PriceSetSchema,
    // The price of this shipping method in the shop currency. Can't be negative.
    price: { type: coda.ValueType.Number },
    // The price of the shipping method in shop and presentment currencies.
    price_set: PriceSetSchema,
    // The source of the shipping method.
    source: { type: coda.ValueType.String },
    // The title of the shipping method.
    title: { type: coda.ValueType.String },
    // A list of tax line objects, each of which details a tax applicable to this shipping line.
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
  },
  displayProperty: 'title',
  idProperty: 'shipping_line_id',
});

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const OrderSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */
    /*
    // The payment gateway used.
    gateway: { type: coda.ValueType.String },

    // An object containing information about the payment.
    payment_details: {
      type: coda.ValueType.Object,
      properties: {
        avs_result_code: { type: coda.ValueType.String },
        credit_card_bin: { type: coda.ValueType.String },
        credit_card_company: { type: coda.ValueType.String },
        credit_card_number: { type: coda.ValueType.String },
        cvv_result_code: { type: coda.ValueType.String },
      },
    },

    total_price_usd: { type: coda.ValueType.String },
    */

    /**
     * Disabled
     */
    /*
    admin_graphql_api_id: { type: coda.ValueType.String },
    */

    // The ID of the order, used for API purposes. This is different from the order_number property, which is the ID used by the shop owner and customer.'
    order_id: { type: coda.ValueType.Number, fromKey: 'id' },
    // The ID of the app that created the order.
    app_id: { type: coda.ValueType.Number },
    // The mailing address associated with the payment method. This address is an optional field that won't be available on orders that do not require a payment method.
    billing_address: AddressSchema,
    // The IP address of the browser used by the customer when they placed the order. Both IPv4 and IPv6 are supported.
    browser_ip: { type: coda.ValueType.String },
    // Whether the customer consented to receive email updates from the shop.
    buyer_accepts_marketing: { type: coda.ValueType.Boolean },
    // The reason why the order was canceled. Valid values:
    //  - Hide cancel_reason properties
    //  - customer: The customer canceled the order.
    //  - fraud: The order was fraudulent.
    //  - inventory: Items in the order were not in inventory.
    //  - declined: The payment was declined.
    //  - other: A reason not in this list.
    cancel_reason: { type: coda.ValueType.String },
    // The date and time when the order was canceled. Returns null if the order isn't canceled.
    cancelled_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // A unique value when referencing the cart that's associated with the order.
    cart_token: { type: coda.ValueType.String },
    // A unique value when referencing the checkout that's associated with the order.
    checkout_token: { type: coda.ValueType.String },
    // Information about the browser that the customer used when they placed their order:
    client_details: ClientDetailsSchema,
    // The date and time (ISO 8601 format) when the order was closed. Returns null if the order isn't closed.
    closed_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The autogenerated date and time (ISO 8601 format) when the order was created in Shopify. The value for this property cannot be changed.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The three-letter code (ISO 4217 format) for the shop currency.
    currency: { type: coda.ValueType.String },
    // The current total discounts on the order in the shop currency. The value of this field reflects order edits, returns, and refunds.
    current_total_discounts: { type: coda.ValueType.String },
    // The current total discounts on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.
    current_total_discounts_set: PriceSetSchema,
    // The current total duties charged on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.
    current_total_duties_set: PriceSetSchema,
    // The current total price of the order in the shop currency. The value of this field reflects order edits, returns, and refunds.
    current_total_price: { type: coda.ValueType.Number },
    // The current total price of the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.
    current_total_price_set: PriceSetSchema,
    // The current subtotal price of the order in the shop currency. The value of this field reflects order edits, returns, and refunds.
    current_subtotal_price: { type: coda.ValueType.Number },
    // The current subtotal price of the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.
    current_subtotal_price_set: PriceSetSchema,
    // The current total taxes charged on the order in the shop currency. The value of this field reflects order edits, returns, or refunds.
    current_total_tax: { type: coda.ValueType.String },
    // The current total taxes charged on the order in shop and presentment currencies. The amount values associated with this field reflect order edits, returns, and refunds.
    current_total_tax_set: PriceSetSchema,
    // Information about the customer. The order might not have a customer and apps should not depend on the existence of a customer object. This value might be null if the order was created through Shopify POS. For more information about the customer object, see the Customer resource.
    customer: CustomerReference,
    // The two or three-letter language code, optionally followed by a region modifier.
    customer_locale: { type: coda.ValueType.String },
    // An ordered list of stacked discount applications.
    discount_applications: { type: coda.ValueType.Array, items: DiscountApplicationSchema },
    // A list of discounts applied to the order. Each discount object includes the following properties:
    discount_codes: { type: coda.ValueType.Array, items: DiscountCodeSchema },
    // The customer's email address.
    email: { type: coda.ValueType.String, codaType: coda.ValueHintType.Email },
    // Whether taxes on the order are estimated. Many factors can change between the time a customer places an order and the time the order is shipped, which could affect the calculation of taxes. This property returns false when taxes on the order are finalized and aren't subject to any changes.
    estimated_taxes: { type: coda.ValueType.Boolean },
    // The status of payments associated with the order. Can only be set when the order is created. Valid values:
    //  - pending: The payments are pending. Payment might fail in this state. Check again to confirm whether the payments have been paid successfully.
    //  - authorized: The payments have been authorized.
    //  - partially_paid: The order has been partially paid.
    //  - paid: The payments have been paid.
    //  - partially_refunded: The payments have been partially refunded.
    //  - refunded: The payments have been refunded.
    //  - voided: The payments have been voided.
    financial_status: { type: coda.ValueType.String },
    // TODO
    // An array of fulfillments associated with the order. For more information, see the Fulfillment API.
    fulfillments: { type: coda.ValueType.Array, items: FulfillmentSchema },
    // The order's status in terms of fulfilled line items. You can use the FulfillmentOrder resource for a more granular view. Valid values:
    //  - fulfilled: Every line item in the order has been fulfilled.
    //  - null: None of the line items in the order have been fulfilled.
    //  - partial: At least one line item in the order has been fulfilled.
    //  - restocked: Every line item in the order has been restocked and the order canceled.
    fulfillment_status: { type: coda.ValueType.String },
    // The URL for the page where the buyer landed when they entered the shop.
    landing_site: { type: coda.ValueType.String },
    // A list of line item objects, each containing information about an item in the order.
    line_items: { type: coda.ValueType.Array, items: LineItemSchema },
    // The ID of the physical location where the order was processed. To determine the locations where the line items are assigned for fulfillment please use the FulfillmentOrder resource.
    location_id: { type: coda.ValueType.Number },
    // The order name, generated by combining the order_number property with the order prefix and suffix that are set in the merchant's general settings. This is different from the id property, which is the ID of the order used by the API. This field can also be set by the API to be any string value.
    name: { type: coda.ValueType.String },
    // An optional note that a shop owner can attach to the order.
    note: { type: coda.ValueType.String },
    // Extra information that is added to the order. Appears in the Additional details section of an order details page. Each array entry must contain a hash with name and value keys.
    note_attributes: { type: coda.ValueType.Array, items: NameValueSchema },
    // The order's position in the shop's count of orders. Numbers are sequential and start at 1.
    number: { type: coda.ValueType.Number },
    // The order 's position in the shop's count of orders starting at 1001. Order numbers are sequential and start at 1001.
    order_number: { type: coda.ValueType.Number },
    // The URL pointing to the order status web page, if applicable.
    order_status_url: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
    // The original total duties charged on the order in shop and presentment currencies.
    original_total_duties_set: PriceSetSchema,
    // The list of payment gateways used for the order.
    payment_gateway_names: { type: coda.ValueType.Array, items: { type: coda.ValueType.String } },
    // The terms and conditions under which a payment should be processed.
    payment_terms: PaymentTermsSchema,
    // The customer's phone number for receiving SMS notifications.
    phone: { type: coda.ValueType.String },
    // The presentment currency that was used to display prices to the customer.
    presentment_currency: { type: coda.ValueType.String },
    // The date and time (ISO 8601 format) when an order was processed. This value is the date that appears on your orders and that's used in the analytic reports. If you're importing orders from an app or another platform, then you can set processed_at to a date and time in the past to match when the original order was created.
    processed_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // How the payment was processed. It has the following valid values:
    //  - checkout: The order was processed using the Shopify checkout.
    //  - direct: The order was processed using a direct payment provider.
    //  - manual: The order was processed using a manual payment method.
    //  - offsite: The order was processed by an external payment provider to the Shopify checkout.
    //  - express: The order was processed using PayPal Express Checkout.
    //  - free: The order was processed as a free order using a discount code.
    processing_method: { type: coda.ValueType.String },
    // The website where the customer clicked a link to the shop.
    referring_site: { type: coda.ValueType.String },
    // A list of refunds applied to the order. For more information, see the Refund API.
    refunds: { type: coda.ValueType.Array, items: RefundSchema },
    // The mailing address to where the order will be shipped. This address is optional and will not be available on orders that do not require shipping.
    shipping_address: AddressSchema,
    // An array of objects, each of which details a shipping method used.
    shipping_lines: { type: coda.ValueType.Array, items: ShippingLineSchema },
    // The ID of the order placed on the originating platform. This value doesn't correspond to the Shopify ID that's generated from a completed draft.
    source_identifier: { type: coda.ValueType.String },
    // The source of the checkout. To use this field for sales attribution, you must register the channels that your app is managing. You can register the channels that your app is managing by completing this Google Form. After you've submited your request, you need to wait for your request to be processed by Shopify. You can find a list of your channels in the Partner Dashboard, in your app's Marketplace extension. You can specify a handle as the source_name value in your request.
    source_name: { type: coda.ValueType.String },
    // A valid URL to the original order on the originating surface. This URL is displayed to merchants on the Order Details page. If the URL is invalid, then it won't be displayed.
    source_url: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
    // The price of the order in the shop currency after discounts but before shipping, duties, taxes, and tips.
    subtotal_price: { type: coda.ValueType.Number },
    // The subtotal of the order in shop and presentment currencies after discounts but before shipping, duties, taxes, and tips.
    subtotal_price_set: PriceSetSchema,
    // Tags attached to the order, formatted as a string of comma-separated values. Tags are additional short descriptors, commonly used for filtering and searching. Each individual tag is limited to 40 characters in length.
    tags: { type: coda.ValueType.String },
    // An array of tax line objects, each of which details a tax applicable to the order.
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
    // Whether taxes are included in the order subtotal.
    taxes_included: { type: coda.ValueType.Boolean },
    // Whether this is a test order.
    test: { type: coda.ValueType.Boolean },
    // A unique value when referencing the order.
    token: { type: coda.ValueType.String },
    // The total discounts applied to the price of the order in the shop currency.
    total_discounts: { type: coda.ValueType.String },
    // The total discounts applied to the price of the order in shop and presentment currencies.
    total_discounts_set: PriceSetSchema,
    // The sum of all line item prices in the shop currency.
    total_line_items_price: { type: coda.ValueType.Number },
    // The total of all line item prices in shop and presentment currencies.
    total_line_items_price_set: PriceSetSchema,
    // The total outstanding amount of the order in the shop currency.
    total_outstanding: { type: coda.ValueType.String },
    // The sum of all line item prices, discounts, shipping, taxes, and tips in the shop currency. Must be positive.
    total_price: { type: coda.ValueType.String },
    // The total price of the order in shop and presentment currencies.
    total_price_set: PriceSetSchema,
    // The total shipping price of the order, excluding discounts and returns, in shop and presentment currencies. If taxes_included is set to true, then total_shipping_price_set includes taxes.
    total_shipping_price_set: PriceSetSchema,
    // The sum of all the taxes applied to the order in the shop currency. Must be positive.
    total_tax: { type: coda.ValueType.String },
    // The total tax applied to the order in shop and presentment currencies.
    total_tax_set: PriceSetSchema,
    // The sum of all the tips in the order in the shop currency.
    total_tip_received: { type: coda.ValueType.String },
    // The sum of all line item weights in grams. The sum is not adjusted as items are removed from the order.
    total_weight: { type: coda.ValueType.Number },
    // The date and time (ISO 8601 format) when the order was last modified.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The ID of the user logged into Shopify POS who processed the order, if applicable.
    user_id: { type: coda.ValueType.Number },

    // ??
    checkout_id: { type: coda.ValueType.Number },
    // ??
    confirmed: { type: coda.ValueType.Boolean },
    // ??
    contact_email: { type: coda.ValueType.String, codaType: coda.ValueHintType.Email },
    // ????
    reference: { type: coda.ValueType.String },
  },

  displayProperty: 'name',
  idProperty: 'order_id',
  featuredProperties: ['order_id', 'customer', 'shipping_lines', 'line_items'],
});
