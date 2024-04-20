// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromRow } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { Asset } from '../../Resources/Rest/Asset';
import { Blog } from '../../Resources/Rest/Blog';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { BlogRow } from '../../schemas/CodaRows.types';
import { BlogSyncTableSchema } from '../../schemas/syncTable/BlogSchema';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';
import { NotFoundVisibleError } from '../../Errors/Errors';

// #endregion

// #region Sync tables
export const Sync_Blogs = coda.makeSyncTable({
  name: 'Blogs',
  description:
    "Return Blogs from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for blogs, we have to do a separate Rest call for each blog to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Blog,
  schema: BlogSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Blog.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return Asset.getTemplateSuffixesFor({ kind: 'blog', context });
      }
    },
  },
  formula: {
    name: 'SyncBlogs',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Blog.getDynamicSchema}
     *  - {@link Blog.makeSyncTableManagerSyncFunction}
     */
    parameters: [
      {
        ...filters.general.syncMetafields,
        description:
          "description: 'Also retrieve metafields. Not recommanded if you have lots of blogs, the sync will be much slower as the pack will have to do another API call for each blog. Waiting for Shopify to add GraphQL access to blogs...',",
        optional: true,
      },
    ],
    execute: async function (params, context) {
      return Blog.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Blog.syncUpdate(params, updates, context);
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
    const fromRow: FromRow<BlogRow> = {
      row: {
        id: blogId,
        title,
        handle,
        commentable,
        template_suffix,
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: blogId, owner_resource: Blog.metafieldRestOwnerType })
      ),
    };

    const updatedBlog = new Blog({ context, fromRow });
    await updatedBlog.saveAndUpdate();
    return updatedBlog.formatToRow();
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
    const fromRow: FromRow<BlogRow> = {
      row: {
        title,
        commentable,
        handle,
        template_suffix,
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context,  owner_resource: Blog.metafieldRestOwnerType })
      ),
    };

    const newBlog = new Blog({ context, fromRow });
    await newBlog.saveAndUpdate();
    return newBlog.apiData.id;
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
    await Blog.delete({ context, id: blogId });
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
    const blog = await Blog.find({ context, id: blogId });
    if (blog) {
      return blog.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.Blog);
  },
});

export const Format_Blog: coda.Format = {
  name: 'Blog',
  instructions: 'Paste the blog ID into the column.',
  formulaName: 'Blog',
};
// #endregion
