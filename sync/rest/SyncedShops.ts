// #region Imports

import { ListShopsArgs } from '../../Clients/RestApiClientBase';
import { ShopModel } from '../../models/rest/ShopModel';
import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedShops extends AbstractSyncedRestResources<ShopModel> {
  public static staticSchema = ShopSyncTableSchema;

  public get codaParamsMap() {
    return {};
  }

  protected codaParamsToListArgs(): Omit<ListShopsArgs, 'limit' | 'options'> {
    return {
      fields: this.syncedStandardFields.filter((key) => !['admin_url'].includes(key)).join(','),
    };
  }
}
