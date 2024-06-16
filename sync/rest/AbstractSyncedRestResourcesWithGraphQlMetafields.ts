// #region Imports

import { GraphQlFetcher, MetafieldClient } from '../../Clients/GraphQlClients';
import { calcGraphQlMaxLimit, calcGraphQlWaitTime, wait } from '../../Clients/utils/client-utils';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Errors/GraphQlErrors';
import { CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import { GraphQlResourceName } from '../../constants/resourceNames-constants';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { AbstractModelRestWithGraphQlMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { Stringified } from '../../types/utilities';
import { arrayUnique, logAdmin } from '../../utils/helpers';
import { ModelType, SyncTableExtraContinuationData, SyncedResourcesSyncResult } from '../AbstractSyncedResources';
import { SyncTableGraphQlContinuation } from '../graphql/AbstractSyncedGraphQlResources';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/sync-utils';
import {
  AbstractSyncedRestResources,
  ISyncedRestResourcesConstructorArgs,
  SyncTableRestContinuation,
} from './AbstractSyncedRestResources';
import { RawBatchData, RestItemsBatch } from './RestItemsBatch';

// #endregion

// #region Types
export interface SyncTableMixedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  extraData: SyncTableExtraContinuationData & {
    batch?: Stringified<RawBatchData>;
  };
}
// #endregion

export abstract class AbstractSyncedRestResourcesWithGraphQlMetafields<
  T extends AbstractModelRestWithGraphQlMetafields
> extends AbstractSyncedRestResources<T> {
  protected model: ModelType<any> & { graphQlName: GraphQlResourceName };

  protected readonly prevContinuation: SyncTableMixedContinuation;
  protected continuation: SyncTableMixedContinuation;
  protected throttleStatus: ShopifyGraphQlThrottleStatus;

  constructor(args: ISyncedRestResourcesConstructorArgs<T>) {
    super(args);
  }

  private getDeferWaitTime() {
    if (this.hasLock) return 0;
    return calcGraphQlWaitTime(this.throttleStatus);
  }

  protected get currentLimit() {
    if (this.hasLock && this.shouldSyncMetafields) {
      return calcGraphQlMaxLimit({
        lastCost: this.lastCost,
        lastLimit: this.lastLimit,
        throttleStatus: this.throttleStatus,
      });
    }
    return this.client.defaultLimit;
  }

  private get hasLock(): boolean {
    return this.prevContinuation?.hasLock === 'true';
  }
  private get lastCost(): ShopifyGraphQlRequestCost | undefined {
    return parseContinuationProperty<ShopifyGraphQlRequestCost>(this.prevContinuation?.lastCost);
  }
  private get lastLimit(): number | undefined {
    return this.prevContinuation?.lastLimit;
  }

  private async skipRun(deferByMs: number): Promise<SyncedResourcesSyncResult<typeof this.continuation>> {
    await wait(deferByMs);
    return {
      result: [],
      continuation: { ...this.prevContinuation, hasLock: 'false' },
    };
  }

  public async executeSync(): Promise<SyncedResourcesSyncResult<typeof this.continuation>> {
    await this.init();
    this.models = [];

    /** ————————————————————————————————————————————————————————————
     * Check if we have budget to use GraphQL, if not defer the sync.
     */
    if (this.shouldSyncMetafields) {
      this.throttleStatus = await GraphQlFetcher.createInstance(this.context).checkThrottleStatus();
      const deferByMs = this.getDeferWaitTime();
      if (deferByMs > 0) return this.skipRun(deferByMs);
    }

    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    if (!this.skipNextSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      await this.beforeSync();

      const response = await this.sync();
      this.models = response.body.map((data) => this.model.createInstance(this.context, data));

      /** Set continuation if a next page exists */
      if (response?.pageInfo?.nextPage?.query) {
        this.continuation = {
          ...(this.continuation ?? {}),
          nextQuery: stringifyContinuationProperty(response.pageInfo.nextPage.query),
          skipNextRestSync: 'false',
          hasLock: 'true',
          extraData: this.pendingExtraContinuationData ?? {},
        };
      }
    }

    /** ————————————————————————————————————————————————————————————
     * Augment Rest sync with metafields fetched with GraphQL
     */
    if (this.shouldSyncMetafields) {
      const restItemsBatch = new RestItemsBatch({
        prevContinuation: this.prevContinuation,
        items: this.models,
        limit: this.currentLimit,
        reviveItems: (data: any) => this.model.createInstance(this.context, data),
      });
      this.models = restItemsBatch.toProcess;

      const metafieldsResponse = await MetafieldClient.createInstance(this.context).listByOwnerIds({
        limit: this.currentLimit,
        ownerIds: arrayUnique(this.models.map((c) => c.graphQlGid)).sort(),
        metafieldKeys: this.effectiveMetafieldKeys,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
      if (metafieldsResponse.body.length) {
        this.models = this.models.map((owner) => {
          owner.data.metafields = metafieldsResponse.body
            .filter((metafield) => metafield.parentNode?.id && metafield.parentNode.id === owner.graphQlGid)
            .map((data) => MetafieldGraphQlModel.createInstance(this.context, data));
          return owner;
        });
      }

      const metafieldsContinuation = this.buildGraphQlMetafieldsContinuation(metafieldsResponse.cost, restItemsBatch);
      if (metafieldsContinuation) {
        this.continuation = {
          ...(this.continuation ?? {}),
          ...metafieldsContinuation,
        };
      }
    }

    await this.afterSync();

    return this.asStatic().formatSyncResults(this.models, this.continuation);
  }

  private buildGraphQlMetafieldsContinuation(cost: ShopifyGraphQlRequestCost, restItemsBatch: RestItemsBatch<T>) {
    const currContinuation = this.continuation;
    const prevContinuation = this.prevContinuation;
    let metafieldsContinuation: typeof this.continuation | null = null;

    const unfinishedGraphQl = restItemsBatch.remaining.length > 0;
    const unfinishedRest = !!currContinuation?.nextUrl || !!prevContinuation?.scheduledNextRestUrl;

    if (unfinishedGraphQl || unfinishedRest) {
      metafieldsContinuation = {
        hasLock: 'true',
        extraData: {
          ...(this.pendingExtraContinuationData ?? {}),
          batch: restItemsBatch.toString(),
        },
        skipNextRestSync: 'true',
        scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
      };

      if (unfinishedRest) {
        metafieldsContinuation.skipNextRestSync = 'false';
        metafieldsContinuation.nextUrl = this.continuation?.nextUrl ?? this.prevContinuation?.scheduledNextRestUrl;
        metafieldsContinuation.scheduledNextRestUrl = undefined;
      }

      if (cost) {
        metafieldsContinuation.lastCost = stringifyContinuationProperty(cost);
        metafieldsContinuation.lastLimit = this.currentLimit;
      }
    }

    return metafieldsContinuation;
  }
}
