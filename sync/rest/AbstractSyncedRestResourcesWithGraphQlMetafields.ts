// #region Imports

import { GRAPHQL_NODES_LIMIT, GraphQlFetcher, MetafieldClient } from '../../Clients/GraphQlClients';
import { wait } from '../../Clients/utils/client-utils';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Errors/GraphQlErrors';
import { GRAPHQL_BUDGET__MAX } from '../../config';
import { CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import { AbstractModel } from '../../models/AbstractModel';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { AbstractModelRestWithGraphQlMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { GraphQlResourceName } from '../../constants/resourceNames-constants';
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

// #endregion

// #region Types
interface SyncTableMixedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  extraData: SyncTableExtraContinuationData & {
    batch?: Stringified<RawBatchData>;
  };
}
type RawBatchData = {
  processing: any[];
  remaining: any[];
};
type RevivedBatchData<T extends AbstractModel> = {
  processing: T[];
  remaining: T[];
};
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
    const { currentlyAvailable, maximumAvailable } = this.throttleStatus;

    let deferByMs = 0;

    if (!this.hasLock) {
      const minPointsNeeded = this.minPointsNeeded;
      deferByMs = currentlyAvailable < minPointsNeeded ? 3000 : 0;
      if (deferByMs > 0) {
        logAdmin(`🚫 Not enough points (${currentlyAvailable}/${minPointsNeeded}). Skip and wait ${deferByMs / 1000}s`);
      }
    }

    return deferByMs;
  }

  protected get currentLimit() {
    let limit = this.client.defaultLimit;
    if (this.hasLock && this.shouldSyncMetafields) {
      const { lastCost, lastLimit } = this;
      if (!lastLimit || !lastCost) {
        console.error(`calcSyncTableMaxLimit: No lastLimit or lastCost in prevContinuation`);
      }
      const costOneEntry = lastCost.requestedQueryCost / lastLimit;
      const maxCost = Math.min(GRAPHQL_BUDGET__MAX, this.throttleStatus.currentlyAvailable);
      const maxLimit = Math.floor(maxCost / costOneEntry);
      limit = Math.min(GRAPHQL_NODES_LIMIT, maxLimit);
    }
    return limit;
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
  private get minPointsNeeded() {
    return this.throttleStatus.maximumAvailable - 1;
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
    this.data = [];

    /** ————————————————————————————————————————————————————————————
     * Check if we have budget to use GraphQL, if not defer the sync.
     */
    if (this.shouldSyncMetafields) {
      this.throttleStatus = await GraphQlFetcher.createInstance(this.context).checkThrottleStatus();
      const deferByMs = this.getDeferWaitTime();
      if (deferByMs > 0) {
        logAdmin(
          `🚫 Not enough points (${this.throttleStatus.currentlyAvailable}/${this.minPointsNeeded}).
        Skip and wait ${deferByMs / 1000}s`
        );
        return this.skipRun(deferByMs);
      }
    }

    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    if (!this.skipNextSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      await this.beforeSync();

      const response = await this.sync();
      this.data = response.body.map((data) => this.model.createInstance(this.context, data));

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
      const currentBatchData = this.extractCurrentBatch(this.data);
      this.data = currentBatchData.processing;
      const metafieldsResponse = await MetafieldClient.createInstance(this.context).listByOwnerIds({
        limit: this.currentLimit,
        ownerIds: arrayUnique(this.data.map((c) => c.graphQlGid)).sort(),
        metafieldKeys: this.effectiveMetafieldKeys,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
      if (metafieldsResponse.body.length) {
        this.data = this.data.map((owner) => {
          owner.data.metafields = metafieldsResponse.body
            .filter((metafield) => metafield.parentNode?.id && metafield.parentNode.id === owner.graphQlGid)
            .map((data) => MetafieldGraphQlModel.createInstance(this.context, data));
          return owner;
        });
      }

      const metafieldsContinuation = this.buildGraphQlMetafieldsContinuation(metafieldsResponse.cost, currentBatchData);
      if (metafieldsContinuation) {
        this.continuation = {
          ...(this.continuation ?? {}),
          ...metafieldsContinuation,
        };
      }
    }

    await this.afterSync();

    return {
      result: this.data.map((data) => data.toCodaRow()),
      continuation: this.continuation,
    };
  }

  // public async executeSyncUpdate(updates: Array<coda.SyncUpdate<string, string, any>>): Promise<SyncTableUpdateResult> {
  //   await this.init();

  //   const completed = await Promise.allSettled(
  //     updates.map(async (update) => {
  //       const includedProperties = arrayUnique(
  //         update.updatedFields.concat(this.getRequiredPropertiesForUpdate(update))
  //       );

  //       const prevRow = update.previousValue as BaseRow;
  //       const newRow = Object.fromEntries(
  //         Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
  //       ) as BaseRow;

  //       const instance = this.model.createInstanceFromRow(this.context, newRow);

  //       // Warm up metafield definitions cache
  //       if (this.supportMetafields && hasMetafieldsInUpdate(update)) {
  //         const metafieldDefinitions = await this.getMetafieldDefinitions();
  //         (instance as AbstractModelRestWithMetafields<T>).data.metafields =
  //           await MetafieldModel.createInstancesFromOwnerRow({
  //             context: this.context,
  //             row: newRow,
  //             metafieldDefinitions,
  //             // TODO: fix type
  //             ownerResource: (this.model as unknown as typeof AbstractModelRestWithMetafields).metafieldRestOwnerType,
  //           });
  //       }

  //       try {
  //         await instance.save();
  //       } catch (error) {
  //         if (error instanceof RequiredSyncTableMissingVisibleError) {
  //           /** Try to augment with fresh data and check again if it passes validation */
  //           await instance.addMissingData();
  //           await instance.save();
  //         } else {
  //           throw error;
  //         }
  //       }

  //       return { ...prevRow, ...instance.toCodaRow() };
  //     })
  //   );

  //   return {
  //     result: completed.map((job) => {
  //       if (job.status === 'fulfilled') return job.value;
  //       else return job.reason;
  //     }),
  //   };
  // }

  private extractCurrentBatch(items: T[]): RevivedBatchData<T> {
    const previousBatch = this.parseBatchData(this.prevContinuation?.extraData?.batch);

    if (this.prevContinuation?.cursor) {
      logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
      return previousBatch;
    }

    const batchLimit = this.currentLimit;
    // const batchLimit = 5;
    const stillProcessingRestItems = previousBatch.remaining.length > 0;
    let currentItems: T[] = [];
    if (stillProcessingRestItems) {
      currentItems = previousBatch.remaining;
      logAdmin(`🔁 ${currentItems.length} items remaining. Fetching next batch of ${batchLimit} items`);
    } else {
      currentItems = items;
      logAdmin(
        `🟢 Found ${currentItems.length} items to augment with metafields. Fetching batch of ${batchLimit} items.`
      );
    }

    return {
      processing: currentItems.splice(0, batchLimit),
      // modified 'currentItems' array after the splice operation, which now contains the elements not extracted for processing
      remaining: currentItems,
    };
  }

  private parseBatchData(string: Stringified<RawBatchData>): RevivedBatchData<T> {
    const previousBatch = string ? parseContinuationProperty(string) : { processing: [], remaining: [] };
    const reviveInstances = (data: any): T => this.model.createInstance(this.context, data);
    return {
      processing: previousBatch.processing.map(reviveInstances),
      remaining: previousBatch.remaining.map(reviveInstances),
    };
  }

  private stringifyBatchData(batchData: RevivedBatchData<T>): Stringified<RawBatchData> {
    const toData = (instance: T) => instance.data;
    return stringifyContinuationProperty({
      processing: batchData.processing.map(toData),
      remaining: batchData.remaining.map(toData),
    });
  }

  private buildGraphQlMetafieldsContinuation(cost: ShopifyGraphQlRequestCost, currentBatch: RevivedBatchData<T>) {
    const currContinuation = this.continuation;
    const prevContinuation = this.prevContinuation;
    let metafieldsContinuation: typeof this.continuation | null = null;

    const unfinishedGraphQl = currentBatch.remaining.length > 0;
    const unfinishedRest = !!currContinuation?.nextUrl || !!prevContinuation?.scheduledNextRestUrl;

    if (unfinishedGraphQl || unfinishedRest) {
      metafieldsContinuation = {
        hasLock: 'true',
        extraData: {
          ...(this.pendingExtraContinuationData ?? {}),
          batch: this.stringifyBatchData(currentBatch),
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
