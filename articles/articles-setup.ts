import * as coda from '@codahq/packs-sdk';

import { IDENTITY_ARTICLE, OPTIONS_PUBLISHED_STATUS, RESOURCE_ARTICLE, REST_DEFAULT_API_VERSION } from '../constants';
import {
  autocompleteBlogGidParameter,
  createArticle,
  deleteArticle,
  syncArticles,
  fetchArticle,
  updateArticle,
  formatArticle,
  getBlogIdFromArticlePseudoGid,
  genArticlePeudoGid,
} from './articles-functions';

import { ArticleSchema } from './articles-schema';
import { graphQlGidToId } from '../helpers-graphql';
import { makePutRequest } from '../helpers-rest';
import { sharedParameters } from '../shared-parameters';

const parameters = {
  articleID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'articleID',
    description: 'The id of the article.',
  }),
  articlePseudoGID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'pseudoGid',
    description: `The custom coda generated id for the article. Use helper function ArticlePseudoGid to help generate it. Format is gid://shopify/${RESOURCE_ARTICLE}/{article_id}?blog_id={blog_id}`,
  }),
  author: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'The name of the author of the article.',
  }),
  restrict_to_blogs: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'blogs',
    description: 'Only fetch articles from the specified blog GraphQL GIDs.',
    autocomplete: autocompleteBlogGidParameter,
  }),
  body_html: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'bodyHtml',
    description: 'The text of the body of the article, complete with HTML markup.',
  }),
  created_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'createdAtMin',
    description: 'Show articles created after date.',
    optional: true,
  }),
  created_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'createdAtMax',
    description: 'Show articles created before date.',
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
    name: 'publishedAt',
    description: 'The date and time  when the article was published.',
  }),
  published_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAtMin',
    description: 'Show articles published after date.',
    optional: true,
  }),
  published_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAtMax',
    description: 'Show articles published before date.',
    optional: true,
  }),
  published_status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'Retrieve results based on their published status.',
    optional: true,
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  summary_html: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'summaryHtml',
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
    name: 'templateSuffix',
    description: "The name of the template an article is using if it's using an alternate template.",
  }),
  since_id: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'sinceId',
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
    name: 'updatedAtMax',
    description: 'Show articles last updated before date.',
    optional: true,
  }),
  updated_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updatedAtMin',
    description: 'Show articles last updated after date.',
    optional: true,
  }),
};

export const setupArticles = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Articles',
    description: 'Return articles from this shop.',
    identityName: IDENTITY_ARTICLE,
    schema: ArticleSchema,
    formula: {
      name: 'SyncArticles',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        { ...parameters.restrict_to_blogs, optional: true },
        { ...parameters.author, optional: true },
        { ...parameters.created_at_max, optional: true },
        { ...parameters.created_at_min, optional: true },
        { ...parameters.handle, optional: true },
        { ...parameters.published_at_max, optional: true },
        { ...parameters.published_at_min, optional: true },
        { ...parameters.published_status, optional: true },
        { ...parameters.tag, optional: true },
        { ...parameters.updated_at_max, optional: true },
        { ...parameters.updated_at_min, optional: true },
      ],
      execute: syncArticles,
      maxUpdateBatchSize: 10,
      executeUpdate: async function ([], updates, context: coda.SyncExecutionContext) {
        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;

          const blogId = getBlogIdFromArticlePseudoGid(update.previousValue.pseudo_graphql_gid);
          const articleId = graphQlGidToId(update.previousValue.pseudo_graphql_gid);

          const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}/articles/${articleId}.json`;

          const payload = {
            article: {},
          };
          updatedFields.forEach((key) => {
            // edge case: Image alt text
            if (key === 'image_alt_text') {
              if (!payload.article['image']) {
                payload.article['image'] = {};
              }
              payload.article['image'].alt = update.newValue[key];
            }
            // edge case: blog_gid
            else if (key === 'blog_gid') {
              payload.article['blog_id'] = graphQlGidToId(update.newValue[key]);
            }
            // edge case: blog
            else if (key === 'blog') {
              payload.article['blog_id'] = graphQlGidToId(update.newValue[key].admin_graphql_api_id as string);
            } else {
              payload.article[key] = update.newValue[key];
            }
          });

          const response = await makePutRequest({ url, payload }, context);
          if (response.body.article) {
            return formatArticle(response.body.article, context);
          }
        });

        // Wait for all of the jobs to finish .
        let completed = await Promise.allSettled(jobs);

        return {
          // For each update, return either the updated row
          // or an error if the update failed.
          result: completed.map((job) => {
            if (job.status === 'fulfilled') {
              return job.value;
            } else {
              return job.reason;
            }
          }),
        };
      },
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Article',
    description: 'Return a single article from this shop.',
    parameters: [parameters.articlePseudoGID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ArticleSchema,
    execute: fetchArticle,
  });

  pack.addFormula({
    name: 'ArticlePseudoGid',
    description:
      'Generate pseudo graphQL GID for the article to workaround the fact that Shopify cannot interact with an article by only providing its GraphQL GID.',
    parameters: [sharedParameters.blog_gid, parameters.articleID],
    resultType: coda.ValueType.String,
    // connexion is need for autocompletion
    // connectionRequirement: coda.ConnectionRequirement.None,
    execute: async function ([blogGid, articleId], context) {
      return genArticlePeudoGid(graphQlGidToId(blogGid), articleId);
    },
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  pack.addFormula({
    name: 'DeleteArticle',
    description: 'Delete an existing Shopify article and return true on success.',
    parameters: [parameters.articlePseudoGID],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async ([articlePseudoGID], context) => {
      const response = await deleteArticle([articlePseudoGID], context);
      return true;
    },
  });

  pack.addFormula({
    name: 'UpdateArticle',
    description: 'Update an existing Shopify article and return the updated data.',
    parameters: [
      parameters.articlePseudoGID,
      { ...parameters.author, optional: true },
      { ...parameters.body_html, optional: true },
      { ...parameters.handle, optional: true },
      { ...parameters.imageAlt, optional: true },
      { ...parameters.imageSrc, optional: true },
      { ...parameters.published_at, optional: true },
      { ...parameters.published, optional: true },
      { ...parameters.summary_html, optional: true },
      { ...parameters.tags, optional: true },
      { ...parameters.template_suffix, optional: true },
      { ...parameters.title, optional: true },
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    // schema: coda.withIdentity(ArticleSchema, IDENTITY_ARTICLE),
    schema: ArticleSchema,
    execute: updateArticle,
  });

  pack.addFormula({
    name: 'CreateArticle',
    description: 'Create a new Shopify article and return GraphQl pseudo GID.',
    parameters: [
      sharedParameters.blog_gid,
      parameters.title,
      { ...parameters.author, optional: true },
      { ...parameters.body_html, optional: true },
      { ...parameters.handle, optional: true },
      { ...parameters.imageAlt, optional: true },
      { ...parameters.imageSrc, optional: true },
      { ...parameters.published_at, optional: true },
      { ...parameters.published, optional: true },
      { ...parameters.summary_html, optional: true },
      { ...parameters.tags, optional: true },
      { ...parameters.template_suffix, optional: true },
    ],
    isAction: true,
    cacheTtlSecs: 10,
    resultType: coda.ValueType.String,
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
      return genArticlePeudoGid(body.article.blog_id, body.article.id);
    },
  });
};
