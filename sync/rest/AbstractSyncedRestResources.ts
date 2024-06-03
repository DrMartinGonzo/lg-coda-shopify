// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SearchParams } from '../../Clients/Client.types';
import { IRestCRUD } from '../../Clients/RestApiClientBase';
import { RequiredSyncTableMissingVisibleError } from '../../Errors/Errors';
import { hasMetafieldsInUpdate } from '../../Resources/utils/abstractResource-utils';
import { SyncTableUpdateResult } from '../../SyncTableManager/types/SyncTableManager.types';
import {
  parseContinuationProperty,
  stringifyContinuationProperty,
} from '../../SyncTableManager/utils/syncTableManager-utils';
import { REST_DEFAULT_LIMIT } from '../../constants';
import { AbstractModelRest } from '../../models/rest/AbstractModelRest';
import { AbstractModelRestWithMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { MetafieldModel } from '../../models/rest/MetafieldModel';
import { BaseRow } from '../../schemas/CodaRows.types';
import { Stringified } from '../../types/utilities';
import { arrayUnique, logAdmin } from '../../utils/helpers';
import {
  AbstractSyncedResources,
  ISyncedResourcesConstructorArgs,
  SyncTableContinuation,
  SyncTableExtraContinuationData,
  SyncedResourcesSyncResult,
} from '../AbstractSyncedResources';

// #endregion

// #region Types
export interface SyncTableRestContinuation extends SyncTableContinuation {
  nextUrl?: string;
  nextQuery?: Stringified<SearchParams>;
  scheduledNextRestUrl?: string;
  skipNextRestSync: string;
}

export interface ISyncedRestResourcesConstructorArgs<T> extends ISyncedResourcesConstructorArgs<T> {
  client: IRestCRUD;
}
// #endregion

function hasMetafieldsSupport<T extends AbstractModelRest<T> | AbstractModelRestWithMetafields<T>>(
  model: any
): model is typeof AbstractModelRestWithMetafields {
  return (
    (model as typeof AbstractModelRestWithMetafields).metafieldRestOwnerType !== undefined &&
    (model as typeof AbstractModelRestWithMetafields).metafieldGraphQlOwnerType !== undefined
  );
}

export abstract class AbstractSyncedRestResources<
  T extends AbstractModelRest<T> | AbstractModelRestWithMetafields<T>
> extends AbstractSyncedResources<T> {
  protected static defaultLimit = REST_DEFAULT_LIMIT;
  protected readonly client: IRestCRUD;
  protected readonly prevContinuation: SyncTableRestContinuation;
  protected continuation: SyncTableRestContinuation;

  constructor({ client, ...args }: ISyncedRestResourcesConstructorArgs<T>) {
    super(args);

    this.client = client;
    this.supportMetafields = hasMetafieldsSupport(this.model);
  }

  public async init() {
    await super.init();
    this.currentLimit = this.shouldSyncMetafields ? 30 : this.asStatic().defaultLimit;
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

  // TODO: ça n'a plus besoin d'être une methode à part
  protected async sync() {
    return this.client.list(this.getListParams());
  }

  public async executeSync(): Promise<SyncedResourcesSyncResult<typeof this.continuation>> {
    await this.init();

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
          extraData: this.pendingExtraContinuationData ?? {},
        };
      }

      if (this.shouldSyncMetafields) {
        await Promise.all(
          this.data.map(async (data) => {
            if ('syncMetafields' in data) await data.syncMetafields();
          })
        );
      }

      await this.afterSync();

      return {
        result: this.data.map((data) => data.toCodaRow()),
        continuation: this.continuation,
      };
    }
  }

  public async executeSyncUpdate(updates: Array<coda.SyncUpdate<string, string, any>>): Promise<SyncTableUpdateResult> {
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

        const instance = this.model.createInstanceFromRow(this.context, newRow);

        // Warm up metafield definitions cache
        if (this.supportMetafields && hasMetafieldsInUpdate(update)) {
          const metafieldDefinitions = await this.getMetafieldDefinitions();
          (instance as AbstractModelRestWithMetafields<T>).data.metafields =
            await MetafieldModel.createInstancesFromOwnerRow({
              context: this.context,
              ownerRow: newRow,
              metafieldDefinitions,
              ownerResource: (this.model as unknown as typeof AbstractModelRestWithMetafields).metafieldRestOwnerType,
            });
        }

        try {
          await instance.save();
        } catch (error) {
          if (error instanceof RequiredSyncTableMissingVisibleError) {
            /** Try to augment with fresh data and check again if it passes validation */
            await instance.addMissingData();
            await instance.save();
          } else {
            throw error;
          }
        }

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
}
