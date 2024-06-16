// #region Imports

import { AbstractGraphQlClient, GRAPHQL_NODES_LIMIT, GraphQlFetcher } from '../../Clients/GraphQlClients';
import { AbstractModelGraphQl } from '../../models/graphql/AbstractModelGraphQl';
import { AbstractModelGraphQlWithMetafields } from '../../models/graphql/AbstractModelGraphQlWithMetafields';
import {
  AbstractSyncedResources,
  ISyncedResourcesConstructorArgs,
  SyncTableContinuation,
  SyncedResourcesSyncResult,
} from '../AbstractSyncedResources';

import { calcGraphQlMaxLimit, calcGraphQlWaitTime, wait } from '../../Clients/utils/client-utils';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Errors/GraphQlErrors';
import { GRAPHQL_BUDGET__MAX } from '../../config';
import { CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { BaseRow } from '../../schemas/CodaRows.types';
import { PageInfo } from '../../types/admin.types';
import { Stringified } from '../../types/utilities';
import { logAdmin } from '../../utils/helpers';
import {
  graphQlResourceSupportsMetafields,
  parseContinuationProperty,
  stringifyContinuationProperty,
} from '../utils/sync-utils';

// #endregion

// #region Types
export interface SyncTableGraphQlContinuation extends SyncTableContinuation {
  cursor?: string;
  hasLock: string;
  lastCost?: Stringified<ShopifyGraphQlRequestCost>;
  lastLimit?: number;
}

interface ISyncedGraphQlResourcesConstructorArgs<T> extends ISyncedResourcesConstructorArgs<T> {
  client: AbstractGraphQlClient<any>;
}
// #endregion

export abstract class AbstractSyncedGraphQlResources<
  T extends AbstractModelGraphQl | AbstractModelGraphQlWithMetafields
> extends AbstractSyncedResources<T> {
  protected readonly client: AbstractGraphQlClient<any>;

  protected readonly prevContinuation: SyncTableGraphQlContinuation;
  protected continuation: SyncTableGraphQlContinuation;
  protected pendingExtraContinuationData: any;
  protected throttleStatus: ShopifyGraphQlThrottleStatus;

  constructor({ client, ...args }: ISyncedGraphQlResourcesConstructorArgs<T>) {
    super(args);

    this.client = client;
    this.supportMetafields = graphQlResourceSupportsMetafields(this.model);
  }

  private getDeferWaitTime() {
    if (this.hasLock) return 0;
    return calcGraphQlWaitTime(this.throttleStatus);
  }

  protected get currentLimit() {
    if (this.hasLock) {
      return calcGraphQlMaxLimit({
        lastCost: this.lastCost,
        lastLimit: this.lastLimit,
        throttleStatus: this.throttleStatus,
      });
    }
    return this.client.defaultLimit;
  }

  private get cursor(): string | undefined {
    return this.prevContinuation?.cursor as string;
  }
  private get hasLock(): boolean {
    return this.prevContinuation?.hasLock && this.prevContinuation.hasLock === 'true';
  }
  private get lastCost(): ShopifyGraphQlRequestCost | undefined {
    return parseContinuationProperty<ShopifyGraphQlRequestCost>(this.prevContinuation.lastCost);
  }
  private get lastLimit(): number | undefined {
    return this.prevContinuation.lastLimit;
  }

  protected getListParams() {
    return {
      limit: this.currentLimit,
      cursor: this.cursor,
      options: { cacheTtlSecs: CACHE_DISABLED },
      ...this.codaParamsToListArgs(),
    };
  }

  private async skipRun(deferByMs: number): Promise<SyncedResourcesSyncResult<typeof this.continuation>> {
    await wait(deferByMs);
    return {
      result: [],
      continuation: { ...this.prevContinuation, hasLock: 'false' },
    };
  }

  protected async sync() {
    return this.client.list(this.getListParams());
  }

  public async executeSync(): Promise<SyncedResourcesSyncResult<typeof this.continuation>> {
    await this.init();

    this.throttleStatus = await GraphQlFetcher.createInstance(this.context).checkThrottleStatus();
    const deferByMs = this.getDeferWaitTime();
    if (deferByMs > 0) return this.skipRun(deferByMs);

    logAdmin(`🚀  GraphQL Admin API: Starting sync…`);

    await this.beforeSync();

    const { body, pageInfo, cost } = await this.sync();
    this.models = await Promise.all(body.map(async (data) => this.createInstanceFromData(data)));
    const hasNextRun = pageInfo && pageInfo.hasNextPage;

    /** Set continuation if a next page exists */
    if (hasNextRun) {
      this.continuation = AbstractSyncedGraphQlResources.getNextRunContinuation({
        pageInfo,
        lastLimit: this.currentLimit,
        lastCost: cost,
        extraData: this.pendingExtraContinuationData,
      });
    }

    await this.afterSync();

    return this.asStatic().formatSyncResults(this.models, this.continuation);
  }

  protected static getNextRunContinuation({
    pageInfo,
    lastCost,
    lastLimit,
    extraData = {},
  }: {
    pageInfo?: PageInfo;
    lastCost?: ShopifyGraphQlRequestCost;
    lastLimit: number;
    extraData: any;
  }) {
    let continuation: SyncTableGraphQlContinuation = {
      hasLock: 'true',
      extraData,
    };

    if (pageInfo && pageInfo.hasNextPage) {
      continuation = {
        ...continuation,
        cursor: pageInfo.endCursor,
      };
    }

    if (lastCost) {
      continuation = {
        ...continuation,
        lastCost: stringifyContinuationProperty(lastCost),
        lastLimit,
      };
    }

    return continuation;
  }

  protected async createInstanceFromRow(row: BaseRow) {
    const instance = await super.createInstanceFromRow(row);
    if (this.supportMetafields && this.asStatic().hasMetafieldsInRow(row)) {
      // Warm up metafield definitions cache
      const metafieldDefinitions = await this.getMetafieldDefinitions();
      (instance as AbstractModelGraphQlWithMetafields).data.metafields =
        await MetafieldGraphQlModel.createInstancesFromOwnerRow({
          context: this.context,
          ownerRow: row,
          metafieldDefinitions,
          ownerResource: (this.model as unknown as typeof AbstractModelGraphQlWithMetafields).metafieldRestOwnerType,
        });
    }
    return instance;
  }
}
