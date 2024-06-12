import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import {
  addressAddress1,
  addressAddress2,
  addressCityProp,
  addressCountryCodeProp,
  addressProvinceCodeProp,
  addressZipProp,
} from './AddressSchema';
import { OrderLineItemSchema } from './OrderLineItemSchema';

export const FulfillmentSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: PROPS.makeGraphQlGidProp('fulfillment'),
    created_at: PROPS.makeCreatedAtProp('fulfillment'),
    id: PROPS.makeRequiredIdNumberProp('fulfillment'),
    line_items: {
      type: coda.ValueType.Array,
      items: OrderLineItemSchema,
      fixedId: 'line_items',
      fromKey: 'line_items',
      description: "A list of the fulfillment's line items",
    },
    location_id: {
      ...PROPS.ID_NUMBER,
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
      ...PROPS.ID_NUMBER,
      fixedId: 'order_id',
      fromKey: 'order_id',
      description: 'The unique numeric identifier for the order.',
    },
    origin_address: {
      type: coda.ValueType.Object,
      properties: {
        address1: addressAddress1,
        address2: addressAddress2,
        city: addressCityProp,
        country_code: addressCountryCodeProp,
        province_code: addressProvinceCodeProp,
        zip: addressZipProp,
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
      description: `The current shipment status of the fulfillment. Valid values:
- label_printed: A label for the shipment was purchased and printed.
- label_purchased: A label for the shipment was purchased, but not printed.
- attempted_delivery: Delivery of the shipment was attempted, but unable to be completed.
- ready_for_pickup: The shipment is ready for pickup at a shipping depot.
- confirmed: The carrier is aware of the shipment, but hasn't received it yet.
- in_transit: The shipment is being transported between shipping facilities on the way to its destination.
- out_for_delivery: The shipment is being delivered to its final destination.
- delivered: The shipment was succesfully delivered.
- failure: Something went wrong when pulling tracking information for the shipment, such as the tracking number was invalid or the shipment was canceled.`,
    },
    status: {
      type: coda.ValueType.String,
      fixedId: 'status',
      fromKey: 'status',
      description: `The status of the fulfillment. Valid values:
- pending: Shopify has created the fulfillment and is waiting for the third-party fulfillment service to transition it to 'open' or 'success'.
- open: The fulfillment has been acknowledged by the service and is in processing.
- success: The fulfillment was successful.
- cancelled: The fulfillment was cancelled.
- error: There was an error with the fulfillment request.
- failure: The fulfillment request failed.`,
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
      items: PROPS.LINK,
      fixedId: 'tracking_urls',
      fromKey: 'tracking_urls',
      description: 'The URLs of tracking pages for the fulfillment.',
    },
    tracking_url: {
      ...PROPS.LINK,
      fixedId: 'tracking_url',
      fromKey: 'tracking_url',
      description:
        'The URL to track the fulfillment. If multiple tracking urls are set on this fulfillment, only the first one will be returned in the tracking_url field. Use the tracking_urls array field for accessing all tracking URLs associated with this fulfillment.',
    },
    updated_at: PROPS.makeUpdatedAtProp('fulfillment'),
  },
  displayProperty: 'name',
});
