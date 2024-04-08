// #region Imports

import { AbstractResource_Synced } from './AbstractResource_Synced';
import { AugmentWithMetafieldsFunction } from './AbstractResource_Synced_HasMetafields';
import { AbstractSyncTableRestHasMetafields } from './AbstractSyncTableRestHasMetafields';
import { ExecuteSyncArgs, SyncTableManagerResult } from './SyncTableRestNew';

// #endregion

// #region Types
interface ExecuteAugmentedSyncArgs extends ExecuteSyncArgs {
  syncMetafields: AugmentWithMetafieldsFunction;
}
// #endregion

export class SyncTableRestHasRestMetafields<
  BaseT extends AbstractResource_Synced
> extends AbstractSyncTableRestHasMetafields<BaseT> {
  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  // #region Sync
  public async executeSync({
    sync,
    syncMetafields,
    adjustLimit,
  }: ExecuteAugmentedSyncArgs): Promise<SyncTableManagerResult> {
    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    const { response, continuation } = await super.executeSync({ sync, adjustLimit });

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
  // #endregion
}
