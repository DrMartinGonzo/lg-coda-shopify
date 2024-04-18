// #region Imports
import * as coda from '@codahq/packs-sdk';

import { wait } from '../../Clients/utils/client-utils';
import { FindAllResponse } from '../../Resources/Abstract/GraphQl/AbstractGraphQlResource';
import {
  AbstractSyncedGraphQlResource,
  SyncGraphQlFunction,
} from '../../Resources/Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { GRAPHQL_NODES_LIMIT } from '../../constants';
import { logAdmin } from '../../utils/helpers';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../../utils/metafields-utils';
import { SyncTableGraphQlContinuation } from '../types/SyncTable.types';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  stringifyContinuationProperty,
} from '../utils/syncTableManager-utils';

// #endregion

// #region Types
interface SyncTableManagerGraphQlResult<
  continuationT extends coda.Continuation,
  BaseT extends AbstractSyncedGraphQlResource = AbstractSyncedGraphQlResource
> {
  response: FindAllResponse<BaseT>;
  continuation?: continuationT;
}

interface ExecuteSyncArgs<BaseT extends AbstractSyncedGraphQlResource = AbstractSyncedGraphQlResource> {
  sync: SyncGraphQlFunction<BaseT>;
  defaultMaxEntriesPerRun?: number;
}

// #endregion

export class SyncTableManagerGraphQl<BaseT extends AbstractSyncedGraphQlResource> {
  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected readonly schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;

  public effectiveStandardFromKeys: string[];
  public effectiveMetafieldKeys: string[];
  public shouldSyncMetafields: boolean;

  /** The continuation from the previous sync */
  public prevContinuation: SyncTableGraphQlContinuation;
  /** The continuation from the current sync. This will become prevContinuation in the next sync */
  public continuation: SyncTableGraphQlContinuation;
  public extraContinuationData: any;

  constructor(
    schema: coda.ArraySchema<coda.ObjectSchema<string, string>>,
    codaParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ) {
    this.context = context;
    this.codaParams = codaParams;

    this.continuation = null;
    this.prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;

    this.schema = schema;

    const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;
  }

  // public getSyncedStandardFields(dependencies?: Array<FieldDependency<any>>): string[] {
  //   return handleFieldDependencies(this.effectiveStandardFromKeys, dependencies);
  // }

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  // #region Sync
  public async executeSync({
    sync,
    defaultMaxEntriesPerRun = GRAPHQL_NODES_LIMIT,
  }: ExecuteSyncArgs<BaseT>): Promise<SyncTableManagerGraphQlResult<typeof this.continuation, BaseT>> {
    // TODO: maybe synctable should never handle retries, but only GraphQLClient for simplicity
    // Le seul probleme serait de dépasser le seuil de temps d'execution pour un run
    // de synctable avec les temps d'attendes pour repayer le cout graphql, mais
    // comme la requete graphql est elle mê:e rapide, ça devrait passer ?

    const { maxEntriesPerRun, shouldDeferBy, throttleStatus } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
      defaultMaxEntriesPerRun,
      this.prevContinuation,
      this.context
    );

    if (shouldDeferBy > 0) {
      await wait(shouldDeferBy);
      return {
        response: {
          data: [],
          headers: null,
          cost: null,
        },
        continuation: { ...this.prevContinuation, graphQlLock: 'false' },
      };

      // TODO: fix `any` type
      // return skipGraphQlSyncTableRun(prevContinuation as any, shouldDeferBy);
    }

    logAdmin(`🚀  GraphQL Admin API: Starting sync…`);

    // TODO: handle retries
    const response = await sync({
      cursor: this.prevContinuation?.cursor,
      maxEntriesPerRun,
    });

    // /** Always set continuation if extraContinuationData is set */
    // if (this.extraContinuationData) {
    //   this.continuation = {
    //     graphQlLock: 'true',
    //     // TODO: remove ?
    //     retries: 0,
    //     extraData: this.extraContinuationData,
    //   };
    // }

    const { pageInfo, cost } = response;
    // const hasNextRun = response.retries > 0 || (pageInfo && pageInfo.hasNextPage);
    const hasNextRun = pageInfo && pageInfo.hasNextPage;

    /** Set continuation if a next page exists */
    if (hasNextRun) {
      this.continuation = {
        graphQlLock: 'true',
        // TODO: remove ?
        retries: 0,
        extraData: this.extraContinuationData,
      };

      if (pageInfo && pageInfo.hasNextPage) {
        this.continuation = {
          ...this.continuation,
          cursor: pageInfo.endCursor,
        };
      }
      // TODO
      if (cost) {
        this.continuation = {
          ...this.continuation,
          lastCost: stringifyContinuationProperty(cost),
          lastMaxEntriesPerRun: maxEntriesPerRun,
        };
      }
    }

    return {
      response,
      continuation: this.continuation,
    };
  }
  // #endregion
}
