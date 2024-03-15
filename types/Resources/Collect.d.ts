import type { CollectRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace Collect {
  type Row = CollectRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields?: string;
      collection_id?: number;
    }
  }
}
