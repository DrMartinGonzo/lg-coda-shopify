import type { BaseSyncTableRestParams } from './RequestsRest';

export interface InventoryLevelSyncTableRestParams extends BaseSyncTableRestParams {
  location_ids?: string;
  updated_at_min?: Date;
}

export interface InventoryLevelSetRestParams {
  location_id: number;
  inventory_item_id: number;
  available: number;
}

export interface InventoryLevelAdjustRestParams {
  location_id: number;
  inventory_item_id: number;
  available_adjustment: number;
}
