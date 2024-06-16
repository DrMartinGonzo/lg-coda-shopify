// #region Imports

import { SearchParams } from '../../Clients/Client.types';
import { AbstractRestClient } from '../../Clients/RestClients';
import { AbstractModelRest } from '../../models/rest/AbstractModelRest';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { MetafieldModel } from '../../models/rest/MetafieldModel';
import { BaseRow } from '../../schemas/CodaRows.types';
import { Stringified } from '../../types/utilities';
import { logAdmin } from '../../utils/helpers';
import {
  AbstractSyncedResources,
  ISyncedResourcesConstructorArgs,
  SyncTableContinuation,
  SyncedResourcesSyncResult,
} from '../AbstractSyncedResources';
import {
  parseContinuationProperty,
  restResourceSupportsMetafields,
  stringifyContinuationProperty,
} from '../utils/sync-utils';

// #endregion

// #region Types
export interface SyncTableRestContinuation extends SyncTableContinuation {
  nextUrl?: string;
  nextQuery?: Stringified<SearchParams>;
  scheduledNextRestUrl?: string;
  skipNextRestSync: string;
}

export interface ISyncedRestResourcesConstructorArgs<T> extends ISyncedResourcesConstructorArgs<T> {
  client: Pick<AbstractRestClient<any, any, any, any>, 'list' | 'defaultLimit'>;
}
// #endregion

export abstract class AbstractSyncedRestResources<
  T extends AbstractModelRest | AbstractModelRestWithRestMetafields
> extends AbstractSyncedResources<T> {
  protected readonly client: Pick<AbstractRestClient<any, any, any, any>, 'list' | 'defaultLimit'>;
  protected readonly prevContinuation: SyncTableRestContinuation;
  protected continuation: SyncTableRestContinuation;

  constructor({ client, ...args }: ISyncedRestResourcesConstructorArgs<T>) {
    super(args);

    this.client = client;
    this.supportMetafields = restResourceSupportsMetafields(this.model);
  }

  protected get currentLimit() {
    return this.shouldSyncMetafields ? 30 : this.client.defaultLimit;
  }

  protected get skipNextSync(): boolean {
    return this.prevContinuation?.skipNextRestSync === 'true';
  }
  protected get nextQuery(): SearchParams {
    return this.prevContinuation?.nextQuery ? parseContinuationProperty(this.prevContinuation.nextQuery) : {};
  }

  protected getListParams() {
    /**
     * Because the request URL contains the page_info parameter, you can't add
     * any other parameters to the request, except for limit. Including other
     * parameters can cause the request to fail.
     * @see https://shopify.dev/api/usage/pagination-rest
     */
    return {
      limit: this.currentLimit,
      ...('page_info' in this.nextQuery ? this.nextQuery : this.codaParamsToListArgs()),
    };
  }

  protected async sync() {
    return this.client.list(this.getListParams());
  }

  public async executeSync(): Promise<SyncedResourcesSyncResult<typeof this.continuation>> {
    await this.init();

    if (!this.skipNextSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      await this.beforeSync();

      const response = await this.sync();
      this.models = await Promise.all(response.body.map(async (data) => this.createInstanceFromData(data)));

      const hasNextRun = !!response?.pageInfo?.nextPage?.query;
      if (hasNextRun) {
        this.continuation = this.getNextRunContinuation({
          nextQuery: response.pageInfo.nextPage.query,
        });
      }

      if (this.shouldSyncMetafields) {
        await Promise.all(
          this.models.map(async (data) => {
            if ('syncMetafields' in data) await data.syncMetafields();
          })
        );
      }

      await this.afterSync();

      return this.asStatic().formatSyncResults(this.models, this.continuation);
    }
  }

  protected getNextRunContinuation({ nextQuery }: { nextQuery?: SearchParams }) {
    this.continuation = {
      ...(this.continuation ?? {}),
      nextQuery: stringifyContinuationProperty(nextQuery),
      skipNextRestSync: 'false',
      extraData: this.pendingExtraContinuationData ?? {},
    };

    return this.continuation;
  }

  protected async createInstanceFromRow(row: BaseRow) {
    const instance = await super.createInstanceFromRow(row);

    if (this.supportMetafields && this.asStatic().hasMetafieldsInRow(row)) {
      // Warm up metafield definitions cache
      const metafieldDefinitions = await this.getMetafieldDefinitions();
      (instance as AbstractModelRestWithRestMetafields).data.metafields =
        await MetafieldModel.createInstancesFromOwnerRow({
          context: this.context,
          ownerRow: row,
          metafieldDefinitions,
          ownerResource: (this.model as unknown as typeof AbstractModelRestWithRestMetafields).metafieldRestOwnerType,
        });
    }
    return instance;
  }
}
