// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Collect } from '../../Fetchers/NEW/Resources/Collect';
import { Identity } from '../../constants';
import { CollectSyncTableSchema } from '../../schemas/syncTable/CollectSchema';
import { filters } from '../../shared-parameters';

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
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link Collect.makeSyncTableManagerSyncFunction}
     */
    parameters: [{ ...filters.collection.id, optional: true }],
    execute: async (params, context: coda.SyncExecutionContext) => {
      return Collect.sync(params, context);
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
  schema: CollectSyncTableSchema,
  execute: async ([collectID, fields], context) => {
    const collect = await Collect.find({ context, id: collectID, fields: fields.join(',') });
    return collect.formatToRow();
  },
});
 */
// #endregion
