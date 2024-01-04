import * as coda from '@codahq/packs-sdk';

import { IDENTITY_BLOG } from '../constants';
import { syncBlogs, fetchBlog } from './blogs-functions';

import { BlogSchema } from './blogs-schema';
import { sharedParameters } from '../shared-parameters';

export const setupBlogs = (pack) => {
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
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'handle',
          description: 'Filter by blog handle.',
          optional: true,
        }),
      ],
      execute: syncBlogs,
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
