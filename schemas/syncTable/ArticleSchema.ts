import * as coda from '@codahq/packs-sdk';
import { BlogReference } from './BlogSchema';
import { NOT_FOUND } from '../../constants';
import { Identity } from '../../constants';

import type { FieldDependency } from '../Schema.types';

export const ArticleSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The ID of the article.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the article.',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the article in the Shopify admin.',
    },
    // TODO: Pas possible sans faire de requête supplémentaire pour récupérer le handle du blog à partir de blog_id
    // store_url: {
    //   type: coda.ValueType.String,
    //   codaType: coda.ValueHintType.Url,
    //   fixedId: 'store_url',
    //   description: 'A link to the article in the online shop.',
    // },
    author: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'author',
      fromKey: 'author',
      description: 'The name of the author of the article.',
    },
    blog_id: {
      type: coda.ValueType.Number,
      fixedId: 'blog_id',
      fromKey: 'blog_id',
      mutable: true,
      useThousandsSeparator: false,
      description: 'The ID of the blog containing the article.',
    },
    blog: {
      ...BlogReference,
      mutable: true,
      fixedId: 'blog',
      requireForUpdates: true,
      description: 'A relation to the blog containing the article.',
    },
    body: {
      type: coda.ValueType.String,
      fixedId: 'body',
      description:
        'Text-only content of the body of the article, stripped of any HTML tags and formatting that were included.',
    },
    body_html: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'body_html',
      fromKey: 'body_html',
      description: 'The text of the body of the article, complete with HTML markup.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the article was created.',
    },
    handle: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'handle',
      fromKey: 'handle',
      description:
        "A human-friendly unique string for the article that's automatically generated from the article's title. The handle is used in the article's URL.",
    },
    image_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      mutable: true,
      fixedId: 'image_url',
      description: 'An image associated with the article.',
    },
    image_alt_text: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'image_alt_text',
      description: `Alternative text that describes the image associated with the article.`,
    },
    published: {
      type: coda.ValueType.Boolean,
      codaType: coda.ValueHintType.Toggle,
      mutable: true,
      fixedId: 'published',
      description: 'Whether the article is visible.',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      mutable: true,
      fixedId: 'published_at',
      fromKey: 'published_at',
      description: 'The date and time when the article was published.',
    },
    summary: {
      type: coda.ValueType.String,
      fixedId: 'summary',
      description:
        'Text-only content of the summary of the article, stripped of any HTML tags and formatting that were included.',
    },
    summary_html: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'summary_html',
      fromKey: 'summary_html',
      description:
        'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
    },
    tags: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'tags',
      fromKey: 'tags',
      description:
        'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
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
        "The name of the template an article is using if it's using an alternate template. If an article is using the default article.liquid template, then the value returned is null.",
    },
    title: {
      type: coda.ValueType.String,
      required: true,
      mutable: true,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The title of the article.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the article was last updated.',
    },
    user_id: {
      type: coda.ValueType.Number,
      fixedId: 'user_id',
      fromKey: 'user_id',
      useThousandsSeparator: false,
      description: 'A unique numeric identifier for the author of the article.',
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Articles dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'body_html', 'published'],

  // Card fields.
  subtitleProperties: ['author', 'published_at', 'tags', 'template_suffix'],
  snippetProperty: 'body',
  imageProperty: 'image_url',
  linkProperty: 'admin_url',
});

export const ArticleReference = coda.makeReferenceSchemaFromObjectSchema(ArticleSyncTableSchema, Identity.Article);
export const formatArticleReference = (id: number, title = NOT_FOUND) => ({ id, title });

export const articleFieldDependencies: FieldDependency<typeof ArticleSyncTableSchema.properties>[] = [
  {
    field: 'summary_html',
    dependencies: ['summary'],
  },
  {
    field: 'body_html',
    dependencies: ['body'],
  },
  {
    field: 'blog_id',
    dependencies: ['blog'],
  },
  {
    field: 'id',
    dependencies: ['blog', 'admin_url'],
  },
  {
    field: 'published_at',
    dependencies: ['published'],
  },
  {
    field: 'image',
    dependencies: ['image_url', 'image_alt_text'],
  },
];
