// #region Imports

import { AbstractRestResource } from '../../Resources/Abstract/Rest/AbstractRestResource';
import { logAdmin } from '../../utils/helpers';
import { AbstractSyncTableManager } from '../Abstract/AbstractSyncTableManager';
import { SyncTableRestContinuation } from '../types/SyncTable.types';
import { ExecuteRestSyncArgs, ISyncTableManager, SyncTableManagerRestResult } from '../types/SyncTableManager.types';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/syncTableManager-utils';

// #endregion

export class SyncTableManagerRest<BaseT extends AbstractRestResource>
  extends AbstractSyncTableManager<BaseT, SyncTableRestContinuation>
  implements ISyncTableManager
{
  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  public async executeSync({
    sync,
    defaultLimit,
  }: ExecuteRestSyncArgs<BaseT>): Promise<SyncTableManagerRestResult<typeof this.continuation, BaseT>> {
    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    if (!skipNextRestSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      const nextPageQuery = this.prevContinuation?.nextQuery
        ? parseContinuationProperty(this.prevContinuation.nextQuery)
        : {};

      const response = await sync({ nextPageQuery, limit: defaultLimit });

      // TODO: Don't set continuation if there's no next page, except for smart collections
      /** Always set continuation if extraContinuationData is set */
      if (this.extraContinuationData) {
        this.continuation = {
          skipNextRestSync: 'false',
          extraData: this.extraContinuationData,
        };
      }
      /** Set continuation if a next page exists */
      if (response?.pageInfo?.nextPage?.query) {
        this.continuation = {
          nextQuery: stringifyContinuationProperty(response.pageInfo.nextPage.query),
          skipNextRestSync: 'false',
          extraData: this.extraContinuationData ?? {},
        };
      }

      return {
        response,
        continuation: this.continuation,
      };
    }

    return {
      response: { data: [], headers: null },
      continuation: this.prevContinuation ?? null,
    };
  }
}
