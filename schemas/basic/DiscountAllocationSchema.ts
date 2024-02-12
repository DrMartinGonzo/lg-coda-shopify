import * as coda from '@codahq/packs-sdk';

export const DiscountAllocationSchema = coda.makeObjectSchema({
  properties: {
    amount: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'amount',
      fromKey: 'amount',
    },
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
