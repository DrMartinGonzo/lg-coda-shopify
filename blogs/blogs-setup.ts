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

import { BlogSchema, COMMENTABLE_OPTIONS, blogFieldDependencies } from '../schemas/syncTable/BlogSchema';
import { sharedParameters } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  updateResourceMetafieldsFromSyncTableRest,
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
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import { MetafieldOwnerType } from '../types/admin.types';
import { getTemplateSuffixesFor, makeAutocompleteTemplateSuffixesFor } from '../themes/themes-functions';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { restResources } from '../types/RequestsRest';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';

// #endregion

async function getBlogSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = BlogSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(BlogSchema, MetafieldOwnerType.Blog, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

const parameters = {
  blogId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'blogId',
    description: 'The ID of the blog.',
  }),
  commentable: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'commentable',
    description: 'Whether readers can post comments to the blog and if comments are moderated or not.',
    autocomplete: COMMENTABLE_OPTIONS,
  }),
  inputTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the page.',
  }),
  templateSuffix: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('blog'),
    description:
      'The suffix of the Liquid template used for the blog. If this property is null, then the blog uses the default template.',
  }),
};

// #region Sync tables
export const Sync_Blogs = coda.makeSyncTable({
  name: 'Blogs',
  description:
    "Return Blogs from this shop. You can also fetch metafields by selecting them in advanced settings but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for blogs, we have to do a separate Rest call for each blog to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
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
            const metafields: MetafieldRest[] = response.body.metafields.filter((meta: MetafieldRest) =>
              effectiveMetafieldKeys.includes(getMetaFieldFullKey(meta))
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
    parameters.blogId,
    // optional parameters
    { ...sharedParameters.inputTitle, description: 'The title of the blog.', optional: true },
    { ...sharedParameters.inputHandle, optional: true },
    { ...parameters.commentable, optional: true },
    { ...parameters.templateSuffix, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Blog metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: BlogSchema,
  // schema: coda.withIdentity(BlogSchema, IDENTITY_BLOG),
  execute: async function ([blogId, title, handle, commentable, templateSuffix, metafields], context) {
    const restParams: BlogUpdateRestParams = {
      title,
      handle,
      commentable,
      template_suffix: templateSuffix,
    };

    let obj = { id: blogId };

    const restResponse = await updateBlogRest(blogId, restParams, context);
    if (restResponse.body?.blog) {
      obj = {
        ...obj,
        ...formatBlogForSchemaFromRestApi(restResponse.body.blog, context),
      };
    }

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((s) => JSON.parse(s));
      const updatedMetafieldFields = await updateResourceMetafieldsFromSyncTableRest(
        blogId,
        restResources.Blog,
        parsedMetafieldKeyValueSets,
        context
      );
    }

    return obj;
  },
});

export const Action_CreateBlog = coda.makeFormula({
  name: 'CreateBlog',
  description: `Create a new Shopify Blog and return its ID.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...sharedParameters.inputTitle, description: 'The title of the blog.' },

    // optional parameters
    { ...sharedParameters.inputHandle, optional: true },
    { ...parameters.commentable, optional: true },
    { ...parameters.templateSuffix, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Blog metafields to create.' },
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
        .filter((m) => m);
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
export const Formula_Blog = coda.makeFormula({
  name: 'Blog',
  description: 'Return a single Blog from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.blogId],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: BlogSchema,
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
