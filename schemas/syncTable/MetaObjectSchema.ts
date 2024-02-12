import * as coda from '@codahq/packs-sdk';

export const MetaObjectBaseSchema = coda.makeObjectSchema({
  properties: {
    id: { type: coda.ValueType.Number, fromKey: 'id', required: true, useThousandsSeparator: false },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the Metaobject.',
    },
    handle: {
      type: coda.ValueType.String,
      required: true,
      mutable: true,
      description: 'The unique handle of the object',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metaobject in the Shopify admin.',
    },
  },
  displayProperty: 'handle',
  idProperty: 'id',
  featuredProperties: ['id', 'handle', 'admin_url'],
});
