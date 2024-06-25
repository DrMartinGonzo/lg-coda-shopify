// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MarketClient } from '../../Clients/GraphQlClients';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { MarketModel } from '../../models/graphql/MarketModel';
import { SyncedMarkets } from '../../sync/graphql/SyncedMarkets';

// #endregion

// #region Helper functions
function createSyncedMarkets(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedMarkets({
    context,
    codaSyncParams,
    model: MarketModel,
    client: MarketClient.createInstance(context),
  });
}

// #endregion

// #region Sync Tables
// Markets Sync Table via Rest Admin API
export const Sync_Markets = coda.makeSyncTable({
  name: 'Markets',
  description: 'Return Markets from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Market,
  schema: SyncedMarkets.staticSchema,
  formula: {
    name: 'SyncMarkets',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedMarkets.codaParamsMap}
     */
    parameters: [],
    execute: async (codaSyncParams, context) => createSyncedMarkets(codaSyncParams, context).executeSync(),
  },
});
// #endregion
