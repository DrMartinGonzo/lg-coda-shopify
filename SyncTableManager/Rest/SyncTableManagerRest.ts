// #region Imports

import { AbstractRestResource } from '../../Resources/Abstract/Rest/AbstractRestResource';
import { AbstractRestResourceWithMetafields } from '../../Resources/Abstract/Rest/AbstractRestResourceWithMetafields';
import { FieldDependency } from '../../schemas/Schema.types';
import { arrayUnique, handleFieldDependencies, logAdmin } from '../../utils/helpers';
import { AbstractSyncTableManager, AddMetafieldsSupportMixin } from '../Abstract/AbstractSyncTableManager';
import { SyncTableRestContinuation } from '../types/SyncTableManager.types';
import { ExecuteRestSyncArgs, SyncRestFunction, SyncTableManagerRestResult } from '../types/SyncTableManager.types';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/syncTableManager-utils';

// #endregion

export class SyncTableManagerRest<BaseT extends AbstractRestResource> extends AbstractSyncTableManager<
  BaseT,
  SyncTableRestContinuation,
  SyncRestFunction<BaseT>
> {
  public async executeSync({
    defaultLimit,
  }: ExecuteRestSyncArgs): Promise<SyncTableManagerRestResult<typeof this.continuation, BaseT>> {
    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    if (!skipNextRestSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      const nextPageQuery = this.prevContinuation?.nextQuery
        ? parseContinuationProperty(this.prevContinuation.nextQuery)
        : {};

      const response = await this.syncFunction({ nextPageQuery, limit: defaultLimit });

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

  public getSyncedStandardFields(dependencies?: Array<FieldDependency<any>>): string[] {
    return handleFieldDependencies(this.effectiveStandardFromKeys, dependencies);
  }
}

export const SyncTableManagerRestWithMetafields = AddMetafieldsSupportMixin(SyncTableManagerRest);
SyncTableManagerRestWithMetafields.prototype.getSyncedStandardFields = function (
  dependencies?: Array<FieldDependency<any>>
): string[] {
  const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, dependencies);
  if (this.shouldSyncMetafields) {
    // admin_graphql_api_id is necessary for metafield sync
    return arrayUnique(['admin_graphql_api_id', ...syncedStandardFields]);
  } else {
    return syncedStandardFields;
  }
};

export type SyncTableManagerRestWithMetafieldsType<ResourceConstructorT extends AbstractRestResourceWithMetafields> =
  Omit<InstanceType<typeof SyncTableManagerRestWithMetafields>, 'resource'> & {
    readonly resource: (new () => ResourceConstructorT) & typeof AbstractRestResourceWithMetafields;
  };
