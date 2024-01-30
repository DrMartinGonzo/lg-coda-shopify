import * as coda from '@codahq/packs-sdk';
import { BlogReference } from '../blogs/blogs-schema';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const ArticleSchema = coda.makeObjectSchema({
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

    /* NOT NEEDED
    article_id: { type: coda.ValueType.Number, fromKey: 'id', description: 'The ID of the article.' },
    */

    /* NOT NEEDED
    article_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID for the article.',
      required: true,
    },
    */

    pseudo_graphql_gid: {
      type: coda.ValueType.String,
      description:
        'A pseudo graphQL GID for the article used as an unique identifier.\nThis is valid for this pack only (but follows Shopify GID naming convention) as Shopify has now way to access Articles with GraphQL yet. This is necessary to be able to encode the blog id directly in the row identifier.',
      required: true,
      fixedId: 'graphql_gid',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the article in the Shopify admin.',
      fixedId: 'admin_url',
    },
    author: {
      type: coda.ValueType.String,
      description: 'The name of the author of the article.',
      mutable: true,
      fixedId: 'author',
    },

    /* NOT NEEDED
    blog_id: {
      type: coda.ValueType.Number,
      description: 'The ID of the blog containing the article.',
    },
    */

    blog_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the blog containing the article.',
      mutable: true,
      fixedId: 'blog_gid',
      // requireForUpdates: true,
    },
    blog: {
      ...BlogReference,
      description: 'A relation to the blog containing the article.',
      mutable: true,
      fixedId: 'blog',
      // requireForUpdates: true,
    },
    body: {
      type: coda.ValueType.String,
      description:
        'Text-only content of the body of the article, stripped of any HTML tags and formatting that were included.',
      fixedId: 'body',
    },
    body_html: {
      type: coda.ValueType.String,
      description: 'The text of the body of the article, complete with HTML markup.',
      mutable: true,
      fixedId: 'body_html',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the article was created.',
      fixedId: 'created_at',
    },
    handle: {
      type: coda.ValueType.String,
      description:
        "A human-friendly unique string for the article that's automatically generated from the article's title. The handle is used in the article's URL.",
      mutable: true,
      fixedId: 'handle',
    },
    image: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      description: 'An image associated with the article.',
      fixedId: 'image',
    },
    image_alt_text: {
      type: coda.ValueType.String,
      description: `Alternative text that describes the image associated with the article.`,
      mutable: true,
      fixedId: 'image_alt_text',
    },
    // metafields: {
    //   type: coda.ValueType.Object,
    //   properties: {
    //     key: { type: coda.ValueType.String },
    //     value: { type: coda.ValueType.String },
    //     type: { type: coda.ValueType.String },
    //     namespace: { type: coda.ValueType.String },
    //   },
    // },
    published: {
      type: coda.ValueType.Boolean,
      codaType: coda.ValueHintType.Toggle,
      description: 'Whether the article is visible.',
      mutable: true,
      fixedId: 'published',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the article was published.',
      mutable: true,
      fixedId: 'published_at',
    },
    summary: {
      type: coda.ValueType.String,
      description:
        'Text-only content of the summary of the article, stripped of any HTML tags and formatting that were included.',
      fixedId: 'summary',
    },
    summary_html: {
      type: coda.ValueType.String,
      description:
        'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
      mutable: true,
      fixedId: 'summary_html',
    },
    tags: {
      type: coda.ValueType.String,
      description:
        'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
      mutable: true,
      fixedId: 'tags',
    },
    template_suffix: {
      type: coda.ValueType.String,
      description:
        "The name of the template an article is using if it's using an alternate template. If an article is using the default article.liquid template, then the value returned is null.",
      mutable: true,
      fixedId: 'template_suffix',
    },
    title: {
      type: coda.ValueType.String,
      description: 'The title of the article.',
      mutable: true,
      fixedId: 'title',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the article was last updated.',
      fixedId: 'updated_at',
    },
    user_id: {
      type: coda.ValueType.Number,
      description: 'A unique numeric identifier for the author of the article.',
      fixedId: 'user_id',
      useThousandsSeparator: false,
    },
  },
  displayProperty: 'title',
  idProperty: 'pseudo_graphql_gid',
  featuredProperties: ['title', 'body_html', 'published', 'admin_url'],

  // Card fields.
  subtitleProperties: ['author', 'published_at', 'tags', 'template_suffix'],
  snippetProperty: 'body',
  imageProperty: 'image',
  linkProperty: 'admin_url',
});

export const articleFieldDependencies = [
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
    dependencies: ['pseudo_graphql_gid', 'blog', 'blog_gid'],
  },
  {
    field: 'id',
    dependencies: ['pseudo_graphql_gid', 'blog', 'admin_url'],
  },
  {
    field: 'published_at',
    dependencies: ['published'],
  },
  {
    field: 'image',
    dependencies: ['image_alt_text'],
  },
];
