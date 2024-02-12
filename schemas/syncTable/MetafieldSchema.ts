import * as coda from '@codahq/packs-sdk';

export const MetafieldSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the metafield.',
      fixedId: 'graphql_gid',
    },
    metafield_id: {
      type: coda.ValueType.String,
      required: true,
      fromKey: 'id',
      fixedId: 'metafield_id',
    },
    lookup: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'lookup',
    },
    key: {
      type: coda.ValueType.String,
      required: true,
      description:
        'The key of the metafield. Keys can be up to 64 characters long and can contain alphanumeric characters, hyphens, underscores, and periods.',
      fixedId: 'key',
    },
    namespace: {
      type: coda.ValueType.String,
      description:
        'The container for a group of metafields that the metafield is or will be associated with. Used in tandem with `key` to lookup a metafield on a resource, preventing conflicts with other metafields with the same `key`. Must be 3-255 characters long and can contain alphanumeric, hyphen, and underscore characters.',
      fixedId: 'namespace',
    },
    description: {
      type: coda.ValueType.String,
      description: 'A description of the information that the metafield contains.',
      fixedId: 'description',
    },
    owner_id: {
      type: coda.ValueType.String,
      required: true,
      description: 'The unique ID of the resource that the metafield is attached to.',
      fixedId: 'owner_id',
    },
    owner_resource: {
      type: coda.ValueType.String,
      required: true,
      description: 'The type of resource that the metafield is attached to.',
      fixedId: 'owner_resource',
    },
    value: {
      type: coda.ValueType.String,
      required: true,
      description:
        "The data to store in the metafield. The value is always stored as a string, regardless of the metafield's type.",
      fixedId: 'value',
    },
    type: {
      type: coda.ValueType.String,
      required: true,
      description:
        'The type of data that the metafield stores in the `value` field. Refer to the list of supported types (https://shopify.dev/apps/metafields/types).',
      fixedId: 'type',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the metafield was created.',
      fixedId: 'created_at',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the metafield was last updated.',
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'lookup',
  idProperty: 'metafield_id',
  featuredProperties: ['key', 'owner_id', 'value', 'type'],
});

export const MetafieldFormulaSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the metafield.',
      fixedId: 'graphql_gid',
      required: true,
    },
    key: {
      type: coda.ValueType.String,
      required: true,
      description:
        'The key of the metafield. Keys can be up to 64 characters long and can contain alphanumeric characters, hyphens, underscores, and periods.',
      fixedId: 'key',
    },
    namespace: {
      type: coda.ValueType.String,
      description:
        'The container for a group of metafields that the metafield is or will be associated with. Used in tandem with `key` to lookup a metafield on a resource, preventing conflicts with other metafields with the same `key`. Must be 3-255 characters long and can contain alphanumeric, hyphen, and underscore characters.',
      fixedId: 'namespace',
    },
    description: {
      type: coda.ValueType.String,
      description: 'A description of the information that the metafield contains.',
      fixedId: 'description',
    },
    owner_id: {
      type: coda.ValueType.String,
      required: true,
      description: 'The unique ID of the resource that the metafield is attached to.',
      fixedId: 'owner_id',
    },
    owner_resource: {
      type: coda.ValueType.String,
      required: true,
      description: 'The type of resource that the metafield is attached to.',
      fixedId: 'owner_resource',
    },
    value: {
      type: coda.ValueType.String,
      required: true,
      description:
        "The stored in the metafield. The value is always stored as a string, regardless of the metafield's type.",
      fixedId: 'value',
    },
    type: {
      type: coda.ValueType.String,
      required: true,
      description:
        'The type of data that the metafield stores in the `value` field. Refer to the list of supported types (https://shopify.dev/apps/metafields/types).',
      fixedId: 'type',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the metafield was created.',
      fixedId: 'created_at',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the metafield was last updated.',
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'lookup',
  idProperty: 'graphql_gid',
  featuredProperties: ['namespace', 'key', 'value', 'owner_id', 'type'],
});

export const MetafieldBaseSyncSchema = coda.makeObjectSchema({
  properties: {
    owner_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the resource owning the metafield.',
      fromKey: 'id',
      fixedId: 'owner_gid',
      required: true,
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metafields in the Shopify admin.',
    },
  },
  displayProperty: 'owner_gid',
  idProperty: 'owner_gid',
  featuredProperties: ['owner_gid', 'admin_url'],
});
