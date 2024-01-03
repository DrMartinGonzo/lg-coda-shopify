import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PAGE, OPTIONS_PUBLISHED_STATUS } from '../constants';
import { syncPages } from './pages-functions';

import { PageSchema } from './pages-schema';
import { sharedParameters } from '../shared-parameters';

export const setupPages = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Pages',
    description: 'All Shopify pages',
    identityName: IDENTITY_PAGE,
    schema: PageSchema,
    formula: {
      name: 'SyncPages',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_max',
          description: 'Show pages created before date (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_min',
          description: 'Show pages created after date (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'handle',
          description: 'Retrieve a page with a given handle.',
          optional: true,
        }),
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_max',
          description: 'Show pages published before date (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_min',
          description: 'Show pages published after date (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'published_status',
          description: 'Restrict results to pages with a given published status.',
          optional: true,
          autocomplete: OPTIONS_PUBLISHED_STATUS,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Restrict results to after the specified ID.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'title',
          description: 'Retrieve pages with a given title.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_max',
          description: 'Show pages last updated before date (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_min',
          description: 'Show pages last updated after date (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
      ],
      execute: syncPages,
    },
  });
};
