// #region Imports

import { ListInventoryLevelsArgs } from '../../Clients/RestClients';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_InventoryLevels } from '../../coda/setup/inventoryLevels-setup';
import { InventoryLevelModel } from '../../models/rest/InventoryLevelModel';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { parseOptionId } from '../../utils/helpers';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedInventoryLevels extends AbstractSyncedRestResources<InventoryLevelModel> {
  public static staticSchema = InventoryLevelSyncTableSchema;

  public get codaParamsMap() {
    const [locationIds, updatedAtMin] = this.codaParams as CodaSyncParams<typeof Sync_InventoryLevels>;
    return {
      locationIds,
      updatedAtMin,
    };
  }

  protected codaParamsToListArgs(): Omit<ListInventoryLevelsArgs, 'limit' | 'options'> {
    const { locationIds, updatedAtMin } = this.codaParamsMap;
    const parsedLocationIds = locationIds.map(parseOptionId);
    return {
      fields: this.syncedStandardFields.join(','),
      location_ids: parsedLocationIds.join(','),
      updated_at_min: updatedAtMin,
    };
  }
}
