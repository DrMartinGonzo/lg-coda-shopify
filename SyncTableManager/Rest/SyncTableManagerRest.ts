// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FindAllResponse } from '../../Resources/Abstract/Rest/AbstractRestResource';
import { AbstractSyncedRestResource, SyncRestFunction } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { FieldDependency } from '../../schemas/Schema.types';
import { handleFieldDependencies, logAdmin } from '../../utils/helpers';
import { SyncTableRestContinuation } from '../types/SyncTable.types';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/syncTableManager-utils';

// #endregion

// #region Types
export interface SyncTableManagerRestResult<
  continuationT extends coda.Continuation,
  BaseT extends AbstractSyncedRestResource = AbstractSyncedRestResource
> {
  response: FindAllResponse<BaseT>;
  continuation?: continuationT;
}

export interface ExecuteSyncArgs<BaseT extends AbstractSyncedRestResource = AbstractSyncedRestResource> {
  sync: SyncRestFunction<BaseT>;
  adjustLimit?: number;
  getNestedData?: (response: FindAllResponse<BaseT>, context: coda.SyncExecutionContext) => Array<BaseT>;
}
// #endregion

export class SyncTableManagerRest<BaseT extends AbstractSyncedRestResource> {
  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected readonly schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;

  public effectiveStandardFromKeys: string[];

  /** The continuation from the previous sync */
  public prevContinuation: SyncTableRestContinuation;
  /** The continuation from the current sync. This will become prevContinuation in the next sync */
  public continuation: SyncTableRestContinuation;
  public extraContinuationData: any;

  constructor(
    schema: coda.ArraySchema<coda.ObjectSchema<string, string>>,
    codaParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ) {
    this.context = context;
    this.codaParams = codaParams;

    this.continuation = null;
    this.prevContinuation = context.sync.continuation as SyncTableRestContinuation;

    this.schema = schema;

    this.effectiveStandardFromKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
  }

  public getSyncedStandardFields(dependencies?: Array<FieldDependency<any>>): string[] {
    return handleFieldDependencies(this.effectiveStandardFromKeys, dependencies);
  }

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  // #region Sync
  public async executeSync({
    sync,
    adjustLimit,
  }: ExecuteSyncArgs<BaseT>): Promise<SyncTableManagerRestResult<typeof this.continuation, BaseT>> {
    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    if (!skipNextRestSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      const nextQuery = this.prevContinuation?.nextQuery
        ? parseContinuationProperty(this.prevContinuation.nextQuery)
        : {};

      const response = await sync(nextQuery, adjustLimit);

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
  // #endregion
}
