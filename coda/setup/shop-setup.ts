// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NotFoundVisibleError } from '../../Errors/Errors';
import { Shop } from '../../Resources/Rest/Shop';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { filters } from '../coda-parameters';

// #endregion

// #region Sync Table
export const Sync_Shops = coda.makeSyncTable({
  name: 'Shops',
  description: 'Return Shop from specified account.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Shop,
  schema: ShopSyncTableSchema,
  formula: {
    name: 'SyncShops',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link Shop.makeSyncTableManagerSyncFunction}
     */
    parameters: [],
    execute: async function (params, context) {
      return Shop.sync(params, context);
    },
  },
});
// #endregion

// #region Formulas
export const Formula_Shop = coda.makeFormula({
  name: 'Shop',
  description: 'Get a single shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ShopSyncTableSchema,
  execute: async function ([], context) {
    const shop = await Shop.current({ context });
    if (shop) {
      return shop.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.Shop);

    // const shopFetcher = new ShopRestFetcher(context);

    // const response = await shopFetcher.fetch();
    // if (response?.body?.shop) {
    //   return shopFetcher.formatApiToRow(response.body.shop);
    // }
  },
});
// #endregion
