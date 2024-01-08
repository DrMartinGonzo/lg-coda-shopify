import * as coda from '@codahq/packs-sdk';
import { IDENTITY_BLOG } from '../constants';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const BlogSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */
    /*
     */

    /**
     * Disabled
     */
    /*
     */
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the blog in the Shopify admin.',
      fixedId: 'admin_url',
    },
    /* NOT NEEDED
    blog_id: { type: coda.ValueType.Number, fromKey: 'id', description: 'A unique numeric identifier for the blog.' },
    */
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID for the blog.',
      required: true,
      fixedId: 'graphql_gid',
    },
    commentable: {
      type: coda.ValueType.String,
      description: 'Indicates whether readers can post comments to the blog and if comments are moderated or not.',
      fixedId: 'commentable',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the blog was created. The API returns this value in ISO 8601 format.',
      fixedId: 'created_at',
    },
    handle: {
      type: coda.ValueType.String,
      description:
        "A human-friendly unique string for the blog that's automatically generated from the blog's title. The handle is used in the blog's URL.",
      fixedId: 'handle',
    },
    tags: {
      type: coda.ValueType.String,
      description:
        'A list of tags associated with the 200 most recent blog articles. Tags are additional short descriptors formatted as a string of comma-separated values. For example, if an article has three tags: tag1, tag2, tag3. Tags are limited to 255 characters.',
      fixedId: 'tags',
    },
    title: {
      type: coda.ValueType.String,
      description: 'The title of the blog.',
      required: true,
      fixedId: 'title',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description:
        "The date and time when changes were last made to the blog's properties. Note that this is not updated when creating, modifying or deleting articles in the blog. The API returns this value in ISO 8601 format.",
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'title',
  idProperty: 'graphql_gid',
  featuredProperties: ['title', 'handle', 'tags', 'admin_url'],

  // Card fields.
  subtitleProperties: ['handle', 'tags', 'commentable'],
  linkProperty: 'admin_url',
});
export const BlogReference = coda.makeReferenceSchemaFromObjectSchema(BlogSchema, IDENTITY_BLOG);
export const blogFieldDependencies = [
  {
    field: 'id',
    dependencies: ['graphql_gid', 'admin_url'],
  },
];
