// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableGraphQlContinuation } from '../types/SyncTable.types';
import { stringifyContinuationProperty } from '../utils/syncTableManager-utils';
import { AbstractGraphQlResource } from '../../Resources/Abstract/GraphQl/AbstractGraphQlResource';
import { SyncTableManagerSyncFunction } from '../../Resources/Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { GRAPHQL_NODES_LIMIT } from '../../constants';
import { getGraphQlSyncTableMaxEntriesAndDeferWait } from '../utils/syncTableManager-utils';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../../utils/metafields-utils';
import { logAdmin } from '../../utils/helpers';
import { wait } from '../../Clients/utils/client-utils';

// #endregion

// #region Types
interface ExecuteSyncArgs {
  sync: SyncTableManagerSyncFunction;
  defaultMaxEntriesPerRun?: number;
}

interface SyncTableManagerResult<BaseT extends AbstractGraphQlResource = AbstractGraphQlResource> {
  response: {
    data: BaseT[];
  };
  continuation?: any;
}
// #endregion

export class SyncTableManagerGraphQl<BaseT extends AbstractGraphQlResource> {
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
  }: ExecuteSyncArgs): Promise<SyncTableManagerResult> {
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
          // lastMaxEntriesPerRun: maxEntriesPerRun,
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
    //     extraContinuationData: this.extraContinuationData,
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
        extraContinuationData: this.extraContinuationData,
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
      response: {
        data: response.data,
        // lastMaxEntriesPerRun: maxEntriesPerRun,
      },
      continuation: this.continuation,
    };
  }
  // #endregion
}
