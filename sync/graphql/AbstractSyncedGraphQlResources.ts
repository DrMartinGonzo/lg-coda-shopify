// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractGraphQlClient, GraphQlFetcher } from '../../Clients/GraphQlApiClientBase';
import { AbstractModelGraphQl } from '../../models/graphql/AbstractModelGraphQl';
import { AbstractModelGraphQlWithMetafields } from '../../models/graphql/AbstractModelGraphQlWithMetafields';
import {
  AbstractSyncedResources,
  ISyncedResourcesConstructorArgs,
  SyncTableContinuation,
  SyncedResourcesSyncResult,
} from '../AbstractSyncedResources';

import { wait } from '../../Clients/utils/client-utils';
import { RequiredSyncTableMissingVisibleError } from '../../Errors/Errors';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Errors/GraphQlErrors';
import { GRAPHQL_BUDGET__MAX } from '../../config';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { BaseRow } from '../../schemas/CodaRows.types';
import { Stringified } from '../../types/utilities';
import { arrayUnique, logAdmin } from '../../utils/helpers';
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

  // private async getMetafieldDefinitions(): Promise<MetafieldDefinition[]> {
  //   if (this._metafieldDefinitions) return this._metafieldDefinitions;

  //   this._metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({
  //     context: this.context,
  //     ownerType: (this.model as unknown as typeof AbstractGraphQlModelWithMetafields).metafieldGraphQlOwnerType,
  //   });
  //   return this._metafieldDefinitions;
  // }

  private getDeferWaitTime() {
    const { currentlyAvailable, maximumAvailable } = this.throttleStatus;
    console.log('maximumAvailable', maximumAvailable);
    console.log('currentlyAvailable', currentlyAvailable);

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
    if (this.hasLock) {
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
  private get minPointsNeeded() {
    return this.throttleStatus.maximumAvailable - 1;
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
    if (deferByMs > 0) {
      logAdmin(
        `🚫 Not enough points (${this.throttleStatus.currentlyAvailable}/${this.minPointsNeeded}).
        Skip and wait ${deferByMs / 1000}s`
      );
      return this.skipRun(deferByMs);
    }

    logAdmin(`🚀  GraphQL Admin API: Starting sync…`);

    await this.beforeSync();

    const response = await this.sync();
    this.data = await Promise.all(response.body.map(async (data) => this.createInstanceFromData(data)));
    const { pageInfo, cost } = response;
    const hasNextRun = pageInfo && pageInfo.hasNextPage;

    /** Set continuation if a next page exists */
    if (hasNextRun) {
      this.continuation = {
        hasLock: 'true',
        extraData: this.pendingExtraContinuationData ?? {},
      };

      if (pageInfo && pageInfo.hasNextPage) {
        this.continuation = {
          ...this.continuation,
          cursor: pageInfo.endCursor,
        };
      }

      if (cost) {
        this.continuation = {
          ...this.continuation,
          lastCost: stringifyContinuationProperty(cost),
          lastLimit: this.currentLimit,
        };
      }
    }

    await this.afterSync();

    return {
      result: this.data.map((data) => data.toCodaRow()),
      continuation: this.continuation,
    };
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

  public async executeSyncUpdate(
    updates: Array<coda.SyncUpdate<string, string, any>>
  ): Promise<coda.GenericSyncUpdateResult> {
    await this.init();

    const completed = await Promise.allSettled(
      updates.map(async (update) => {
        const includedProperties = arrayUnique(
          update.updatedFields.concat(this.getRequiredPropertiesForUpdate(update))
        );

        const prevRow = update.previousValue as BaseRow;
        const newRow = Object.fromEntries(
          Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
        ) as BaseRow;
        const instance = await this.createInstanceFromRow(newRow);

        if (this.validateSyncUpdate) {
          try {
            this.validateSyncUpdate(prevRow, newRow);
          } catch (error) {
            // TODO: rename this error to something else ?
            if (error instanceof RequiredSyncTableMissingVisibleError) {
              /** Try to augment with fresh data and check again if it passes validation */
              await instance.addMissingData();
              this.validateSyncUpdate(prevRow, instance.toCodaRow());
            } else {
              throw error;
            }
          }
        }

        await instance.save();

        return { ...prevRow, ...instance.toCodaRow() };
      })
    );

    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  }

  // protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
  //   // Always include the id property
  //   return [this.schema.items.idProperty].filter(Boolean).map((key) => getObjectSchemaEffectiveKey(this.schema, key));
  // }
}
