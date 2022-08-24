import * as coda from '@codahq/packs-sdk';

export const ProductMetafieldSchema = coda.makeObjectSchema({
  properties: {
    metafield_id: { type: coda.ValueType.Number, required: true },
    unique_id: { type: coda.ValueType.String, required: true },
    namespace: { type: coda.ValueType.String, required: true },
    key: { type: coda.ValueType.String, required: true },
    value: { type: coda.ValueType.String, required: true },
    description: { type: coda.ValueType.String },
    owner_id: { type: coda.ValueType.Number, required: true },
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    owner_resource: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    type: { type: coda.ValueType.String, required: true },
    // admin_graphql_api_id: { type: coda.ValueType.String },
  },
  displayProperty: 'unique_id',
  idProperty: 'metafield_id',
  featuredProperties: ['unique_id', 'namespace', 'key', 'value', 'metafield_id'],
});
