import * as coda from '@codahq/packs-sdk';

import {
  CACHE_MINUTE,
  IDENTITY_ARTICLE,
  METAFIELD_PREFIX_KEY,
  OPTIONS_PUBLISHED_STATUS,
  RESOURCE_ARTICLE,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  deleteArticleRest,
  formatArticleForSchemaFromRestApi,
  validateArticleParams,
  handleArticleUpdateJob,
  fetchArticleRest,
  createArticleRest,
  formatArticleStandardFieldsRestParams,
} from './articles-functions';

import { ArticleSchema, articleFieldDependencies } from './articles-schema';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { sharedParameters } from '../shared-parameters';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import { arrayUnique, compareByDisplayKey, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  fetchResourceMetafields,
  getMetaFieldRealFromKey,
  separatePrefixedMetafieldsKeysFromKeys,
  formatMetafieldsForSchema,
  getResourceMetafieldsRestUrl,
  splitMetaFieldFullKey,
  findMatchingMetafieldDefinition,
} from '../metafields/metafields-functions';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import { ArticleCreateRestParams, ArticleSyncTableRestParams } from '../types/Article';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { MetafieldRestInput } from '../types/Metafields';
import { autocompleteBlogIdParameter } from '../blogs/blogs-functions';
import { MetafieldOwnerType } from '../types/Metafields';

async function getArticleSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = ArticleSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(ArticleSchema, MetafieldOwnerType.Article, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

/**
 * The properties that can be updated when updating a article.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'Author', key: 'author', type: 'string' },
  { display: 'Blog', key: 'blog', type: 'string' },
  { display: 'Body HTML', key: 'body_html', type: 'string' },
  { display: 'Summary HTML', key: 'summary_html', type: 'string' },
  { display: 'Handle', key: 'handle', type: 'string' },
  { display: 'Image URL', key: 'image_url', type: 'string' },
  { display: 'Image alt text', key: 'image_alt_text', type: 'string' },
  { display: 'Published', key: 'published', type: 'boolean' },
  { display: 'Published at', key: 'published_at', type: 'string' },
  { display: 'Tags', key: 'tags', type: 'string' },
  { display: 'Template suffix', key: 'template_suffix', type: 'string' },
  { display: 'Title', key: 'title', type: 'string' },
];

const standardCreateProps = [
  ...standardUpdateProps.filter((prop) => prop.key !== 'title' && prop.key !== 'blog'),
  // { display: 'Image URL', key: 'image_url', type: 'string' },
];

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
  blogId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'blogId',
    description: 'The Id of the blog containing the article.',
  }),
  restrict_to_blogs: coda.makeParameter({
    //! Should be NumberArray but it doesn't seem to work…
    type: coda.ParameterType.StringArray,
    name: 'blogs',
    description: 'Only fetch articles from the specified blog IDs.',
    autocomplete: autocompleteBlogIdParameter,
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
  // #region Sync tables
  pack.addSyncTable({
    name: 'Articles',
    description:
      "Return Articles from this shop. You can also fetch metafields by selection them in advanced settings but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for articles, we have to do a separate Rest call for each blog to get its metafields).",
    identityName: IDENTITY_ARTICLE,
    schema: ArticleSchema,
    dynamicOptions: {
      getSchema: getArticleSchema,
      defaultAddDynamicColumns: false,
    },
    formula: {
      name: 'SyncArticles',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        sharedParameters.optionalSyncMetafields,
        { ...parameters.restrict_to_blogs, optional: true },
        { ...parameters.author, optional: true },
        { ...sharedParameters.filterCreatedAtRange, optional: true },
        { ...sharedParameters.filterUpdatedAtRange, optional: true },
        { ...sharedParameters.filterPublishedAtRange, optional: true },
        { ...parameters.handle, optional: true },
        { ...parameters.published_status, optional: true },
        { ...parameters.tag, optional: true },
      ],
      execute: async function (
        [syncMetafields, restrictToBlogIds, author, createdAt, updatedAt, publishedAt, handle, publishedStatus, tag],
        context
      ) {
        const schema =
          context.sync.schema ?? (await wrapGetSchemaForCli(getArticleSchema, context, { syncMetafields }));
        const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
        const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

        let metafieldDefinitions: MetafieldDefinitionFragment[] = [];
        if (shouldSyncMetafields) {
          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Article, context));
        }

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
          blogIdsLeft = restrictToBlogIds;
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
          { url, extraContinuationData: { metafieldDefinitions, blogIdsLeft } },
          context
        );
        if (response && response.body?.articles) {
          restResult = response.body.articles.map((article) => formatArticleForSchemaFromRestApi(article, context));
        }

        // Add metafields by doing multiple Rest Admin API calls
        if (shouldSyncMetafields) {
          restResult = await Promise.all(
            restResult.map(async (resource) => {
              const response = await fetchResourceMetafields(
                getResourceMetafieldsRestUrl('articles', resource.id, context),
                {},
                context
              );

              // Only keep metafields that have a definition are in the schema
              const metafields: MetafieldRest[] = response.body.metafields.filter((meta: MetafieldRest) =>
                effectiveMetafieldKeys.includes(`${meta.namespace}.${meta.key}`)
              );
              if (metafields.length) {
                return {
                  ...resource,
                  ...formatMetafieldsForSchema(metafields, metafieldDefinitions),
                };
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
              metafieldDefinitions,
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
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Article, context)
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

  // #region Formulas
  pack.addFormula({
    name: 'Article',
    description: 'Return a single article from this shop.',
    parameters: [parameters.articleID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ArticleSchema,
    execute: async ([articleId], context) => {
      const articleResponse = await fetchArticleRest(articleId, context);
      if (articleResponse.body?.article) {
        return formatArticleForSchemaFromRestApi(articleResponse.body.article, context);
      }
    },
  });
  // #endregion

  // #region Actions
  // CreateArticle
  pack.addFormula({
    name: 'CreateArticle',
    description: 'Create a new Shopify article and return its ID. The article will be unpublished by default.',
    parameters: [parameters.blogId, parameters.title],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The article property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Article,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));

          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async ([blogId, title, ...varargs], context) => {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Article, context);

      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardCreateProps, metafieldUpdateCreateProps);
      const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(
        Object.keys(newValues)
      );

      // We can use Rest Admin API to create metafields
      let metafieldRestInputs: MetafieldRestInput[] = [];
      prefixedMetafieldFromKeys.forEach((fromKey) => {
        const realFromKey = getMetaFieldRealFromKey(fromKey);
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
        const matchingMetafieldDefinition = findMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
        const input: MetafieldRestInput = {
          namespace: metaNamespace,
          key: metaKey,
          value: newValues[fromKey],
          type: matchingMetafieldDefinition?.type.name,
        };
        metafieldRestInputs.push(input);
      });

      const params: ArticleCreateRestParams = {
        blog_id: blogId,
        title,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
        ...formatArticleStandardFieldsRestParams(standardFromKeys, newValues),
      };

      // default to unpublished for article creation
      if (params.published === undefined) {
        params.published = false;
      }

      const response = await createArticleRest(params, context);
      return response.body.article.id;
    },
  });

  // UpdateArticle
  pack.addFormula({
    name: 'UpdateArticle',
    description: 'Update an existing Shopify article and return the updated data.',
    parameters: [parameters.articleID],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The article property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Article,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(ArticleSchema, IDENTITY_ARTICLE),
    schema: ArticleSchema,
    execute: async function ([articleId, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Article, context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: articleId },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

      return handleArticleUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // DeleteArticle
  pack.addFormula({
    name: 'DeleteArticle',
    description: 'Delete an existing Shopify article and return true on success.',
    parameters: [parameters.articleID],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async ([articleId], context) => {
      await deleteArticleRest(articleId, context);
      return true;
    },
  });
  // #endregion
};
