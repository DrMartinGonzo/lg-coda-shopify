// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SearchParams } from '../../Clients/Client.types';
import { ShopifyGraphQlRequestCost } from '../../Errors/GraphQlErrors';
import { AbstractResource, FindAllResponseBase } from '../../Resources/Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllGraphQlResponse,
} from '../../Resources/Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractRestResource, FindAllRestResponse } from '../../Resources/Abstract/Rest/AbstractRestResource';
import { Stringified } from '../../types/utilities';

// #endregion

// #region Definition
type SyncTableDefinition =
  | coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
  | coda.DynamicSyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>;

/** Helper type to extract the parameter values from a SyncTableDef. */
export type SyncTableParamValues<
  T extends
    | coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
    | coda.DynamicSyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
> = coda.ParamValues<T['getter']['parameters']>;

export type CodaSyncParams<SyncTableDefT extends SyncTableDefinition = never> = SyncTableDefT extends never
  ? coda.ParamValues<coda.ParamDefs>
  : SyncTableParamValues<SyncTableDefT>;
// #endregion

// #region SyncTableManager
export interface ISyncTableManager {
  /** The standard (non prefixed metafields) fromKey properties within the current schema we want to sync */
  effectiveStandardFromKeys: string[];

  /** The continuation from the previous sync */
  prevContinuation: coda.Continuation;
  /** The continuation from the current sync. This will become prevContinuation in the next sync */
  continuation: coda.Continuation;
  pendingExtraContinuationData: any;

  setSyncFunction(syncFunction: CallableFunction): void;
  executeSync(params: any): Promise<SyncTableManagerResult<typeof this.continuation, FindAllResponseBase<any>>>;
}

export interface ISyncTableManagerConstructorArgs {
  /** The Coda sync execution context */
  context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  codaSyncParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  resource: typeof AbstractResource;
}
// #endregion

// #region Sync
export interface ExecuteSyncBaseArgs {
  defaultLimit?: number;
}

export interface ExecuteRestSyncArgs extends ExecuteSyncBaseArgs {}
export interface ExecuteGraphQlSyncArgs extends ExecuteSyncBaseArgs {}

export interface MakeSyncFunctionArgs<SyncTableDefT extends SyncTableDefinition, SyncTableManagerT extends any> {
  context: coda.SyncExecutionContext;
  codaSyncParams: CodaSyncParams<SyncTableDefT>;
  syncTableManager?: SyncTableManagerT;
}

// prettier-ignore
export type SyncRestFunction<T> = (params: { nextPageQuery: SearchParams;  limit: number } & {[key: string]: any}) => Promise<FindAllRestResponse<T>>;
export type SyncGraphQlFunction<T> = (params: { cursor: string; limit: number }) => Promise<FindAllGraphQlResponse<T>>;
// #endregion

// #region Continuation
export type RawBatchData = {
  processing: any[];
  remaining: any[];
};

export type RevivedBatchData<BaseT extends AbstractResource = AbstractResource> = {
  processing: BaseT[];
  remaining: BaseT[];
};

type SyncTableExtraContinuationData = {
  [key: string]: any;
};

export interface SyncTableRestContinuation extends coda.Continuation {
  nextUrl?: string;
  nextQuery?: Stringified<SearchParams>;
  scheduledNextRestUrl?: string;
  skipNextRestSync: string;
  extraData: SyncTableExtraContinuationData;
}

export interface SyncTableGraphQlContinuation extends coda.Continuation {
  cursor?: string;
  graphQlLock: string;
  lastCost?: Stringified<ShopifyGraphQlRequestCost>;
  lastLimit?: number;
  extraData: SyncTableExtraContinuationData;
}

export interface SyncTableMixedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  extraData: SyncTableExtraContinuationData & {
    batch?: Stringified<RawBatchData>;
  };
}
// #endregion

// #region Results
export interface SyncTableSyncResult {
  result: Array<any>;
  continuation?: any;
}

export interface SyncTableUpdateResult {
  result: Array<any>;
}

export interface SyncTableManagerResult<C extends coda.Continuation, R extends FindAllResponseBase<any>> {
  response: R;
  continuation?: C;
}

export interface SyncTableManagerRestResult<C extends coda.Continuation, BaseT extends AbstractRestResource>
  extends SyncTableManagerResult<C, FindAllRestResponse<BaseT>> {}

export interface SyncTableManagerGraphQlResult<BaseT extends AbstractGraphQlResource>
  extends SyncTableManagerResult<SyncTableGraphQlContinuation, FindAllGraphQlResponse<BaseT>> {}
// #endregion
