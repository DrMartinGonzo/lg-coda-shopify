import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const DiscountAllocationSchema = coda.makeObjectSchema({
  properties: {
    amount: {
      ...PROPS.CURRENCY,
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
