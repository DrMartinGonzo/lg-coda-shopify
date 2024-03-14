import type { BaseSyncTableRestParams } from './RequestsRest';

export interface CollectSyncTableRestParams extends BaseSyncTableRestParams {
  fields?: string;
  collection_id?: number;
}
