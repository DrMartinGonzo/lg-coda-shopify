// #region Imports

import { ListInventoryLevelsArgs } from '../../Clients/RestClients';
import { Sync_InventoryLevels } from '../../coda/setup/inventoryLevels-setup';
import { InventoryLevelRestModel } from '../../models/rest/InventoryLevelRestModel';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { parseOptionId } from '../../utils/helpers';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

// #region Types
export type SyncInventoryLevelsParams = CodaSyncParams<typeof Sync_InventoryLevels>;
// #endregion

export class SyncedRestInventoryLevels extends AbstractSyncedRestResources<InventoryLevelRestModel> {
  public static staticSchema = InventoryLevelSyncTableSchema;

  public get codaParamsMap() {
    const [locationId, updatedAtMin] = this.codaParams as SyncInventoryLevelsParams;
    return {
      locationId,
      updatedAtMin,
    };
  }

  protected codaParamsToListArgs(): Omit<ListInventoryLevelsArgs, 'limit' | 'options'> {
    const { locationId, updatedAtMin } = this.codaParamsMap;
    const parsedLocationId = parseOptionId(locationId);
    return {
      fields: this.syncedStandardFields.join(','),
      location_ids: [parsedLocationId].join(','),
      updated_at_min: updatedAtMin,
    };
  }
}
