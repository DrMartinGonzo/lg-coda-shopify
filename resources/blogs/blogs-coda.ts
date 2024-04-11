// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Metafield } from '../../Fetchers/NEW/Resources/Metafield';
import { Blog } from '../../Fetchers/NEW/Resources/WithRestMetafields/Blog';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { BlogRow } from '../../schemas/CodaRows.types';
import { BlogSyncTableSchema } from '../../schemas/syncTable/BlogSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { parseMetafieldsCodaInput } from '../metafields/utils/metafields-utils-keyValueSets';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { FromRow } from '../../Fetchers/NEW/AbstractResource_Synced';

// #endregion

// #region Sync tables
export const Sync_Blogs = coda.makeSyncTable({
  name: 'Blogs',
  description:
    "Return Blogs from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for blogs, we have to do a separate Rest call for each blog to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Blog,
  schema: BlogSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      const codaSyncParams = Object.values(formulaContext) as coda.ParamValues<coda.ParamDefs>;
      return Blog.getDynamicSchema({ context, codaSyncParams });
    },
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
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link Blog.getDynamicSchema}
     *  - {@link Blog.makeSyncFunction}
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
  // schema: coda.withIdentity(BlogSchema, Identity.Blog),
  schema: BlogSyncTableSchema,
  execute: async function ([blogId, title, handle, commentable, template_suffix, metafields], context) {
    const metafieldSets = parseMetafieldsCodaInput(metafields);
    const fromRow: FromRow<BlogRow> = {
      row: {
        id: blogId,
        title,
        handle,
        commentable,
        template_suffix,
      },
      metafields: metafieldSets.map((set) => Metafield.createInstancesFromMetafieldSet(context, set)),
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
    const metafieldSets = parseMetafieldsCodaInput(metafields);
    const fromRow: FromRow<BlogRow> = {
      row: {
        title,
        commentable,
        handle,
        template_suffix,
      },
      metafields: metafieldSets.map((set) => Metafield.createInstancesFromMetafieldSet(context, set)),
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
    return blog.formatToRow();
  },
});

export const Format_Blog: coda.Format = {
  name: 'Blog',
  instructions: 'Paste the blog ID into the column.',
  formulaName: 'Blog',
};
// #endregion
