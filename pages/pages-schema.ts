import * as coda from '@codahq/packs-sdk';
import { IDENTITY_PAGE } from '../constants';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const PageSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */

    /**
     * Disabled
     */

    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the page in the Shopify admin.',
      fixedId: 'admin_url',
    },
    // TODO: use this as idProperty
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the page.',
      required: true,
      fixedId: 'graphql_gid',
    },
    /* NOT NEEDED
    page_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      description: 'The unique numeric identifier for the page.',
    },
    */
    body: {
      type: coda.ValueType.String,
      description: 'Text-only content of the page, stripped of any HTML tags and formatting that were included.',
      fixedId: 'body',
    },
    body_html: {
      type: coda.ValueType.String,
      description: 'The text content of the page, in raw HTML.',
      mutable: true,
      fixedId: 'body_html',
    },
    handle: {
      type: coda.ValueType.String,
      description: 'A unique, human-friendly string for the page.',
      mutable: true,
      fixedId: 'handle',
    },
    author: {
      type: coda.ValueType.String,
      description: 'The name of the person who created the page.',
      mutable: true,
      fixedId: 'author',
    },
    title: {
      type: coda.ValueType.String,
      description: 'The title of the page.',
      required: true,
      mutable: true,
      fixedId: 'title',
    },
    /* NOT NEEDED
    shop_id: {
      type: coda.ValueType.Number,
      description: 'The ID of the shop to which the page belongs.',
    },
    */
    template_suffix: {
      type: coda.ValueType.String,
      description:
        'The suffix of the template that is used to render the page. If the value is an empty string or null, then the default page template is used.',
      mutable: true,
      fixedId: 'template_suffix',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the page was created.',
      fixedId: 'created_at',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the page was last updated.',
      fixedId: 'updated_at',
    },
    published: {
      type: coda.ValueType.Boolean,
      codaType: coda.ValueHintType.Toggle,
      description: 'Whether the page is visible.',
      mutable: true,
      fixedId: 'published',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the page was published. Blank when the page is hidden.',
      mutable: true,
      fixedId: 'published_at',
    },
  },
  displayProperty: 'title',
  idProperty: 'graphql_gid',
  featuredProperties: ['title', 'author', 'handle', 'template_suffix', 'admin_url'],

  // Card fields.
  subtitleProperties: ['author', 'handle', 'created_at'],
  snippetProperty: 'body',
  linkProperty: 'admin_url',
});

export const PageReference = coda.makeReferenceSchemaFromObjectSchema(PageSchema, IDENTITY_PAGE);

export const pageFieldDependencies = [
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
    dependencies: ['published'],
  },
];
