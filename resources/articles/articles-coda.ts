// #region Imports
import * as coda from '@codahq/packs-sdk';

import { handleDynamicSchemaForCli } from '../../Fetchers/SyncTableRest';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { parseOptionId } from '../../utils/helpers';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { parseMetafieldsCodaInput } from '../metafields/metafields-functions';
import { ArticleRestFetcher } from './ArticleRestFetcher';
import { ArticleSyncTable } from './ArticleSyncTable';
import { Article, articleResource } from './articleResource';

// #region Sync tables
export const Sync_Articles = coda.makeSyncTable({
  name: 'Articles',
  description:
    "Return Articles from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for articles, we have to do a separate Rest call for each article to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Article,
  schema: articleResource.schema,
  dynamicOptions: ArticleSyncTable.dynamicOptions,
  formula: {
    name: 'SyncArticles',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      {
        ...filters.general.syncMetafields,
        description:
          "description: 'Also retrieve metafields. Not recommanded if you have lots of articles, the sync will be much slower as the pack will have to do another API call for each article. Waiting for Shopify to add GraphQL access to articles...',",
        optional: true,
      },
      { ...filters.blog.idOptionNameArray, optional: true },
      { ...filters.article.author, optional: true },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },
      { ...filters.general.handle, optional: true },
      { ...filters.general.publishedStatus, optional: true },
      { ...filters.general.tagLOL, optional: true },
    ],
    execute: async function (params, context) {
      const [syncMetafields] = params;
      const schema = await handleDynamicSchemaForCli(ArticleSyncTable.dynamicOptions.getSchema, context, {
        syncMetafields,
      });
      const articleSyncTable = new ArticleSyncTable(new ArticleRestFetcher(context), params);
      return articleSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const articleSyncTable = new ArticleSyncTable(new ArticleRestFetcher(context), params);
      return articleSyncTable.executeUpdate(updates);
    },
  },
});
// #endregion

// #region Actions
export const Action_CreateArticle = coda.makeFormula({
  name: 'CreateArticle',
  description: 'Create a new Shopify article and return its ID. The article will be unpublished by default.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.blog.idOptionName, name: 'blogId' },
    { ...inputs.general.title, description: 'The title of the article.' },

    // optional parameters
    { ...inputs.general.author, optional: true },
    { ...inputs.article.bodyHtml, optional: true },
    { ...inputs.article.summaryHtml, optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.imageUrl, optional: true },
    { ...inputs.general.imageAlt, optional: true },
    { ...inputs.general.published, description: 'Whether the article is visible.', optional: true },
    { ...inputs.general.publishedAt, description: 'The date and time when the article was published.', optional: true },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.article.templateSuffix, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Article'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async (
    [
      blog,
      title,
      author,
      body_html,
      summary_html,
      handle,
      image_url,
      image_alt_text,
      published,
      published_at,
      tags,
      template_suffix,
      metafields,
    ],
    context
  ) => {
    const defaultPublishedStatus = false;
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    let newRow: Partial<Article['codaRow']> = {
      author,
      blog_id: parseOptionId(blog),
      body_html,
      handle,
      image_alt_text,
      image_url,
      published_at,
      published: published ?? defaultPublishedStatus,
      summary_html,
      tags: tags ? tags.join(',') : undefined,
      template_suffix,
      title,
    };

    const articleFetcher = new ArticleRestFetcher(context);
    const restParams = articleFetcher.formatRowToApi(
      newRow,
      metafieldKeyValueSets
    ) as Article['rest']['params']['create'];
    const response = await articleFetcher.create(restParams);
    return response?.body?.article?.id;
  },
});

export const Action_UpdateArticle = coda.makeFormula({
  name: 'UpdateArticle',
  description: 'Update an existing Shopify article and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.article.id,

    // optional parameters
    { ...inputs.general.author, optional: true },
    { ...inputs.blog.idOptionName, name: 'blogId', optional: true },
    { ...inputs.article.bodyHtml, optional: true },
    { ...inputs.article.summaryHtml, optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.imageUrl, optional: true },
    { ...inputs.general.imageAlt, optional: true },
    { ...inputs.general.published, description: 'Whether the article is visible.', optional: true },
    { ...inputs.general.publishedAt, description: 'The date and time when the article was published.', optional: true },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.article.templateSuffix, optional: true },
    { ...inputs.general.title, description: 'The title of the article.', optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Article'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ArticleSchema, Identity.Article),
  schema: articleResource.schema,
  execute: async function (
    [
      articleId,
      author,
      blog,
      bodyHtml,
      summaryHtml,
      handle,
      imageUrl,
      imageAlt,
      published,
      publishedAt,
      tags,
      templateSuffix,
      title,
      metafields,
    ],
    context
  ) {
    let row: Article['codaRow'] = {
      id: articleId,
      author,
      blog_id: blog ? parseOptionId(blog) : undefined,
      body_html: bodyHtml,
      summary_html: summaryHtml,
      handle,
      published_at: publishedAt,
      tags: tags ? tags.join(',') : undefined,
      template_suffix: templateSuffix,
      title,
      published,
      image_alt_text: imageAlt,
      image_url: imageUrl,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    const articleFetcher = new ArticleRestFetcher(context);
    return articleFetcher.updateWithMetafields({ original: undefined, updated: row }, metafieldKeyValueSets);
  },
});

export const Action_DeleteArticle = coda.makeFormula({
  name: 'DeleteArticle',
  description: 'Delete an existing Shopify article and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.article.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async ([articleId], context) => {
    await new ArticleRestFetcher(context).delete(articleId);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Article = coda.makeFormula({
  name: 'Article',
  description: 'Return a single article from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.article.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: articleResource.schema,
  execute: async ([articleId], context) => {
    const articleFetcher = new ArticleRestFetcher(context);
    const response = await articleFetcher.fetch(articleId);
    if (response.body?.article) {
      return articleFetcher.formatApiToRow(response.body.article);
    }
  },
});

export const Format_Article: coda.Format = {
  name: 'Article',
  instructions: 'Paste the article ID into the column.',
  formulaName: 'Article',
};
// #endregion
