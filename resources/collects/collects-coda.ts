// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Identity } from '../../constants';
import { CollectSyncTableSchema } from '../../schemas/syncTable/CollectSchema';
import { filters } from '../../shared-parameters';
import { CollectRestFetcher } from './CollectRestFetcher';
import { CollectSyncTable } from './CollectSyncTable';

// #endregion

// #region Sync tables
export const Sync_Collects = coda.makeSyncTable({
  name: 'Collects',
  description: 'Return Collects from this shop. The Collect resource connects a product to a custom collection.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Collect,
  schema: CollectSyncTableSchema,
  formula: {
    name: 'SyncCollects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [{ ...filters.collection.id, optional: true }],
    execute: async (params, context: coda.SyncExecutionContext) => {
      const collectSyncTable = new CollectSyncTable(new CollectRestFetcher(context), params);
      return collectSyncTable.executeSync(CollectSyncTableSchema);
    },
  },
});
// #endregion

// #region Formulas
/*
pack.addFormula({
  name: 'Collect',
  description: 'Get a single collect data.',
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'collectID',
      description: 'The ID of the collection.',
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'fields',
      description: 'Retrieve only certain fields, specified by a comma-separated list of fields names.',
      optional: true,
    }),
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CollectSchema,
  execute: fetchCollect,
});
*/
// #endregion
