import * as coda from '@codahq/packs-sdk';

export const LocalPickupSettingsSchema = coda.makeObjectSchema({
  properties: {
    instructions: {
      type: coda.ValueType.String,
      fixedId: 'instructions',
      description: 'Additional instructions or information related to the local pickup.',
    },
    pickupTime: {
      type: coda.ValueType.String,
      fixedId: 'pickup_time',
      description: 'The estimated pickup time to show customers at checkout.',
    },
  },
  displayProperty: 'instructions',
});
