import type { InventoryLevelRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace InventoryLevel {
  type Row = InventoryLevelRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      location_ids?: string;
      updated_at_min?: Date;
    }

    interface Set {
      location_id: number;
      inventory_item_id: number;
      available: number;
    }

    interface Adjust {
      location_id: number;
      inventory_item_id: number;
      available_adjustment: number;
    }
  }
}
