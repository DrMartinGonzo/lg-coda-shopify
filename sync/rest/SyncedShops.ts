// #region Imports

import { ListShopsArgs } from '../../Clients/RestClients';
import { Sync_Shops } from '../../coda/setup/shop-setup';
import { ShopModel } from '../../models/rest/ShopModel';
import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

// #region Types
export type SyncShopsParams = CodaSyncParams<typeof Sync_Shops>;
// #endregion

export class SyncedShops extends AbstractSyncedRestResources<ShopModel> {
  public static staticSchema = ShopSyncTableSchema;

  public get codaParamsMap() {
    // const [] = this.codaParams as SyncShopsParams;
    return {};
  }

  protected codaParamsToListArgs(): Omit<ListShopsArgs, 'limit' | 'options'> {
    return {
      fields: this.syncedStandardFields.filter((key) => !['admin_url'].includes(key)).join(','),
    };
  }
}
