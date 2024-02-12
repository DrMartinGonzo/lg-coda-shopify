import * as coda from '@codahq/packs-sdk';

export const NameValueSchema = coda.makeObjectSchema({
  properties: {
    name: { type: coda.ValueType.String },
    value: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
});
