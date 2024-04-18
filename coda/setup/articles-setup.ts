// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromRow } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { Article } from '../../Resources/Rest/Article';
import { Asset } from '../../Resources/Rest/Asset';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { ArticleRow } from '../../schemas/CodaRows.types';
import { ArticleSyncTableSchema } from '../../schemas/syncTable/ArticleSchema';
import { parseOptionId } from '../../utils/helpers';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #region Sync tables
export const Sync_Articles = coda.makeSyncTable({
  name: 'Articles',
  description:
    "Return Articles from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for articles, we have to do a separate Rest call for each article to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Article,
  schema: ArticleSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Article.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return Asset.getTemplateSuffixesFor({ kind: 'article', context });
      }
    },
  },
  formula: {
    name: 'SyncArticles',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Article.getDynamicSchema}
     *  - {@link Article.makeSyncTableManagerSyncFunction}
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
      { ...filters.general.tagLOL, optional: true },
    ],
    execute: async function (params, context) {
      return Article.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Article.syncUpdate(params, updates, context);
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
    const fromRow: FromRow<ArticleRow> = {
      row: {
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
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_resource: Article.metafieldRestOwnerType })
      ),
    };

    const newArticle = new Article({ context, fromRow });
    await newArticle.saveAndUpdate();
    return newArticle.apiData.id;
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
    const fromRow: FromRow<ArticleRow> = {
      row: {
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
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: articleId, owner_resource: Article.metafieldRestOwnerType })
      ),
    };

    const updatedArticle = new Article({ context, fromRow });
    await updatedArticle.saveAndUpdate();
    return updatedArticle.formatToRow();
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
    await Article.delete({ context, id: articleId });
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
    const article = await Article.find({ context, id: articleId });
    return article.formatToRow();
  },
});

export const Format_Article: coda.Format = {
  name: 'Article',
  instructions: 'Paste the article ID into the column.',
  formulaName: 'Article',
};
// #endregion
