// #region Imports
import * as coda from '@codahq/packs-sdk';

import { REST_DEFAULT_LIMIT } from '../../../constants';
import { GetRequestParams, cleanQueryParams, extractNextUrlPagination, makeGetRequest } from '../../../helpers-rest';
import { ResourceWithSchemaUnion } from '../../../resources/Resource.types';
import { getObjectSchemaEffectiveKey, logAdmin } from '../../../utils/helpers';
import { MultipleFetchRestData, MultipleFetchRestResponse } from '../../Client/Rest/RestClient';
import { RestClientWithSchema } from '../../Client/Rest/RestClientWithSchema';
import {
  SyncTableMixedContinuation,
  SyncTableRestContinuation,
  SyncTableSyncResult,
  SyncTableUpdateResult,
} from '../SyncTable.types';

// #endregion

export abstract class SyncTableRest<ResourceT extends ResourceWithSchemaUnion> {
  public readonly resource: ResourceT;
  /** An object of Rest Admin API parameters */
  private _syncParams: ResourceT['rest']['params']['sync'] = {} as ResourceT['rest']['params']['sync'];

  // TODO: better typing when using a fetcher inheriting from RestClient
  protected readonly fetcher: RestClientWithSchema<ResourceT>;
  protected readonly context: coda.ExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected readonly schema: coda.ArraySchema<coda.Schema>;

  protected effectivePropertyKeys: string[];
  protected restLimit: number;

  /** Formatted items result */
  protected items: Array<ResourceT['codaRow']> = [];

  /** The continuation from the previous sync */
  protected prevContinuation: SyncTableMixedContinuation<ResourceT['codaRow']>;
  /** The continuation from the current sync. This will become prevContinuation in the next sync */
  protected continuation: SyncTableRestContinuation;
  protected extraContinuationData: any = {};

  constructor(
    resource: ResourceT,
    fetcher: RestClientWithSchema<ResourceT>,
    schema: coda.ArraySchema<coda.Schema>,
    codaParams: coda.ParamValues<coda.ParamDefs>
  ) {
    this.resource = resource;
    this.fetcher = fetcher;
    this.schema = schema;
    this.context = this.fetcher.context;
    this.codaParams = codaParams;

    this.continuation = null;
    this.prevContinuation = this.fetcher.context.sync.continuation as SyncTableMixedContinuation;

    this.restLimit = REST_DEFAULT_LIMIT;
    this.effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
  }

  set syncParams(v) {
    this._syncParams = cleanQueryParams(v);
    this.validateSyncParams(this._syncParams);
  }
  get syncParams() {
    return this._syncParams ?? {};
  }

  /** The url to call the API with for the sync */
  get syncUrl(): string {
    return this.prevContinuation?.nextUrl
      ? coda.withQueryParams(this.prevContinuation.nextUrl, { limit: this._syncParams?.limit })
      : this.fetcher.getFetchAllUrl(this.syncParams);
  }

  protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  // #region Sync
  private async makeSyncRequest(params: GetRequestParams): Promise<MultipleFetchRestResponse<ResourceT>> {
    logAdmin(`🚀  Rest Admin API: Starting ${this.resource.display} sync…`);
    return makeGetRequest<MultipleFetchRestData<ResourceT>>({ url: params.url }, this.context);
  }

  protected async mainSync(): Promise<SyncTableSyncResult> {
    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    if (!skipNextRestSync) {
      const response = await this.makeSyncRequest({ url: this.syncUrl });
      this.afterMainSync(response);

      return {
        result: this.items,
        continuation: this.continuation,
      };
    }

    return {
      result: [],
    };
  }

  afterMainSync(response: MultipleFetchRestResponse<ResourceT>): void {
    this.items = this.handleSyncTableResponse(response as any);
    // Check if we have paginated results
    const nextUrl = extractNextUrlPagination(response);
    if (nextUrl) {
      this.continuation = {
        nextUrl,
        skipNextRestSync: 'false',
        extraContinuationData: this.extraContinuationData,
      };
    }
  }

  async executeSync(): Promise<SyncTableSyncResult> {
    return this.mainSync();
  }

  // async executeUpdate(
  //   updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>
  // ): Promise<SyncTableUpdateResult> {
  //   // const metafieldDefinitions =
  //   //   !!this.metafieldOwnerType && hasMetafieldsInUpdates(updates)
  //   //     ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.metafieldOwnerType }, this.context)
  //   //     : [];

  //   const completed = await Promise.allSettled(
  //     updates.map(async (update) =>
  //       this.fetcher.handleUpdateJob(
  //         update
  //         // metafieldDefinitions
  //       )
  //     )
  //   );
  //   return {
  //     result: completed.map((job) => {
  //       if (job.status === 'fulfilled') return job.value;
  //       else return job.reason;
  //     }),
  //   };
  // }
  async executeUpdate(
    updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>
  ): Promise<SyncTableUpdateResult> {
    const completed = await Promise.allSettled(
      updates.map(async (update) => {
        // TODO: extract this to a helper ?
        const includedProperties = update.updatedFields.concat([
          getObjectSchemaEffectiveKey(this.resource.schema, this.resource.schema.idProperty),
        ]);
        const previousRow = update.previousValue as ResourceT['codaRow'];
        const newRow = Object.fromEntries(
          Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
        ) as ResourceT['codaRow'];

        const restParams = this.fetcher.formatRowToApi(newRow);
        const updatedRow = await this.fetcher.updateAndFormatToRow({
          id: newRow.id,
          restUpdate: restParams,
        });

        return {
          ...previousRow,
          ...updatedRow,
        };
      })
    );
    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  }
  // #endregion

  // #region Sync:After
  handleSyncTableResponse(response: MultipleFetchRestResponse<ResourceT>): ResourceT['codaRow'][] {
    const { formatApiToRow } = this.fetcher;
    const { plural, singular } = this.resource.rest;
    const resourceKey = this.fetcher.isSingleFetch ? singular : plural;
    const data = response?.body[resourceKey];
    if (data) {
      return Array.isArray(data) ? data.map(formatApiToRow) : [formatApiToRow(data)];
    }
    return [] as ResourceT['codaRow'][];
  }

  // #endregion
}
