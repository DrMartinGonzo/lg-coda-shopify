// #region Imports

import { AbstractSyncedRestResource } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { AugmentWithMetafieldsFunction } from '../../Resources/Abstract/Rest/AbstractSyncedRestResourceWithRestMetafields';
import { AbstractSyncTableManagerRestHasMetafields } from './AbstractSyncTableManagerRestHasMetafields';
import { ExecuteSyncArgs, SyncTableManagerResult } from './SyncTableManagerRest';

// #endregion

// #region Types
interface ExecuteAugmentedSyncArgs extends ExecuteSyncArgs {
  syncMetafields: AugmentWithMetafieldsFunction;
}
// #endregion

export class SyncTableManagerRestWithRestMetafields<
  BaseT extends AbstractSyncedRestResource
> extends AbstractSyncTableManagerRestHasMetafields<BaseT> {
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
