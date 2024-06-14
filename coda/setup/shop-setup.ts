// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ShopClient } from '../../Clients/RestClients';
import { CACHE_DEFAULT } from '../../constants/cacheDurations-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { ShopModel } from '../../models/rest/ShopModel';
import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { SyncedShops } from '../../sync/rest/SyncedShops';

// #endregion

// #region Helper functions
function createSyncedShops(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedShops({
    context,
    codaSyncParams,
    // @ts-expect-error
    model: ShopModel,
    client: ShopClient.createInstance(context),
  });
}
// #endregion

// #region Sync Table
export const Sync_Shops = coda.makeSyncTable({
  name: 'Shops',
  description: 'Return Shop from specified account.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Shop,
  schema: SyncedShops.staticSchema,
  formula: {
    name: 'SyncShops',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedArticles.codaParamsMap}
     */
    parameters: [],
    execute: async (codaParams, context) => createSyncedShops(codaParams, context).executeSync(),
  },
});
// #endregion

// #region Formulas
export const Formula_Shop = coda.makeFormula({
  name: 'Shop',
  description: 'Get current shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ShopSyncTableSchema,
  execute: async function ([], context) {
    const response = await ShopClient.createInstance(context).current({});
    return ShopModel.createInstance(context, response.body).toCodaRow();
  },
});
// #endregion
