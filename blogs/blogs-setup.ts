// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT, IDENTITY_BLOG, REST_DEFAULT_LIMIT } from '../constants';

import { BlogSyncTableSchema, blogFieldDependencies } from '../schemas/syncTable/BlogSchema';
import { filters, inputs } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  parseMetafieldsCodaInput,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import { handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldsRest,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { MetafieldOwnerType } from '../types/admin.types';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { restResources } from '../types/RequestsRest';
import { BlogRestFetcher } from './blogs-functions';

import type { Blog as BlogRest } from '@shopify/shopify-api/rest/admin/2023-10/blog';
import type { BlogCreateRestParams, BlogSyncTableRestParams } from '../types/Blog';
import type { BlogRow } from '../types/CodaRows';

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

      const blogFetcher = new BlogRestFetcher(context);
      blogFetcher.validateParams(restParams);
      let url = prevContinuation?.nextUrl ?? blogFetcher.getFetchAllUrl(restParams);

      let restResult = [];
      let { response, continuation } = await makeSyncTableGetRequest<{ blogs: BlogRest[] }>({ url }, context);
      if (response?.body?.blogs) {
        restResult = response.body.blogs.map((blog) => blogFetcher.formatApiToRow(blog));
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
      return new BlogRestFetcher(context).executeSyncTableUpdate(updates);
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
    let row: BlogRow = {
      id: blogId,
      title,
      handle,
      commentable,
      template_suffix: templateSuffix,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    return new BlogRestFetcher(context).updateWithMetafields(
      { original: undefined, updated: row },
      metafieldKeyValueSets
    );
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
  resultType: coda.ValueType.Number,
  execute: async function ([title, handle, commentable, templateSuffix, metafields], context) {
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    let newRow: Partial<BlogRow> = {
      title,
      commentable,
      handle,
      template_suffix: templateSuffix,
    };

    const blogFetcher = new BlogRestFetcher(context);
    const restParams = blogFetcher.formatRowToApi(newRow, metafieldKeyValueSets) as BlogCreateRestParams;
    const response = await blogFetcher.create(restParams);
    return response?.body?.blog?.id;
  },
});

export const Action_DeleteBlog = coda.makeFormula({
  name: 'DeleteBlog',
  description: 'Delete an existing Shopify Blog and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.blog.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([blogId], context) {
    await new BlogRestFetcher(context).delete(blogId);
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
    const blogFetcher = new BlogRestFetcher(context);
    const blogResponse = await blogFetcher.fetch(blogId);
    if (blogResponse.body?.blog) {
      return blogFetcher.formatApiToRow(blogResponse.body.blog);
    }
  },
});

export const Format_Blog: coda.Format = {
  name: 'Blog',
  instructions: 'Paste the blog ID into the column.',
  formulaName: 'Blog',
};
// #endregion
