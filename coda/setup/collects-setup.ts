// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CollectClient } from '../../Clients/RestClients';
import { PACK_IDENTITIES } from '../../constants';
import { CollectModel } from '../../models/rest/CollectModel';
import { CollectSyncTableSchema } from '../../schemas/syncTable/CollectSchema';
import { SyncedCollects } from '../../sync/rest/SyncedCollects';
import { filters } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedCollects(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedCollects({
    context,
    codaSyncParams,
    model: CollectModel,
    client: CollectClient.createInstance(context),
  });
}
// #endregion

// #region Sync tables
export const Sync_Collects = coda.makeSyncTable({
  name: 'Collects',
  description: 'Return Collects from this shop. The Collect resource connects a product to a custom collection.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Collect,
  schema: CollectSyncTableSchema,
  formula: {
    name: 'SyncCollects',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedCollects.codaParamsMap}
     */
    parameters: [{ ...filters.collection.id, optional: true }],
    execute: async (codaSyncParams, context) => createSyncedCollects(codaSyncParams, context).executeSync(),
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
