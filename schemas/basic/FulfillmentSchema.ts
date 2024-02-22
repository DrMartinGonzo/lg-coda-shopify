import * as coda from '@codahq/packs-sdk';
import { OrderLineItemSchema } from './OrderLineItemSchema';

export const FulfillmentSchema = coda.makeObjectSchema({
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
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      useThousandsSeparator: false,
      description: 'The ID for the fulfillment.',
    },
    line_items: {
      type: coda.ValueType.Array,
      items: OrderLineItemSchema,
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
