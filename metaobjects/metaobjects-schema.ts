import * as coda from '@codahq/packs-sdk';

export const MetaObjectSchema = coda.makeObjectSchema({
  properties: {
    gid: { type: coda.ValueType.String, required: true },
    name: { type: coda.ValueType.String },
    type: { type: coda.ValueType.String },
    data: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
  idProperty: 'gid',
  featuredProperties: ['gid', 'name', 'type', 'data'],
});
