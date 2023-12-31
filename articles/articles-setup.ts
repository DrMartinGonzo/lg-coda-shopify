import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';
import { createArticle, deleteArticle, fetchAllArticles, fetchArticle, updateArticle } from './articles-functions';

import { ArticleSchema } from './articles-schema';
import { sharedParameters } from '../shared-parameters';

const parameters = {
  articleID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'articleID',
    description: 'The id of the article.',
  }),
  author: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'The name of the author of the article.',
  }),
  blogID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'blogID',
    description: 'The id of the blog.',
  }),
  body_html: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'body_html',
    description: 'The text of the body of the article, complete with HTML markup.',
  }),
  created_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'created_at_min',
    description: 'Show articles created after date (format: 2014-04-25T16:15:47-04:00).',
    optional: true,
  }),
  created_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'created_at_max',
    description: 'Show articles created before date (format: 2014-04-25T16:15:47-04:00).',
    optional: true,
  }),
  handle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description:
      "A human-friendly unique string for the article that's automatically generated from the article's title. The handle is used in the article's URL.",
  }),
  imageSrc: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'imageSrc',
    description: 'Source URL that specifies the location of the image.',
  }),
  imageAlt: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'imageAlt',
    description: 'Alternative text that describes the image.',
  }),
  published: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'published',
    description: 'Whether the article is visible.',
  }),
  published_at: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'published_at',
    description: 'The date and time (ISO 8601 format) when the article was published.',
  }),
  published_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'published_at_min',
    description: 'Show articles published after date (format: 2014-04-25T16:15:47-04:00).',
    optional: true,
  }),
  published_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'published_at_max',
    description: 'Show articles published before date (format: 2014-04-25T16:15:47-04:00).',
    optional: true,
  }),
  published_status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'published_status',
    description: 'Retrieve results based on their published status.',
    optional: true,
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  summary_html: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'summary_html',
    description:
      'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
  }),
  tags: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'tags',
    description:
      'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
  }),
  template_suffix: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'template_suffix',
    description: "The name of the template an article is using if it's using an alternate template.",
  }),
  since_id: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'since_id',
    description: 'Restrict results to after the specified ID.',
    optional: true,
  }),
  tag: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'tag',
    description: 'Filter articles with a specific tag.',
    optional: true,
  }),
  title: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the article.',
  }),
  updated_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updated_at_max',
    description: 'Show articles last updated before date (format: 2014-04-25T16:15:47-04:00).',
    optional: true,
  }),
  updated_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updated_at_min',
    description: 'Show articles last updated after date (format: 2014-04-25T16:15:47-04:00).',
    optional: true,
  }),
};

export const setupArticles = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Articles',
    description: 'All Shopify products',
    identityName: 'Article',
    schema: ArticleSchema,
    formula: {
      name: 'SyncArticles',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        parameters.blogID,
        { ...parameters.author, optional: true },
        { ...parameters.created_at_max, optional: true },
        { ...parameters.created_at_min, optional: true },
        { ...parameters.handle, optional: true },
        sharedParameters.maxEntriesPerRun,
        { ...parameters.published_at_max, optional: true },
        { ...parameters.published_at_min, optional: true },
        { ...parameters.published_status, optional: true },
        { ...parameters.since_id, optional: true },
        { ...parameters.tag, optional: true },
        { ...parameters.updated_at_max, optional: true },
        { ...parameters.updated_at_min, optional: true },
      ],
      execute: fetchAllArticles,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Article',
    description: 'Get a single article data.',
    parameters: [parameters.blogID, parameters.articleID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ArticleSchema,
    execute: fetchArticle,
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  pack.addFormula({
    name: 'DeleteArticle',
    description: 'delete article.',
    parameters: [parameters.blogID, parameters.articleID],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([blogID, articleId], context) => {
      const response = await deleteArticle([blogID, articleId], context);
      return true;
    },
  });

  pack.addFormula({
    name: 'UpdateArticle',
    description: 'update product article.',
    parameters: [
      parameters.blogID,
      parameters.articleID,
      { ...parameters.title, optional: true },
      { ...parameters.author, optional: true },
      { ...parameters.body_html, optional: true },
      { ...parameters.handle, optional: true },
      { ...parameters.imageSrc, optional: true },
      { ...parameters.imageAlt, optional: true },
      { ...parameters.summary_html, optional: true },
      { ...parameters.template_suffix, optional: true },
      { ...parameters.tags, optional: true },
      { ...parameters.published, optional: true },
      { ...parameters.published_at, optional: true },
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async (
      [
        blogID,
        articleId,
        title,
        author,
        body_html,
        handle,
        imageSrc,
        imageAlt,
        summary_html,
        template_suffix,
        tags,
        published,
        published_at,
      ],
      context
    ) => {
      const response = await updateArticle(
        [
          blogID,
          articleId,
          title,
          author,
          body_html,
          handle,
          imageSrc,
          imageAlt,
          summary_html,
          template_suffix,
          tags,
          published,
          published_at,
        ],
        context
      );
      return true;
    },
  });

  pack.addFormula({
    name: 'CreateArticle',
    description: 'create article.',
    parameters: [
      parameters.blogID,
      parameters.title,
      { ...parameters.author, optional: true },
      { ...parameters.body_html, optional: true },
      { ...parameters.handle, optional: true },
      { ...parameters.imageSrc, optional: true },
      { ...parameters.imageAlt, optional: true },
      { ...parameters.summary_html, optional: true },
      { ...parameters.template_suffix, optional: true },
      { ...parameters.tags, optional: true },
      { ...parameters.published, optional: true },
      { ...parameters.published_at, optional: true },
    ],
    isAction: true,
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Number,
    execute: async (
      [
        blogID,
        title,
        author,
        body_html,
        handle,
        imageSrc,
        imageAlt,
        summary_html,
        template_suffix,
        tags,
        published,
        published_at,
      ],
      context
    ) => {
      const response = await createArticle(
        [
          blogID,
          title,
          author,
          body_html,
          handle,
          imageSrc,
          imageAlt,
          summary_html,
          template_suffix,
          tags,
          published,
          published_at,
        ],
        context
      );
      const { body } = response;
      return body.article.id;
    },
  });
};
