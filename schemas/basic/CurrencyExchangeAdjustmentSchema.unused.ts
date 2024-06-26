import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

export const CurrencyExchangeAdjustmentSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('adjustment'),
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
  displayProperty: 'id',
});
