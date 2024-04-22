import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const OrderAdjustmentSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('order adjustment'),
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
      description:
        'The order adjustment type. Valid values:\n' + ['- shipping_refund', '- refund_discrepancy.'].join('\n'),
    },
    reason: {
      type: coda.ValueType.String,
      fixedId: 'reason',
      fromKey: 'reason',
      description:
        'The reason for the order adjustment. To set this value, include discrepancy_reason when you create a refund.',
    },
    amount: {
      ...PROPS.CURRENCY,
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
      ...PROPS.CURRENCY,
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
  displayProperty: 'id',
});
