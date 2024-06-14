// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ArticleClient } from '../../Clients/RestClients';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { optionValues } from '../utils/coda-utils';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { ArticleModel } from '../../models/rest/ArticleModel';
import { getTemplateSuffixesFor } from '../../models/rest/AssetModel';
import { ArticleSyncTableSchema } from '../../schemas/syncTable/ArticleSchema';
import { SyncedArticles } from '../../sync/rest/SyncedArticles';
import { assertAllowedValue, isNullishOrEmpty, parseOptionId } from '../../utils/helpers';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../utils/coda-parameters';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../utils/coda-utils';

// #endregion

// #region Helper functions
function createSyncedArticles(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedArticles({
    context,
    codaSyncParams,
    model: ArticleModel,
    client: ArticleClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({ published_status }: { published_status?: string }) {
  const invalidMsg: string[] = [];
  if (
    !isNullishOrEmpty(published_status) &&
    !assertAllowedValue(published_status, optionValues(OPTIONS_PUBLISHED_STATUS))
  ) {
    invalidMsg.push(`publishedStatus: ${published_status}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync tables
export const Sync_Articles = coda.makeSyncTable({
  name: 'Articles',
  description:
    "Return Articles from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for articles, we have to do a separate Rest call for each article to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Article,
  schema: SyncedArticles.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedArticles.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor({ kind: 'article', context });
      }
    },
  },
  formula: {
    name: 'SyncArticles',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedArticles.codaParamsMap}
     */
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
      { ...filters.general.tagsArray, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedArticles(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedArticles(codaSyncParams, context).executeSyncUpdate(updates),
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
    const article = ArticleModel.createInstanceFromRow(context, {
      id: undefined,
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
    });
    if (metafields) {
      article.data.metafields = CodaMetafieldSet.createRestMetafieldsArray(metafields, {
        context,
        ownerResource: ArticleModel.metafieldRestOwnerType,
      });
    }

    await article.save();
    return article.data.id;
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
  // schema: coda.withIdentity(ArticleSyncTableSchema, IdentitiesNew.article),
  schema: ArticleSyncTableSchema,
  execute: async function (
    [
      id,
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
    const article = ArticleModel.createInstanceFromRow(context, {
      id,
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
    });
    if (metafields) {
      article.data.metafields = CodaMetafieldSet.createRestMetafieldsArray(metafields, {
        context,
        ownerResource: ArticleModel.metafieldRestOwnerType,
        ownerId: id,
      });
    }

    await article.save();
    return article.toCodaRow();
  },
});

export const Action_DeleteArticle = makeDeleteRestResourceAction({
  modelName: ArticleModel.displayName,
  IdParameter: inputs.article.id,
  execute: async ([itemId], context) => {
    await ArticleClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Article = makeFetchSingleRestResourceAction({
  modelName: ArticleModel.displayName,
  IdParameter: inputs.article.id,
  schema: SyncedArticles.staticSchema,
  execute: async ([itemId], context) => {
    const response = await ArticleClient.createInstance(context).single({ id: itemId as number });
    return ArticleModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Article: coda.Format = {
  name: 'Article',
  instructions: 'Paste the article ID into the column.',
  formulaName: 'Article',
};
// #endregion
