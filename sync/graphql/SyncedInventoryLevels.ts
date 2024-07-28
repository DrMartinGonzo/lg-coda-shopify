// #region Imports

import { InventoryLevelFieldsArgs, ListInventoryLevelsArgs } from '../../Clients/GraphQlClients';
import { Sync_InventoryLevels } from '../../coda/setup/inventoryLevels-setup';
import { POSSIBLE_QUANTITY_NAMES } from '../../constants/inventoryLevels-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { InventoryLevelModel } from '../../models/graphql/InventoryLevelModel';
import { InventoryLevelRow } from '../../schemas/CodaRows.types';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { parseOptionId } from '../../utils/helpers';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncInventoryLevelsParams = CodaSyncParams<typeof Sync_InventoryLevels>;
// #endregion

export class SyncedInventoryLevels extends AbstractSyncedGraphQlResources<InventoryLevelModel> {
  public static staticSchema = InventoryLevelSyncTableSchema;

  public get codaParamsMap() {
    const [locationId, updatedAtMin] = this.codaParams as SyncInventoryLevelsParams;
    return {
      locationId: parseOptionId(locationId),
      updatedAtMin,
    };
  }

  protected async createInstanceFromRow(row: InventoryLevelRow) {
    const { locationId } = this.codaParamsMap;
    const instance = await super.createInstanceFromRow(row);
    // make sure locationId is set
    instance.data.locationId = idToGraphQlGid(GraphQlResourceNames.Location, locationId);

    return instance;
  }

  /**
   * Only request the minimum required fields for the owner
   */
  protected codaParamsToListArgs() {
    const { locationId } = this.codaParamsMap;

    const fields: InventoryLevelFieldsArgs = {};
    if (['variant_id', 'variant'].some((key) => this.syncedStandardFields.includes(key))) {
      fields.variant = true;
    }
    if (
      fields.variant ||
      ['inventory_item_id', 'inventory_history_url'].some((key) => this.syncedStandardFields.includes(key))
    ) {
      fields.inventory_item = true;
    }

    const quantitiesNames = POSSIBLE_QUANTITY_NAMES.filter((key) => this.syncedStandardFields.includes(key));

    return {
      fields,
      quantitiesNames,
      locationId: idToGraphQlGid(GraphQlResourceNames.Location, locationId),
    } as ListInventoryLevelsArgs;
  }
}
