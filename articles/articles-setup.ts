// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CACHE_DEFAULT,
  IDENTITY_ARTICLE,
  METAFIELD_PREFIX_KEY,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  deleteArticleRest,
  formatArticleForSchemaFromRestApi,
  validateArticleParams,
  handleArticleUpdateJob,
  fetchSingleArticleRest,
  createArticleRest,
  updateArticleRest,
} from './articles-functions';

import { ArticleSyncTableSchema, articleFieldDependencies } from '../schemas/syncTable/ArticleSchema';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { sharedParameters } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, parseOptionId, wrapGetSchemaForCli } from '../helpers';
import { SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldsRest,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { ArticleCreateRestParams, ArticleSyncTableRestParams, ArticleUpdateRestParams } from '../types/Article';
import { autocompleteBlogParameterWithName } from '../blogs/blogs-functions';
import { getTemplateSuffixesFor, makeAutocompleteTemplateSuffixesFor } from '../themes/themes-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { restResources } from '../types/RequestsRest';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';

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

const parameters = {
  articleID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'articleID',
    description: 'The ID of the article.',
  }),
  // blogId: coda.makeParameter({
  //   type: coda.ParameterType.Number,
  //   name: 'blogId',
  //   description: 'The ID of the blog containing the article.',
  //   autocomplete: autocompleteBlogIdParameter,
  // }),
  blogIdOptionName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'blogId',
    description: 'The ID of the blog containing the article.',
    autocomplete: autocompleteBlogParameterWithName,
  }),
  filterBlogs: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'blogs',
    description: 'Only fetch articles from the specified blog IDs.',
    autocomplete: autocompleteBlogParameterWithName,
  }),
  published_status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'Retrieve results based on their published status.',
    optional: true,
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  summaryHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'summaryHtml',
    description:
      'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
  }),
  templateSuffix: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('article'),
    description:
      'The suffix of the Liquid template used for the article. If this property is null, then the article uses the default template.',
  }),
  tag: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'tag',
    description: 'Filter articles with a specific tag.',
    optional: true,
  }),
};

// #region Sync tables
export const Sync_Articles = coda.makeSyncTable({
  name: 'Articles',
  description:
    "Return Articles from this shop. You can also fetch metafields by selecting them in advanced settings but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for articles, we have to do a separate Rest call for each blog to get its metafields).",
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
      sharedParameters.optionalSyncMetafields,
      { ...parameters.filterBlogs, optional: true },
      { ...sharedParameters.filterAuthor, optional: true },
      { ...sharedParameters.filterCreatedAtRange, optional: true },
      { ...sharedParameters.filterUpdatedAtRange, optional: true },
      { ...sharedParameters.filterPublishedAtRange, optional: true },
      { ...sharedParameters.filterHandle, optional: true },
      { ...parameters.published_status, optional: true },
      { ...parameters.tag, optional: true },
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
      validateArticleParams(restParams);

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
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${currentBlogId}/articles.json`,
            restParams
          );
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles.json`,
            restParams
          );
        }
      }

      let restResult = [];
      let { response, continuation } = await makeSyncTableGetRequest(
        {
          url,
          extraContinuationData: { blogIdsLeft },
        },
        context
      );
      if (response?.body?.articles) {
        restResult = response.body.articles.map((article) => formatArticleForSchemaFromRestApi(article, context));
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
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Article }, context)
        : [];

      const jobs = updates.map((update) => handleArticleUpdateJob(update, metafieldDefinitions, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
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
    parameters.blogIdOptionName,
    { ...sharedParameters.inputTitle, description: 'The title of the article.' },

    // optional parameters
    { ...sharedParameters.inputAuthor, description: 'The name of the author of the article.', optional: true },
    { ...sharedParameters.inputBodyHtml, optional: true },
    { ...parameters.summaryHtml, optional: true },
    { ...sharedParameters.inputHandle, optional: true },
    { ...sharedParameters.inputImageUrl, optional: true },
    { ...sharedParameters.inputImageAlt, optional: true },
    { ...sharedParameters.inputPublished, description: 'Whether the article is visible.', optional: true },
    {
      ...sharedParameters.inputPublishedAt,
      description: 'The date and time when the article was published.',
      optional: true,
    },
    { ...sharedParameters.inputTags, optional: true },
    { ...parameters.templateSuffix, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Article metafields to create.' },
  ],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async (
    [
      blog,
      title,
      author,
      bodyHtml,
      summary_html,
      handle,
      imageUrl,
      imageAlt,
      published,
      publishedAt,
      tags,
      templateSuffix,
      metafields,
    ],
    context
  ) => {
    const restParams: ArticleCreateRestParams = {
      blog_id: parseOptionId(blog),
      title,
      author,
      body_html: bodyHtml,
      summary_html,
      handle,
      published_at: publishedAt,
      tags: tags ? tags.join(',') : undefined,
      template_suffix: templateSuffix,
      // default to unpublished for article creation
      published: published !== undefined ? published : false,
    };

    if (imageUrl) {
      restParams.image = {
        ...(restParams.image ?? {}),
        src: imageUrl,
      };
      if (imageAlt) {
        restParams.image.alt = imageAlt;
      }
    }

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((m) => JSON.parse(m));
      const metafieldRestInputs = parsedMetafieldKeyValueSets
        .map(formatMetafieldRestInputFromMetafieldKeyValueSet)
        .filter(Boolean);
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createArticleRest(restParams, context);
    return response.body.article.id;
  },
});

export const Action_UpdateArticle = coda.makeFormula({
  name: 'UpdateArticle',
  description: 'Update an existing Shopify article and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    parameters.articleID,

    // optional parameters
    { ...sharedParameters.inputAuthor, description: 'The name of the author of the article.', optional: true },
    { ...parameters.blogIdOptionName, optional: true },
    { ...sharedParameters.inputBodyHtml, optional: true },
    { ...parameters.summaryHtml, optional: true },
    { ...sharedParameters.inputHandle, optional: true },
    { ...sharedParameters.inputImageUrl, optional: true },
    { ...sharedParameters.inputImageAlt, optional: true },
    { ...sharedParameters.inputPublished, description: 'Whether the article is visible.', optional: true },
    {
      ...sharedParameters.inputPublishedAt,
      description: 'The date and time when the article was published.',
      optional: true,
    },
    { ...sharedParameters.inputTags, optional: true },
    { ...parameters.templateSuffix, optional: true },
    { ...sharedParameters.inputTitle, description: 'The title of the article.', optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Article metafields to update.' },
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
    const restParams: ArticleUpdateRestParams = {
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
    };
    if (imageUrl) {
      restParams.image = { ...(restParams.image ?? {}), src: imageUrl };
    }
    if (imageAlt) {
      restParams.image = { ...(restParams.image ?? {}), alt: imageAlt };
    }

    const promises: (Promise<any> | undefined)[] = [];
    promises.push(updateArticleRest(articleId, restParams, context));
    if (metafields && metafields.length) {
      promises.push(
        updateAndFormatResourceMetafieldsRest(
          {
            ownerId: articleId,
            ownerResource: restResources.Article,
            metafieldKeyValueSets: metafields.map((s) => JSON.parse(s)),
            schemaWithIdentity: false,
          },
          context
        )
      );
    } else {
      promises.push(undefined);
    }

    const [restResponse, updatedFormattedMetafields] = await Promise.all(promises);
    const obj = {
      id: articleId,
      ...(restResponse?.body?.article ? formatArticleForSchemaFromRestApi(restResponse.body.article, context) : {}),
      ...(updatedFormattedMetafields ?? {}),
    };

    return obj;
  },
});

export const Action_DeleteArticle = coda.makeFormula({
  name: 'DeleteArticle',
  description: 'Delete an existing Shopify article and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.articleID],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async ([articleId], context) => {
    await deleteArticleRest(articleId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Article = coda.makeFormula({
  name: 'Article',
  description: 'Return a single article from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.articleID],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ArticleSyncTableSchema,
  execute: async ([articleId], context) => {
    const articleResponse = await fetchSingleArticleRest(articleId, context);
    if (articleResponse.body?.article) {
      return formatArticleForSchemaFromRestApi(articleResponse.body.article, context);
    }
  },
});

export const Format_Article: coda.Format = {
  name: 'Article',
  instructions: 'Paste the article ID into the column.',
  formulaName: 'Article',
};
// #endregion
