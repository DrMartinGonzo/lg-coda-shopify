import * as coda from '@codahq/packs-sdk';
import { TaxLineSchema } from './TaxLineSchema';

/**
 * Details a shipping method used.
 */
export const ShippingLineSchema = coda.makeObjectSchema({
  properties: {
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
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
  idProperty: 'id',
});
