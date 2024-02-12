import * as coda from '@codahq/packs-sdk';

import {
  CACHE_MINUTE,
  IDENTITY_BLOG,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  fetchBlogRest,
  deleteBlogRest,
  createBlogRest,
  validateBlogParams,
  formatBlogForSchemaFromRestApi,
  handleBlogUpdateJob,
  formatBlogStandardFieldsRestParams,
} from './blogs-functions';

import { BlogSchema, blogFieldDependencies } from '../schemas/syncTable/BlogSchema';
import { sharedParameters } from '../shared-parameters';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { augmentSchemaWithMetafields } from '../metafields/metafields-functions';
import { arrayUnique, compareByDisplayKey, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  fetchResourceMetafields,
  findMatchingMetafieldDefinition,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
  getResourceMetafieldsRestUrl,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import { BlogCreateRestParams, BlogSyncTableRestParams } from '../types/Blog';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import { MetafieldOwnerType, MetafieldRestInput } from '../types/Metafields';
import { getTemplateSuffixesFor } from '../themes/themes-functions';

async function getBlogSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = BlogSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(BlogSchema, MetafieldOwnerType.Blog, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

/**
 * The properties that can be updated when updating a blog.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'Title', key: 'title', type: 'string' },
  { display: 'Handle', key: 'handle', type: 'string' },
  { display: 'Commentable', key: 'commentable', type: 'string' },
  { display: 'Template suffix', key: 'template_suffix', type: 'string' },
];
/**
 * The properties that can be updated when creating a blog.
 */
const standardCreateProps = [...standardUpdateProps.filter((prop) => prop.key !== 'title')];

const parameters = {
  blogId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'blogId',
    description: 'The Id of the blog.',
  }),
  inputTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the page.',
  }),
  // inputHandle: coda.makeParameter({
  //   type: coda.ParameterType.String,
  //   name: 'handle',
  //   description: 'The handle of the page.',
  // }),
};

export const setupBlogs = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync tables
  pack.addSyncTable({
    name: 'Blogs',
    description:
      "Return Blogs from this shop. You can also fetch metafields by selecting them in advanced settings but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for blogs, we have to do a separate Rest call for each blog to get its metafields).",
    identityName: IDENTITY_BLOG,
    schema: BlogSchema,
    dynamicOptions: {
      getSchema: getBlogSchema,
      defaultAddDynamicColumns: false,
      propertyOptions: async function (context) {
        if (context.propertyName === 'template_suffix') {
          return getTemplateSuffixesFor('blog', context);
        }
      },
    },
    formula: {
      name: 'SyncBlogs',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [sharedParameters.optionalSyncMetafields],
      execute: async function ([syncMetafields], context) {
        const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getBlogSchema, context, { syncMetafields }));
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
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Blog, context));
        }

        const syncedStandardFields = handleFieldDependencies(standardFromKeys, blogFieldDependencies);
        const restParams: BlogSyncTableRestParams = cleanQueryParams({
          fields: syncedStandardFields.join(', '),
          limit: shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
        });
        validateBlogParams(restParams);

        let url =
          prevContinuation?.nextUrl ??
          coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`, restParams);

        let restResult = [];
        let { response, continuation } = await makeSyncTableGetRequest(
          { url, extraContinuationData: { metafieldDefinitions } },
          context
        );
        if (response && response.body?.blogs) {
          restResult = response.body.blogs.map((blog) => formatBlogForSchemaFromRestApi(blog, context));
        }

        // Add metafields by doing multiple Rest Admin API calls
        if (shouldSyncMetafields) {
          restResult = await Promise.all(
            restResult.map(async (resource) => {
              const response = await fetchResourceMetafields(
                getResourceMetafieldsRestUrl('blogs', resource.id, context),
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

        return { result: restResult, continuation };
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (params, updates, context) {
        const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
        const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
        const metafieldDefinitions = hasUpdatedMetaFields
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Blog, context)
          : [];

        const jobs = updates.map((update) => handleBlogUpdateJob(update, metafieldDefinitions, context));
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
  // UpdateBlog action
  pack.addFormula({
    name: 'UpdateBlog',
    description: 'Update an existing Shopify Blog and return the updated data.',
    parameters: [parameters.blogId],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The customer property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(MetafieldOwnerType.Blog, context, CACHE_MINUTE);
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: BlogSchema,
    // schema: coda.withIdentity(BlogSchema, IDENTITY_BLOG),
    execute: async function ([blog_id, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      // TODO: type is not perfect here
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Blog, context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: blog_id },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

      return handleBlogUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // CreateBlog action
  pack.addFormula({
    name: 'CreateBlog',
    description: `Create a new Shopify Blog and return its ID.`,
    parameters: [parameters.inputTitle],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The customer property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(MetafieldOwnerType.Blog, context, CACHE_MINUTE);
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([title, ...varargs], context) {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Blog, context);

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

      const params: BlogCreateRestParams = {
        title,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
        // @ts-ignore
        ...formatBlogStandardFieldsRestParams(standardFromKeys, newValues),
      };

      const response = await createBlogRest(params, context);
      return response.body.blog.id;
    },
  });

  // DeleteBlog action
  pack.addFormula({
    name: 'DeleteBlog',
    description: 'Delete an existing Shopify Blog and return true on success.',
    parameters: [parameters.blogId],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([blogId], context) {
      await deleteBlogRest(blogId, context);
      return true;
    },
  });
  // #endregion

  // #region Formulas
  // Blog formula
  pack.addFormula({
    name: 'Blog',
    description: 'Return a single Blog from this shop.',
    parameters: [parameters.blogId],
    // TODO: check cacheTtlSecs for all single fetch formulas
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: BlogSchema,
    execute: async ([blogId], context) => {
      const blogResponse = await fetchBlogRest(blogId, context);
      if (blogResponse.body?.blog) {
        return formatBlogForSchemaFromRestApi(blogResponse.body.blog, context);
      }
    },
  });

  // Blog Column Format
  pack.addColumnFormat({
    name: 'Blog',
    instructions: 'Paste the blog Id into the column.',
    formulaName: 'Blog',
  });
  // #endregion
};
