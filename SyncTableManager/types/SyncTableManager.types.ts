// #region Improts
import * as coda from '@codahq/packs-sdk';

import { SearchParams } from '../../Clients/Client.types';
import { AbstractResource, FindAllResponseBase } from '../../Resources/Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllGraphQlResponse,
} from '../../Resources/Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractRestResource, FindAllRestResponse } from '../../Resources/Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  AbstractRestResourceWithRestMetafields,
  AugmentWithMetafieldsFunction,
} from '../../Resources/Abstract/Rest/AbstractRestResourceWithMetafields';
import { FieldDependency } from '../../schemas/Schema.types';
import { AbstractSyncTableManager } from '../Abstract/AbstractSyncTableManager';
import { SyncTableManagerGraphQl } from '../GraphQl/SyncTableManagerGraphQl';
import { CodaSyncParams, SyncTableDefinition, SyncTableGraphQlContinuation } from './SyncTable.types';

// #endregion

// #region SyncTableManager
export interface ISyncTableManager {
  /** The standard (non prefixed metafields) fromKey properties within the current schema we want to sync */
  effectiveStandardFromKeys: string[];

  /** The continuation from the previous sync */
  prevContinuation: coda.Continuation;
  /** The continuation from the current sync. This will become prevContinuation in the next sync */
  continuation: coda.Continuation;
  extraContinuationData: any;

  /** Responsible for handling dependencies in the schema */
  getSyncedStandardFields(dependencies?: Array<FieldDependency<any>>): string[];

  /** Execute the sync */
  executeSync(params: any): Promise<SyncTableManagerResult<typeof this.continuation, any>>;
}
export interface ISyncTableManagerWithMetafields extends ISyncTableManager {
  /** The prefixed metafields fromKey properties within the current schema we want to sync */
  effectiveMetafieldKeys: string[];
  /** A flag to determine if we should sync metafields */
  shouldSyncMetafields: boolean;
}

export interface ISyncTableManagerConstructorArgs {
  /** The Coda sync execution context */
  readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  readonly codaSyncParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  readonly schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;
}
// #endregion

// #region SyncTableManagerResult
export interface SyncTableManagerResult<C extends coda.Continuation, R extends FindAllResponseBase<any>> {
  response: R;
  continuation?: C;
}
export interface SyncTableManagerRestResult<C extends coda.Continuation, BaseT extends AbstractRestResource>
  extends SyncTableManagerResult<C, FindAllRestResponse<BaseT>> {}

export interface SyncTableManagerGraphQlResult<BaseT extends AbstractGraphQlResource>
  extends SyncTableManagerResult<SyncTableGraphQlContinuation, FindAllGraphQlResponse<BaseT>> {}
// #endregion

// #region SyncFunction
interface MakeSyncFunctionArgs<
  BaseT extends AbstractResource,
  SyncTableDefT extends SyncTableDefinition,
  SyncTableManagerT extends AbstractSyncTableManager<BaseT, coda.Continuation>
> {
  context: coda.SyncExecutionContext;
  codaSyncParams: CodaSyncParams<SyncTableDefT>;
  syncTableManager?: SyncTableManagerT;
}

export interface MakeSyncRestFunctionArgs<
  T extends AbstractRestResource,
  D extends SyncTableDefinition,
  S extends AbstractSyncTableManager<T, coda.Continuation> = AbstractSyncTableManager<T, coda.Continuation>
> extends MakeSyncFunctionArgs<T, D, S> {}

export interface MakeSyncGraphQlFunctionArgs<
  T extends AbstractGraphQlResource,
  D extends SyncTableDefinition,
  S extends SyncTableManagerGraphQl<T> = SyncTableManagerGraphQl<T>
> extends MakeSyncFunctionArgs<T, D, S> {}

// prettier-ignore
export type SyncRestFunction<T> = (params: { nextPageQuery: SearchParams;  limit: number }) => Promise<FindAllRestResponse<T>>;
export type SyncGraphQlFunction<T> = (params: { cursor: string; limit: number }) => Promise<FindAllGraphQlResponse<T>>;
// #endregion

// #region ExecuteSync
export interface ExecuteSyncBaseArgs<T extends CallableFunction = CallableFunction> {
  sync: T;
  defaultLimit?: number;
}
export interface ExecuteGraphQlSyncArgs<BaseT extends AbstractGraphQlResource>
  extends ExecuteSyncBaseArgs<SyncGraphQlFunction<BaseT>> {}

export interface ExecuteRestSyncArgs<BaseT extends AbstractRestResource>
  extends ExecuteSyncBaseArgs<SyncRestFunction<BaseT>> {}

export interface ExecuteRestSyncWithRestMetafieldsArgs<BaseT extends AbstractRestResourceWithRestMetafields>
  extends ExecuteRestSyncArgs<BaseT> {
  syncMetafields: AugmentWithMetafieldsFunction;
}
export interface ExecuteRestSyncWithGraphQlMetafieldsArgs<BaseT extends AbstractRestResourceWithGraphQLMetafields>
  extends ExecuteRestSyncArgs<BaseT> {
  getNestedData?: (response: FindAllRestResponse<BaseT>, context: coda.SyncExecutionContext) => Array<BaseT>;
}
// #endregion
