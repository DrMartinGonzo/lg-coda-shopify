import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { InventoryLevelRow } from '../../schemas/CodaRows.types';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { Resource, ResourceSyncRestParams } from '../Resource.types';

// #region Rest Parameters
interface InventoryLevelSyncRestParams extends ResourceSyncRestParams {
  location_ids?: string;
  updated_at_min?: Date;
}

interface InventoryLevelSetRestParams {
  location_id: number;
  inventory_item_id: number;
  available: number;
}

interface InventoryLevelAdjustRestParams {
  location_id: number;
  inventory_item_id: number;
  available_adjustment: number;
}
// #endregion

const inventoryLevelResourceBase = {
  display: 'Inventory Level',
  schema: InventoryLevelSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.InventoryLevel,
  },
  rest: {
    singular: RestResourceSingular.InventoryLevel,
    plural: RestResourcePlural.InventoryLevel,
  },
} as const;

export type InventoryLevel = Resource<
  typeof inventoryLevelResourceBase,
  {
    codaRow: InventoryLevelRow;
    rest: {
      params: {
        sync: InventoryLevelSyncRestParams;
        set: InventoryLevelSetRestParams;
        adjust: InventoryLevelAdjustRestParams;
      };
    };
  }
>;
export const inventoryLevelResource = inventoryLevelResourceBase as InventoryLevel;
