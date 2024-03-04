import * as coda from '@codahq/packs-sdk';
import { IDENTITY_PAGE, NOT_FOUND } from '../../constants';

import type { FieldDependency } from '../../types/tableSync';

export const PageSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the page in the Shopify admin.',
    },
    shop_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'shop_url',
      description: 'A link to the page in the oniine shop.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the page.',
    },
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The unique numeric identifier for the page.',
    },
    body: {
      type: coda.ValueType.String,
      fixedId: 'body',
      description: 'Text-only content of the page, stripped of any HTML tags and formatting that were included.',
    },
    body_html: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'body_html',
      fromKey: 'body_html',
      description: 'The text content of the page, in raw HTML.',
    },
    handle: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'handle',
      fromKey: 'handle',
      description: 'A unique, human-friendly string for the page.',
    },
    author: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'author',
      fromKey: 'author',
      description: 'The name of the person who created the page.',
    },
    title: {
      type: coda.ValueType.String,
      required: true,
      mutable: true,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The title of the page.',
    },
    template_suffix: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'template_suffix',
      fromKey: 'template_suffix',
      mutable: true,
      requireForUpdates: false,
      options: coda.OptionsType.Dynamic,
      description:
        'The suffix of the template that is used to render the page. If the value is an empty string or null, then the default page template is used.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the page was created.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the page was last updated.',
    },
    published: {
      type: coda.ValueType.Boolean,
      codaType: coda.ValueHintType.Toggle,
      mutable: true,
      fixedId: 'published',
      fromKey: 'published',
      description: 'Whether the page is visible.',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      mutable: true,
      fixedId: 'published_at',
      fromKey: 'published_at',
      description: 'The date and time when the page was published. Blank when the page is hidden.',
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Pages dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'author', 'handle', 'template_suffix'],

  // Card fields.
  subtitleProperties: ['author', 'handle', 'created_at'],
  snippetProperty: 'body',
  linkProperty: 'admin_url',
});

export const pageFieldDependencies: FieldDependency<typeof PageSyncTableSchema.properties>[] = [
  {
    field: 'body_html',
    dependencies: ['body'],
  },
  {
    field: 'id',
    dependencies: ['graphql_gid', 'admin_url'],
  },
  {
    field: 'published_at',
    dependencies: ['published', 'store_url'],
  },
  {
    field: 'handle',
    dependencies: ['store_url'],
  },
];

export const PageReference = coda.makeReferenceSchemaFromObjectSchema(PageSyncTableSchema, IDENTITY_PAGE);
export const formatPageReference = (id: number, title = NOT_FOUND) => ({ id, title });
