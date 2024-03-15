import type { ShopRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace Shop {
  type Row = ShopRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields: string;
    }
  }
}
