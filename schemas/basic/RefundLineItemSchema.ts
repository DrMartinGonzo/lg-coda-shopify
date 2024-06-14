import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

export const RefundLineItemSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('line item in the refund'),
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
      ...PROPS.ID_NUMBER,
      fixedId: 'line_item_id',
      fromKey: 'line_item_id',
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
      description: `How this refund line item affects inventory levels. Valid values:
- no_restock: Refunding these items won't affect inventory. The number of fulfillable units for this line item will remain unchanged. For example, a refund payment can be issued but no items will be refunded or made available for sale again.
- cancel: The items have not yet been fulfilled. The canceled quantity will be added back to the available count. The number of fulfillable units for this line item will decrease.
- return: The items were already delivered, and will be returned to the merchant. The refunded quantity will be added back to the available count. The number of fulfillable units for this line item will remain unchanged.
- legacy_restock: The deprecated restock property was used for this refund. These items were made available for sale again. This value is not accepted when creating new refunds.`,
    },
    location_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'location_id',
      fromKey: 'location_id',
      description:
        'The unique identifier of the location where the items will be restocked. Required when restock_type has the value return or cancel.',
    },
    subtotal: {
      ...PROPS.CURRENCY,
      fixedId: 'subtotal',
      fromKey: 'subtotal',
      description: 'The subtotal of the refund line item.',
    },
    total_tax: {
      ...PROPS.CURRENCY,
      fixedId: 'total_tax',
      fromKey: 'total_tax',
      description: 'The total tax on the refund line item.',
    },
  },
  displayProperty: 'id',
});
