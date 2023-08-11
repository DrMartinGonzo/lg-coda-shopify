import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';
import { fetchAllBlogs, fetchBlog } from './blogs-functions';

import { BlogSchema } from './blogs-schema';

export const setupBlogs = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Blogs',
    description: 'All Shopify products',
    identityName: 'Blog',
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
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'limit',
          description: 'The maximum number of results to retrieve. (max: 250)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Restrict results to after the specified ID.',
          optional: true,
        }),
      ],
      execute: fetchAllBlogs,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Blog',
    description: 'Get a single blog data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'blogID',
        description: 'The id of the blog.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: BlogSchema,
    execute: fetchBlog,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
};
