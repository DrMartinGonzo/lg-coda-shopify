import * as coda from '@codahq/packs-sdk';

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

    blog_id: { type: coda.ValueType.Number, fromKey: 'id', description: 'A unique numeric identifier for the blog.' },
    commentable: {
      type: coda.ValueType.String,
      description: 'Indicates whether readers can post comments to the blog and if comments are moderated or not.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the blog was created. The API returns this value in ISO 8601 format.',
    },
    handle: {
      type: coda.ValueType.String,
      description:
        "A human-friendly unique string for the blog that's automatically generated from the blog's title. The handle is used in the blog's URL.",
    },
    tags: {
      type: coda.ValueType.String,
      description:
        'A list of tags associated with the 200 most recent blog articles. Tags are additional short descriptors formatted as a string of comma-separated values. For example, if an article has three tags: tag1, tag2, tag3. Tags are limited to 255 characters.',
    },
    title: { type: coda.ValueType.String, description: 'The title of the blog.' },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description:
        "The date and time when changes were last made to the blog's properties. Note that this is not updated when creating, modifying or deleting articles in the blog. The API returns this value in ISO 8601 format.",
    },
  },
  displayProperty: 'title',
  idProperty: 'blog_id',
  featuredProperties: ['title', 'handle', 'tags'],

  // Card fields.
  subtitleProperties: ['handle', 'blog_id', 'tags', 'created_at', 'updated_at'],
  snippetProperty: 'commentable',
});
