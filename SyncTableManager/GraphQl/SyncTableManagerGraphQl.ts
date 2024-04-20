// #region Imports

import { AbstractSyncedGraphQlResource } from '../../Resources/Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { GRAPHQL_NODES_LIMIT } from '../../constants';
import { logAdmin } from '../../utils/helpers';
import { AbstractSyncTableManagerWithMetafields } from '../Abstract/AbstractSyncTableManagerWithMetafields';
import { SyncTableGraphQlContinuation } from '../types/SyncTable.types';
import {
  ExecuteGraphQlSyncArgs,
  ISyncTableManagerWithMetafields,
  SyncTableManagerGraphQlResult,
} from '../types/SyncTableManager.types';
import {
  getGraphQlSyncTableMaxLimitAndDeferWait,
  skipGraphQlSyncTableRun,
  stringifyContinuationProperty,
} from '../utils/syncTableManager-utils';

// #endregion

export class SyncTableManagerGraphQl<BaseT extends AbstractSyncedGraphQlResource>
  extends AbstractSyncTableManagerWithMetafields<BaseT, SyncTableGraphQlContinuation>
  implements ISyncTableManagerWithMetafields
{
  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  public async executeSync({
    sync,
    defaultLimit = GRAPHQL_NODES_LIMIT,
  }: ExecuteGraphQlSyncArgs<BaseT>): Promise<SyncTableManagerGraphQlResult<BaseT>> {
    // TODO: maybe synctable should never handle retries, but only GraphQLClient for simplicity
    // Le seul probleme serait de dépasser le seuil de temps d'execution pour un run
    // de synctable avec les temps d'attentes pour repayer le cout graphql, mais
    // comme la requete graphql est elle même rapide, ça devrait passer ?

    const { limit, shouldDeferBy, throttleStatus } = await getGraphQlSyncTableMaxLimitAndDeferWait(
      defaultLimit,
      this.prevContinuation,
      this.context
    );

    if (shouldDeferBy > 0) {
      return skipGraphQlSyncTableRun(this.prevContinuation, shouldDeferBy);
    }

    logAdmin(`🚀  GraphQL Admin API: Starting sync…`);

    // TODO: handle retries
    const response = await sync({
      cursor: this.prevContinuation?.cursor,
      limit,
    });

    // /** Always set continuation if extraContinuationData is set */
    // if (this.extraContinuationData) {
    //   this.continuation = {
    //     graphQlLock: 'true',
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
        retries: 0,
        extraData: this.extraContinuationData,
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
          lastLimit: limit,
        };
      }
    }

    return {
      response,
      continuation: this.continuation,
    };
  }
}
