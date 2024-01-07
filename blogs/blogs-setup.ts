import * as coda from '@codahq/packs-sdk';

import { IDENTITY_BLOG } from '../constants';
import { syncBlogs, fetchBlog, deleteBlog, createBlog, updateBlog } from './blogs-functions';

import { BlogSchema } from './blogs-schema';
import { sharedParameters } from '../shared-parameters';

const parameters = {
  // Optional input parameters
  inputTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the page.',
    optional: true,
  }),
  inputHandle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: 'The handle of the page.',
    optional: true,
  }),
};

export const setupBlogs = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Blogs',
    description: 'Return Blogs from this shop.',
    identityName: IDENTITY_BLOG,
    schema: BlogSchema,
    formula: {
      name: 'SyncBlogs',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        // TODO: more filters ?
        { ...sharedParameters.filterHandle, optional: true },
      ],
      execute: syncBlogs,
    },
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // an action to update a customer
  pack.addFormula({
    name: 'UpdateBlog',
    description: 'Update an existing Shopify Blog and return the updated data.',
    parameters: [
      sharedParameters.blog_gid,
      // Optional input parameters
      parameters.inputTitle,
      parameters.inputHandle,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: coda.withIdentity(BlogSchema, IDENTITY_BLOG),
    execute: async function ([blogGid, title, handle], context) {
      return updateBlog(
        blogGid,
        {
          title,
          handle,
        },
        context
      );
    },
  });

  // an action to create a blog
  pack.addFormula({
    name: 'CreateBlog',
    description: `Create a new Shopify Blog and return GraphQl GID.\nBlog must have a name, phone number or email address.`,
    parameters: [{ ...parameters.inputTitle, optional: false }, parameters.inputHandle],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([title, handle], context) {
      const response = await createBlog(
        {
          title,
          handle,
        },
        context
      );
      const { body } = response;
      return body.blog.admin_graphql_api_id;
    },
  });

  // an action to delete a blog
  pack.addFormula({
    name: 'DeleteBlog',
    description: 'Delete an existing Shopify Blog and return true on success.',
    parameters: [sharedParameters.blog_gid],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([blogGid], context) {
      await deleteBlog([blogGid], context);
      return true;
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Blog',
    description: 'Return a single Blog from this shop.',
    parameters: [sharedParameters.blog_gid],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: BlogSchema,
    execute: fetchBlog,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
};
