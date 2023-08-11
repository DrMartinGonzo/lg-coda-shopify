import * as coda from '@codahq/packs-sdk';

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

    article_id: { type: coda.ValueType.Number, fromKey: 'id', description: 'The ID of the article.' },
    author: { type: coda.ValueType.String, description: 'The name of the author of the article.' },
    blog_id: { type: coda.ValueType.Number, description: 'The ID of the blog containing the article.' },
    body_html: {
      type: coda.ValueType.String,
      description: 'The text of the body of the article, complete with HTML markup.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the article was created.',
    },
    handle: {
      type: coda.ValueType.String,
      description:
        "A human-friendly unique string for the article that's automatically generated from the article's title. The handle is used in the article's URL.",
    },
    image: {
      type: coda.ValueType.Object,
      description: 'An image associated with the article.',
      properties: {
        attachment: {
          type: coda.ValueType.String,
          description: 'An image attached to article returned as Base64-encoded binary data.',
        },
        src: { type: coda.ValueType.String, description: 'A source URL that specifies the location of the image.' },
        alt: { type: coda.ValueType.String, description: 'Alternative text that describes the image.' },
      },
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
    published: { type: coda.ValueType.Boolean, description: 'Whether the article is visible.' },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the article was published.',
    },
    summary_html: {
      type: coda.ValueType.String,
      description:
        'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
    },
    tags: {
      type: coda.ValueType.String,
      description:
        'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
    },
    template_suffix: {
      type: coda.ValueType.String,
      description:
        "The name of the template an article is using if it's using an alternate template. If an article is using the default article.liquid template, then the value returned is null.",
    },
    title: { type: coda.ValueType.String, description: 'The title of the article.' },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the article was last updated.',
    },
    user_id: { type: coda.ValueType.Number, description: 'A unique numeric identifier for the author of the article.' },
  },
  displayProperty: 'title',
  idProperty: 'article_id',
  featuredProperties: ['title', 'body_html', 'published'],

  // Card fields.
  subtitleProperties: ['author', 'published_at', 'tags', 'template_suffix'],
  snippetProperty: 'summary_html',
});
