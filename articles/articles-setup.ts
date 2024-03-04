// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT, IDENTITY_ARTICLE, REST_DEFAULT_LIMIT } from '../constants';
import { ArticleRestFetcher } from './articles-functions';

import { ArticleSyncTableSchema, articleFieldDependencies } from '../schemas/syncTable/ArticleSchema';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { filters, inputs } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  parseMetafieldsCodaInput,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import { handleFieldDependencies, parseOptionId, wrapGetSchemaForCli } from '../helpers';
import { SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldsRest,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { restResources } from '../types/RequestsRest';

import type { ArticleCreateRestParams, ArticleSyncTableRestParams } from '../types/Article';
import type { ArticleRow } from '../types/CodaRows';
import type { Article as ArticleRest } from '@shopify/shopify-api/rest/admin/2023-10/article';

// #endregion

async function getArticleSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = ArticleSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(ArticleSyncTableSchema, MetafieldOwnerType.Article, context);
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync tables
export const Sync_Articles = coda.makeSyncTable({
  name: 'Articles',
  description:
    "Return Articles from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for articles, we have to do a separate Rest call for each article to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_ARTICLE,
  schema: ArticleSyncTableSchema,
  dynamicOptions: {
    getSchema: getArticleSchema,
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor('article', context);
      }
    },
  },
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
    execute: async function (
      [syncMetafields, restrictToBlogIds, author, createdAt, updatedAt, publishedAt, handle, publishedStatus, tag],
      context
    ) {
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getArticleSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      const syncedStandardFields = handleFieldDependencies(standardFromKeys, articleFieldDependencies);
      const restParams: ArticleSyncTableRestParams = cleanQueryParams({
        fields: syncedStandardFields.join(', '),
        limit: shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
        author,
        tag,
        handle,
        published_status: publishedStatus,
        created_at_min: createdAt ? createdAt[0] : undefined,
        created_at_max: createdAt ? createdAt[1] : undefined,
        updated_at_min: updatedAt ? updatedAt[0] : undefined,
        updated_at_max: updatedAt ? updatedAt[1] : undefined,
        published_at_min: publishedAt ? publishedAt[0] : undefined,
        published_at_max: publishedAt ? publishedAt[1] : undefined,
      });

      const articleFetcher = new ArticleRestFetcher(context);
      articleFetcher.validateParams(restParams);

      let url: string;
      let blogIdsLeft = prevContinuation?.extraContinuationData?.blogIdsLeft ?? [];

      // Should trigger only on first run when user has specified the blogs he
      // wants to sync articles from
      if (!blogIdsLeft.length && restrictToBlogIds && restrictToBlogIds.length) {
        blogIdsLeft = restrictToBlogIds.map(parseOptionId);
      }

      if (prevContinuation?.nextUrl) {
        url = prevContinuation.nextUrl;
      } else {
        // User has specified the blogs he wants to sync articles from
        if (blogIdsLeft.length) {
          const currentBlogId: number = blogIdsLeft.shift();
          url = articleFetcher.getFetchAllFromBlogUrl(currentBlogId, restParams);
        } else {
          url = articleFetcher.getFetchAllUrl(restParams);
        }
      }

      let restResult = [];
      let { response, continuation } = await makeSyncTableGetRequest<{ articles: ArticleRest[] }>(
        {
          url,
          extraContinuationData: { blogIdsLeft },
        },
        context
      );
      if (response?.body?.articles) {
        restResult = response.body.articles.map((article) => articleFetcher.formatApiToRow(article));
      }

      // Add metafields by doing multiple Rest Admin API calls
      if (shouldSyncMetafields) {
        restResult = await Promise.all(
          restResult.map(async (resource) => {
            const response = await fetchMetafieldsRest(resource.id, restResources.Article, {}, context);

            // Only keep metafields that have a definition and in the schema
            const metafields = response.body.metafields.filter((m) =>
              effectiveMetafieldKeys.includes(getMetaFieldFullKey(m))
            );
            if (metafields.length) {
              metafields.forEach((metafield) => {
                const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
                resource[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
              });
            }
            return resource;
          })
        );
      }

      // If we still have blogs left to fetch articles from, we create a
      // continuation object to force the next sync
      if (blogIdsLeft.length && !continuation?.nextUrl) {
        // @ts-ignore
        continuation = {
          ...continuation,
          extraContinuationData: {
            blogIdsLeft,
          },
        };
      }

      return { result: restResult, continuation };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return new ArticleRestFetcher(context).executeSyncTableUpdate(updates);
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
    { ...inputs.general.metafields, optional: true, description: 'Article metafields to create.' },
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
    let newRow: Partial<ArticleRow> = {
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
    const restParams = articleFetcher.formatRowToApi(newRow, metafieldKeyValueSets) as ArticleCreateRestParams;
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
    { ...inputs.general.metafields, optional: true, description: 'Article metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ArticleSchema, IDENTITY_ARTICLE),
  schema: ArticleSyncTableSchema,
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
    let row: ArticleRow = {
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
  schema: ArticleSyncTableSchema,
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
