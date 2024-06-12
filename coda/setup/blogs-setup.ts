// #region Imports
import * as coda from '@codahq/packs-sdk';

import { BlogClient } from '../../Clients/RestApiClientBase';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { PACK_IDENTITIES, optionValues } from '../../constants';
import { getTemplateSuffixesFor } from '../../models/rest/AssetModel';
import { BlogModel } from '../../models/rest/BlogModel';
import { BlogSyncTableSchema, COMMENTABLE_OPTIONS } from '../../schemas/syncTable/BlogSchema';
import { SyncedBlogs } from '../../sync/rest/SyncedBlogs';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../../utils/coda-utils';
import { assertAllowedValue, isNullishOrEmpty } from '../../utils/helpers';
import { CodaMetafieldSetNew } from '../CodaMetafieldSetNew';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedBlogs(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedBlogs({
    context,
    codaSyncParams,
    model: BlogModel,
    client: BlogClient.createInstance(context),
  });
}

function validateCreateUpdateParams({ commentable }: { commentable?: string }) {
  const invalidMsg: string[] = [];
  if (!isNullishOrEmpty(commentable) && !assertAllowedValue(commentable, optionValues(COMMENTABLE_OPTIONS))) {
    invalidMsg.push(`commentable: ${commentable}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync tables
export const Sync_Blogs = coda.makeSyncTable({
  name: 'Blogs',
  description:
    "Return Blogs from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for blogs, we have to do a separate Rest call for each blog to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Blog,
  schema: SyncedBlogs.staticSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return SyncedBlogs.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor({ kind: 'blog', context });
      }
    },
  },
  formula: {
    name: 'SyncBlogs',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedBlogs.codaParamsMap}
     */
    parameters: [
      {
        ...filters.general.syncMetafields,
        description:
          "description: 'Also retrieve metafields. Not recommanded if you have lots of blogs, the sync will be much slower as the pack will have to do another API call for each blog. Waiting for Shopify to add GraphQL access to blogs...',",
        optional: true,
      },
    ],
    execute: async (codaSyncParams, context) => createSyncedBlogs(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedBlogs(codaSyncParams, context).executeSyncUpdate(updates),
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
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Blog'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(BlogSchema, IdentitiesNew.blog),
  schema: BlogSyncTableSchema,
  execute: async function ([blogId, title, handle, commentable, template_suffix, metafields], context) {
    validateCreateUpdateParams({ commentable });
    const blog = BlogModel.createInstanceFromRow(context, {
      id: blogId,
      title,
      handle,
      commentable,
      template_suffix,
    });
    if (metafields) {
      blog.data.metafields = CodaMetafieldSetNew.createRestMetafieldsFromCodaParameterArray(context, {
        codaParams: metafields,
        ownerResource: BlogModel.metafieldRestOwnerType,
        ownerId: blogId,
      });
    }

    await blog.save();
    return blog.toCodaRow();
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
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Blog'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function ([title, handle, commentable, template_suffix, metafields], context) {
    validateCreateUpdateParams({ commentable });
    const blog = BlogModel.createInstanceFromRow(context, {
      id: undefined,
      title,
      commentable,
      handle,
      template_suffix,
    });
    if (metafields) {
      blog.data.metafields = CodaMetafieldSetNew.createFromCodaParameterArray(metafields).map((s) =>
        s.toRestMetafield({ context, owner_resource: BlogModel.metafieldRestOwnerType })
      );
    }

    await blog.save();
    return blog.data.id;
  },
});

export const Action_DeleteBlog = makeDeleteRestResourceAction({
  modelName: BlogModel.displayName,
  IdParameter: inputs.blog.id,
  execute: async ([itemId], context) => {
    await BlogClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Blog = makeFetchSingleRestResourceAction({
  modelName: BlogModel.displayName,
  IdParameter: inputs.blog.id,
  schema: SyncedBlogs.staticSchema,
  execute: async ([itemId], context) => {
    const response = await BlogClient.createInstance(context).single({ id: itemId as number });
    return BlogModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Blog: coda.Format = {
  name: 'Blog',
  instructions: 'Paste the blog ID into the column.',
  formulaName: 'Blog',
};
// #endregion
