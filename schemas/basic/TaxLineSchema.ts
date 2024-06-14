import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

export const TaxLineSchema = coda.makeObjectSchema({
  properties: {
    title: PROPS.makeTitleProp('tax'),
    price: {
      ...PROPS.CURRENCY,
      fixedId: 'price',
      fromKey: 'price',
      description: 'The amount of tax to be charged in the shop currency.',
    },
    rate: {
      type: coda.ValueType.Number,
      fixedId: 'rate',
      fromKey: 'rate',
      description: 'The tax rate applied to the order to calculate the tax price.',
    },
    channel_liable: {
      type: coda.ValueType.Boolean,
      fixedId: 'channel_liable',
      fromKey: 'channel_liable',
      description:
        'Whether the channel that submitted the tax line is liable for remitting. A value of null indicates unknown liability for the tax line.',
    },
  },
  displayProperty: 'price',
});
