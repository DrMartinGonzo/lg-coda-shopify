// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableMixedContinuation, SyncTableRestContinuation } from './SyncTable.types';
import { parseContinuationProperty, stringifyContinuationProperty } from './syncTableManager-utils';
import { FindAllResponse } from '../Resources/AbstractResource';
import { AbstractResource_Synced, SyncFunction } from '../Resources/AbstractResource_Synced';
import { FieldDependency } from '../schemas/Schema.types';
import { handleFieldDependencies, logAdmin } from '../utils/helpers';

// #endregion

// #region Types
export interface SyncTableManagerResult<BaseT extends AbstractResource_Synced = AbstractResource_Synced> {
  response: FindAllResponse<BaseT>;
  continuation?: any;
}

export interface ExecuteSyncArgs {
  sync: SyncFunction;
  adjustLimit?: number;
  getNestedData?: (
    response: FindAllResponse<AbstractResource_Synced>,
    context: coda.SyncExecutionContext
  ) => Array<AbstractResource_Synced>;
}
// #endregion

export class SyncTableManagerRest<BaseT extends AbstractResource_Synced> {
  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected readonly schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;

  public effectiveStandardFromKeys: string[];

  /** The continuation from the previous sync */
  public prevContinuation: SyncTableMixedContinuation<ReturnType<BaseT['formatToRow']>>;
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
    this.prevContinuation = context.sync.continuation as SyncTableMixedContinuation;

    this.schema = schema;

    this.effectiveStandardFromKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
  }

  public getSyncedStandardFields(dependencies?: Array<FieldDependency<any>>): string[] {
    return handleFieldDependencies(this.effectiveStandardFromKeys, dependencies);
  }

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  // #region Sync
  public async executeSync({ sync, adjustLimit }: ExecuteSyncArgs): Promise<SyncTableManagerResult> {
    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    if (!skipNextRestSync) {
      logAdmin(`🚀  Rest Admin API: Starting sync…`);

      const nextQuery = this.prevContinuation?.nextQuery
        ? parseContinuationProperty(this.prevContinuation.nextQuery)
        : {};

      const response = await sync(nextQuery, adjustLimit);
      const data = response.data;

      // TODO: Don't set continuation if there's no next page, except for smart collections
      /** Always set continuation if extraContinuationData is set */
      if (this.extraContinuationData) {
        this.continuation = {
          skipNextRestSync: 'false',
          extraContinuationData: this.extraContinuationData,
        };
      }
      /** Set continuation if a next page exists */
      if (response?.pageInfo?.nextPage?.query) {
        this.continuation = {
          nextQuery: stringifyContinuationProperty(response.pageInfo.nextPage.query),
          skipNextRestSync: 'false',
          extraContinuationData: this.extraContinuationData ?? {},
        };
      }

      return {
        response,
        continuation: this.continuation,
      };
    }

    return {
      response: { data: [], headers: {} },
      continuation: this.prevContinuation ?? {},
    };
  }
  // #endregion
}
