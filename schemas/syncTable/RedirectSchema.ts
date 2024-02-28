import * as coda from '@codahq/packs-sdk';

export const RedirectSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the redirect in the Shopify admin.',
    },
    test_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'test_url',
      description: 'A link to test the redirect. Uses the value in `path` and should land you in `target`.',
    },
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The ID for the redirect.',
    },
    path: {
      type: coda.ValueType.String,
      fixedId: 'path',
      fromKey: 'path',
      mutable: true,
      description:
        'The old path to be redirected. When the user visits this path, they will be redirected to the target. (maximum: 1024 characters).',
    },
    target: {
      type: coda.ValueType.String,
      fixedId: 'target',
      fromKey: 'target',
      mutable: true,
      description:
        "The target location where the user will be redirected. When the user visits the old path specified by the path property, they will be redirected to this location. This property can be set to any path on the shop's site, or to an external URL. (maximum: 255 characters).",
    },
  },
  displayProperty: 'path',
  idProperty: 'id',
  featuredProperties: ['id', 'path', 'target', 'admin_url'],
});

export const redirectFieldDependencies = [
  {
    field: 'id',
    dependencies: ['admin_url'],
  },
  {
    field: 'path',
    dependencies: ['test_url'],
  },
];
