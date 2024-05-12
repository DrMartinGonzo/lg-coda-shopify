// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ShopifyGraphQlRequestCost } from '../../Errors/GraphQlErrors';
import { AbstractRestResourceWithGraphQLMetafields } from '../../Resources/Abstract/Rest/AbstractRestResourceWithMetafields';
import { MetafieldGraphQl } from '../../Resources/GraphQl/MetafieldGraphQl';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import { Stringified } from '../../types/utilities';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { arrayUnique, logAdmin } from '../../utils/helpers';
import { SyncTableManagerGraphQl } from '../GraphQl/SyncTableManagerGraphQl';
import { RawBatchData, RevivedBatchData, SyncTableMixedContinuation } from '../types/SyncTableManager.types';
import { ExecuteRestSyncArgs, SyncTableManagerRestResult } from '../types/SyncTableManager.types';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/syncTableManager-utils';
import { SyncTableManagerRestWithMetafieldsType } from './SyncTableManagerRest';

// #endregion

export class SyncTableManagerRestWithGraphQlMetafields<BaseT extends AbstractRestResourceWithGraphQLMetafields> {
  public pendingExtraContinuationData: any;

  private readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  private readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  private readonly resource: typeof AbstractRestResourceWithGraphQLMetafields;

  private currentRestLimit: number;

  private prevContinuation: SyncTableMixedContinuation;
  private continuation: SyncTableMixedContinuation;

  // ———————————————————————————————————————————————
  constructor({
    resource,
    codaSyncParams,
    context,
  }: {
    resource: typeof AbstractRestResourceWithGraphQLMetafields;
    codaSyncParams: coda.ParamValues<coda.ParamDefs>;
    context: coda.SyncExecutionContext;
  }) {
    this.context = context;
    this.codaParams = codaSyncParams;
    this.resource = resource;

    this.continuation = null;
    this.prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
  }

  public async executeSync({
    defaultLimit,
  }: ExecuteRestSyncArgs): Promise<SyncTableManagerRestResult<SyncTableMixedContinuation, BaseT>> {
    const ownerSyncTableManager = (await this.resource.getSyncTableManager(
      this.context,
      this.codaParams
    )) as SyncTableManagerRestWithMetafieldsType<AbstractRestResourceWithGraphQLMetafields>;

    ownerSyncTableManager.setSyncFunction(
      this.resource.makeSyncTableManagerSyncFunction({
        codaSyncParams: this.codaParams,
        context: this.context,
        syncTableManager: ownerSyncTableManager,
      })
    );

    this.currentRestLimit = defaultLimit;
    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    let resources: BaseT[] = [];

    /** ————————————————————————————————————————————————————————————
     * Check if we have budget to use GraphQL, if not defer the sync.
     * + adjust Rest sync limit
     */
    if (ownerSyncTableManager.shouldSyncMetafields) {
      const syncTableMaxLimitAndDeferWait = await SyncTableManagerGraphQl.getMaxLimitAndDeferWaitTime(
        this.context,
        this.prevContinuation,
        GRAPHQL_NODES_LIMIT
      );
      const { shouldDeferBy, limit } = syncTableMaxLimitAndDeferWait;
      if (shouldDeferBy > 0) {
        return SyncTableManagerGraphQl.skipRun(this.prevContinuation, shouldDeferBy);
      }
      this.currentRestLimit = limit;
    }

    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    let ownerResponse = {} as SyncTableManagerRestResult<SyncTableMixedContinuation, BaseT>['response'];
    if (!skipNextRestSync) {
      const res = (await ownerSyncTableManager.executeSync({
        defaultLimit: this.currentRestLimit,
      })) as SyncTableManagerRestResult<SyncTableMixedContinuation, BaseT>;

      ownerResponse = res.response;
      resources = ownerResponse.data;
      this.continuation = res.continuation;
    }

    /** ————————————————————————————————————————————————————————————
     * Augment Rest sync with metafields fetched with GraphQL
     */
    if (ownerSyncTableManager.shouldSyncMetafields) {
      const currentBatchData = this.extractCurrentBatch(resources);
      resources = currentBatchData.processing;

      const metafieldsResponse = await MetafieldGraphQl.all({
        context: this.context,
        // cursor,
        limit: this.currentRestLimit,
        ownerIds: arrayUnique(resources.map((c) => c.graphQlGid)).sort(),
        metafieldKeys: ownerSyncTableManager.effectiveMetafieldKeys,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });

      if (metafieldsResponse.data.length) {
        resources = resources.map((resource) => {
          resource.apiData.metafields = metafieldsResponse.data.filter(
            (metafield) =>
              metafield.apiData.parentNode?.id &&
              graphQlGidToId(metafield.apiData.parentNode.id) === resource.apiData.id
          );
          return resource;
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

    return {
      response: {
        ...ownerResponse,
        data: resources,
      },
      continuation: this.continuation,
    };
  }

  private extractCurrentBatch(items: BaseT[]): RevivedBatchData<BaseT> {
    const previousBatch = this.parseBatchData(this.prevContinuation?.extraData?.batch);

    if (this.prevContinuation?.cursor) {
      logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
      return previousBatch;
    }

    const batchLimit = this.currentRestLimit;
    // const batchLimit = 5;
    const stillProcessingRestItems = previousBatch.remaining.length > 0;
    let currentItems: BaseT[] = [];
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

  private parseBatchData(string: Stringified<RawBatchData>): RevivedBatchData<BaseT> {
    const previousBatch = string ? parseContinuationProperty(string) : { processing: [], remaining: [] };
    const reviveInstances = (data: any): BaseT => this.resource.createInstance(this.context, data);
    return {
      processing: previousBatch.processing.map(reviveInstances),
      remaining: previousBatch.remaining.map(reviveInstances),
    };
  }

  private stringifyBatchData(batchData: RevivedBatchData<BaseT>): Stringified<RawBatchData> {
    return stringifyContinuationProperty({
      processing: batchData.processing.map((data) => data.apiData),
      remaining: batchData.remaining.map((data) => data.apiData),
    });
  }

  private buildGraphQlMetafieldsContinuation(cost: ShopifyGraphQlRequestCost, currentBatch: RevivedBatchData<BaseT>) {
    const currContinuation = this.continuation;
    const prevContinuation = this.prevContinuation;
    let metafieldsContinuation: typeof this.continuation | null = null;

    const unfinishedGraphQl = currentBatch.remaining.length > 0;
    const unfinishedRest = !!currContinuation?.nextUrl || !!prevContinuation?.scheduledNextRestUrl;

    if (unfinishedGraphQl || unfinishedRest) {
      metafieldsContinuation = {
        graphQlLock: 'true',
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
        metafieldsContinuation.lastLimit = this.currentRestLimit;
      }
    }

    return metafieldsContinuation;
  }
}
