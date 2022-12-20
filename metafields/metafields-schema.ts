import * as coda from '@codahq/packs-sdk';

export const ProductMetafieldSchema = coda.makeObjectSchema({
  properties: {
    metafield_id: { type: coda.ValueType.Number, required: true },
    unique_id: { type: coda.ValueType.String, required: true },
    // The date and time (ISO 8601 format) when the metafield was created.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // A description of the information that the metafield contains.
    description: { type: coda.ValueType.String },
    // The key of the metafield. Keys can be up to 64 characters long and can contain alphanumeric characters, hyphens, underscores, and periods.
    key: { type: coda.ValueType.String, required: true },
    // A container for a group of metafields. Grouping metafields within a namespace prevents your metafields from conflicting with other metafields with the same key name. Must have between 3-255 characters.
    namespace: { type: coda.ValueType.String, required: true },
    // The unique ID of the resource that the metafield is attached to.
    owner_id: { type: coda.ValueType.Number, required: true },
    // The type of resource that the metafield is attached to.
    owner_resource: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The date and time (ISO 8601 format) when the metafield was last updated.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The data to store in the metafield. The value is always stored as a string, regardless of the metafield's type.
    value: { type: coda.ValueType.String, required: true },
    // The type of data that the metafield stores in the `value` field. Refer to the list of supported types (https://shopify.dev/apps/metafields/types).
    type: { type: coda.ValueType.String, required: true },
    // admin_graphql_api_id: { type: coda.ValueType.String },
  },
  displayProperty: 'unique_id',
  idProperty: 'metafield_id',
  featuredProperties: ['unique_id', 'namespace', 'key', 'value', 'metafield_id'],
});
