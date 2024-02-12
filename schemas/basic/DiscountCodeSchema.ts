import * as coda from '@codahq/packs-sdk';

export const DiscountCodeSchema = coda.makeObjectSchema({
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
