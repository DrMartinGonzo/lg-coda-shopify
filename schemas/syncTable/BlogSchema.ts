import * as coda from '@codahq/packs-sdk';
import { NOT_FOUND } from '../../constants';
import { Identity } from '../../constants';

import type { FieldDependency } from '../Schema.types';

export const COMMENTABLE_OPTIONS = [
  { display: 'No', value: 'no' },
  { display: 'Moderate', value: 'moderate' },
  { display: 'Yes', value: 'yes' },
];

export const BlogSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the blog in the Shopify admin.',
    },
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'A unique numeric identifier for the blog.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID for the blog.',
    },
    commentable: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'commentable',
      fromKey: 'commentable',
      mutable: true,
      description: 'Whether readers can post comments to the blog and if comments are moderated or not.',
      options: COMMENTABLE_OPTIONS,
      requireForUpdates: true,
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the blog was created.',
    },
    handle: {
      type: coda.ValueType.String,
      fixedId: 'handle',
      fromKey: 'handle',
      mutable: true,
      description:
        "A human-friendly unique string for the blog that's automatically generated from the blog's title. The handle is used in the blog's URL.",
    },
    tags: {
      type: coda.ValueType.String,
      fixedId: 'tags',
      fromKey: 'tags',
      description:
        'A list of tags associated with the 200 most recent blog articles. Tags are additional short descriptors formatted as a string of comma-separated values. For example, if an article has three tags: tag1, tag2, tag3. Tags are limited to 255 characters.',
    },
    template_suffix: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'template_suffix',
      fromKey: 'template_suffix',
      mutable: true,
      requireForUpdates: false,
      options: coda.OptionsType.Dynamic,
      description: 'States the name of the template a blog is using if it is using an alternate template.',
    },
    title: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'title',
      fromKey: 'title',
      mutable: true,
      description: 'The title of the blog.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description:
        "The date and time when changes were last made to the blog's properties. Note that this is not updated when creating, modifying or deleting articles in the blog.",
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Blogs dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'handle', 'tags'],

  // Card fields.
  subtitleProperties: ['handle', 'tags', 'commentable', 'template_suffix'],
  linkProperty: 'admin_url',
});

export const BlogReference = coda.makeReferenceSchemaFromObjectSchema(BlogSyncTableSchema, Identity.Blog);
export const formatBlogReference = (id: number, title = NOT_FOUND) => ({ id, title });
export const blogFieldDependencies: FieldDependency<typeof BlogSyncTableSchema.properties>[] = [
  {
    field: 'id',
    dependencies: ['graphql_gid', 'admin_url'],
  },
];
