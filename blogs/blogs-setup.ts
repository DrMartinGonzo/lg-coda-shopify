// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CACHE_DEFAULT,
  IDENTITY_BLOG,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  fetchSingleBlogRest,
  deleteBlogRest,
  createBlogRest,
  validateBlogParams,
  formatBlogForSchemaFromRestApi,
  handleBlogUpdateJob,
  updateBlogRest,
} from './blogs-functions';

import { BlogSyncTableSchema, blogFieldDependencies } from '../schemas/syncTable/BlogSchema';
import { filters, inputs } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldsRest,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { BlogCreateRestParams, BlogSyncTableRestParams, BlogUpdateRestParams } from '../types/Blog';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { MetafieldOwnerType } from '../types/admin.types';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { restResources } from '../types/RequestsRest';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';

// #endregion

async function getBlogSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = BlogSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(BlogSyncTableSchema, MetafieldOwnerType.Blog, context);
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync tables
export const Sync_Blogs = coda.makeSyncTable({
  name: 'Blogs',
  description:
    "Return Blogs from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for blogs, we have to do a separate Rest call for each blog to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_BLOG,
  schema: BlogSyncTableSchema,
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
    parameters: [
      {
        ...filters.general.syncMetafields,
        description:
          "description: 'Also retrieve metafields. Not recommanded if you have lots of blogs, the sync will be much slower as the pack will have to do another API call for each blog. Waiting for Shopify to add GraphQL access to blogs...',",
        optional: true,
      },
    ],
    execute: async function ([syncMetafields], context) {
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getBlogSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

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
      let { response, continuation } = await makeSyncTableGetRequest({ url }, context);
      if (response?.body?.blogs) {
        restResult = response.body.blogs.map((blog) => formatBlogForSchemaFromRestApi(blog, context));
      }

      // Add metafields by doing multiple Rest Admin API calls
      if (shouldSyncMetafields) {
        restResult = await Promise.all(
          restResult.map(async (resource) => {
            const response = await fetchMetafieldsRest(resource.id, restResources.Blog, {}, context);

            // Only keep metafields that have a definition are in the schema
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

      return { result: restResult, continuation };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Blog }, context)
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
export const Action_UpdateBlog = coda.makeFormula({
  name: 'UpdateBlog',
  description: 'Update an existing Shopify Blog and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.blog.id,
    // optional parameters
    { ...inputs.general.title, description: 'The title of the blog.', optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.blog.commentable, optional: true },
    { ...inputs.blog.templateSuffix, optional: true },
    { ...inputs.general.metafields, optional: true, description: 'Blog metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(BlogSchema, IDENTITY_BLOG),
  schema: BlogSyncTableSchema,
  execute: async function ([blogId, title, handle, commentable, templateSuffix, metafields], context) {
    const restParams: BlogUpdateRestParams = {
      title,
      handle,
      commentable,
      template_suffix: templateSuffix,
    };

    const promises: (Promise<any> | undefined)[] = [];
    promises.push(updateBlogRest(blogId, restParams, context));
    if (metafields && metafields.length) {
      promises.push(
        updateAndFormatResourceMetafieldsRest(
          {
            ownerId: blogId,
            ownerResource: restResources.Blog,
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
      id: blogId,
      ...(restResponse?.body?.blog ? formatBlogForSchemaFromRestApi(restResponse.body.blog, context) : {}),
      ...(updatedFormattedMetafields ?? {}),
    };

    return obj;
  },
});

export const Action_CreateBlog = coda.makeFormula({
  name: 'CreateBlog',
  description: `Create a new Shopify Blog and return its ID.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.general.title, description: 'The title of the blog.' },

    // optional parameters
    { ...inputs.general.handle, optional: true },
    { ...inputs.blog.commentable, optional: true },
    { ...inputs.blog.templateSuffix, optional: true },
    { ...inputs.general.metafields, optional: true, description: 'Blog metafields to create.' },
  ],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function ([title, handle, commentable, templateSuffix, metafields], context) {
    const restParams: BlogCreateRestParams = {
      title,
      commentable,
      handle,
      template_suffix: templateSuffix,
    };

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((m) => JSON.parse(m));
      const metafieldRestInputs = parsedMetafieldKeyValueSets
        .map(formatMetafieldRestInputFromMetafieldKeyValueSet)
        .filter(Boolean);
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createBlogRest(restParams, context);
    return response.body.blog.id;
  },
});

export const Action_DeleteBlog = coda.makeFormula({
  name: 'DeleteBlog',
  description: 'Delete an existing Shopify Blog and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.blog.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([blogId], context) {
    await deleteBlogRest(blogId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Blog = coda.makeFormula({
  name: 'Blog',
  description: 'Return a single Blog from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.blog.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: BlogSyncTableSchema,
  execute: async ([blogId], context) => {
    const blogResponse = await fetchSingleBlogRest(blogId, context);
    if (blogResponse.body?.blog) {
      return formatBlogForSchemaFromRestApi(blogResponse.body.blog, context);
    }
  },
});

export const Format_Blog: coda.Format = {
  name: 'Blog',
  instructions: 'Paste the blog ID into the column.',
  formulaName: 'Blog',
};
// #endregion
