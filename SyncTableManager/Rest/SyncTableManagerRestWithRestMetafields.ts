// #region Imports

import { AbstractSyncedRestResourceWithRestMetafields } from '../../Resources/Abstract/Rest/AbstractSyncedRestResourceWithRestMetafields';
import { AbstractSyncTableManagerRestWithMetafields } from '../Abstract/Rest/AbstractSyncTableManagerRestWithMetafields';
import { SyncTableRestContinuation } from '../types/SyncTable.types';
import {
  ExecuteRestSyncWithRestMetafieldsArgs,
  ISyncTableManagerWithMetafields,
  SyncTableManagerRestResult,
} from '../types/SyncTableManager.types';

// #endregion

export class SyncTableManagerRestWithRestMetafields<BaseT extends AbstractSyncedRestResourceWithRestMetafields>
  extends AbstractSyncTableManagerRestWithMetafields<BaseT, SyncTableRestContinuation>
  implements ISyncTableManagerWithMetafields
{
  public async executeSync({
    sync,
    syncMetafields,
    defaultLimit,
  }: ExecuteRestSyncWithRestMetafieldsArgs<BaseT>): Promise<
    SyncTableManagerRestResult<typeof this.continuation, BaseT>
  > {
    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    const { response, continuation } = await this.parentSyncTableManager.executeSync({
      sync,
      defaultLimit: defaultLimit,
    });

    /** ————————————————————————————————————————————————————————————
     * Augment Rest sync with metafields fetched via Rest for each resource
     */
    if (this.shouldSyncMetafields) {
      await Promise.all(
        response.data.map(async (item) => {
          const metafieldsResponse = await syncMetafields(item);
          item.apiData.metafields = metafieldsResponse.data;
        })
      );
    }

    return {
      response,
      continuation,
    };
  }
}
