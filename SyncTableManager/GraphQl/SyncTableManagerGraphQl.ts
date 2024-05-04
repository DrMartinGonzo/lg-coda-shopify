// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GraphQlClient } from '../../Clients/GraphQlClient';
import { wait } from '../../Clients/utils/client-utils';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Errors/GraphQlErrors';
import { AbstractGraphQlResource } from '../../Resources/Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractGraphQlResourceWithMetafields } from '../../Resources/Abstract/GraphQl/AbstractGraphQlResourceWithMetafields';
import { GRAPHQL_BUDGET__MAX } from '../../config';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import { throttleStatusQuery } from '../../graphql/shop-graphql';
import { logAdmin } from '../../utils/helpers';
import { AbstractSyncTableManager, AddMetafieldsSupportMixin } from '../Abstract/AbstractSyncTableManager';
import { SyncTableGraphQlContinuation, SyncTableMixedContinuation } from '../types/SyncTableManager.types';
import {
  ExecuteGraphQlSyncArgs,
  SyncGraphQlFunction,
  SyncTableManagerGraphQlResult,
} from '../types/SyncTableManager.types';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/syncTableManager-utils';

// #endregion

export class SyncTableManagerGraphQl<BaseT extends AbstractGraphQlResource> extends AbstractSyncTableManager<
  BaseT,
  SyncTableGraphQlContinuation,
  SyncGraphQlFunction<BaseT>
> {
  private static async checkThrottleStatus(context: coda.ExecutionContext): Promise<ShopifyGraphQlThrottleStatus> {
    const response = await new GraphQlClient({ context }).request<typeof throttleStatusQuery>({
      documentNode: throttleStatusQuery,
      variables: {},
      options: { cacheTtlSecs: CACHE_DISABLED },
    });
    const { extensions } = response.body;
    return extensions.cost.throttleStatus;
  }

  public static async skipRun<ContinuationT extends coda.Continuation>(
    prevContinuation: ContinuationT,
    waitms: number
  ) {
    await wait(waitms);
    return {
      response: {
        data: [],
        headers: null,
        cost: null,
      },
      continuation: { ...prevContinuation, graphQlLock: 'false' },
    };
  }

  public static async getMaxLimitAndDeferWaitTime(
    context: coda.SyncExecutionContext,
    prevContinuation: SyncTableGraphQlContinuation,
    defaultLimit: number
  ) {
    const previousLockAcquired = prevContinuation?.graphQlLock ? prevContinuation.graphQlLock === 'true' : false;
    const throttleStatus = await SyncTableManagerGraphQl.checkThrottleStatus(context);
    const { currentlyAvailable, maximumAvailable } = throttleStatus;
    console.log('maximumAvailable', maximumAvailable);
    console.log('currentlyAvailable', currentlyAvailable);

    let limit: number;
    let shouldDeferBy = 0;

    if (previousLockAcquired) {
      limit = this.calcMaxLimit(prevContinuation, throttleStatus, defaultLimit);
    } else {
      const minPointsNeeded = maximumAvailable - 1;
      shouldDeferBy = currentlyAvailable < minPointsNeeded ? 3000 : 0;
      limit = defaultLimit;

      if (shouldDeferBy > 0) {
        logAdmin(
          `🚫 Not enough points (${currentlyAvailable}/${minPointsNeeded}). Skip and wait ${shouldDeferBy / 1000}s`
        );
      }
    }

    return {
      limit,
      shouldDeferBy,
      throttleStatus,
    };
  }

  private static calcMaxLimit(
    prevContinuation: SyncTableMixedContinuation | SyncTableGraphQlContinuation,
    currentThrottleStatus: ShopifyGraphQlThrottleStatus,
    defaultLimit: number
  ) {
    const lastCost = parseContinuationProperty<ShopifyGraphQlRequestCost>(prevContinuation.lastCost);
    const { lastLimit } = prevContinuation;

    if (!lastLimit || !lastCost) {
      console.error(`calcSyncTableMaxLimit: No lastLimit or lastCost in prevContinuation`);
      return defaultLimit;
    }

    const costOneEntry = lastCost.requestedQueryCost / lastLimit;
    const maxCost = Math.min(GRAPHQL_BUDGET__MAX, currentThrottleStatus.currentlyAvailable);
    const maxLimit = Math.floor(maxCost / costOneEntry);
    return Math.min(GRAPHQL_NODES_LIMIT, maxLimit);
  }

  public async executeSync({
    defaultLimit = GRAPHQL_NODES_LIMIT,
  }: ExecuteGraphQlSyncArgs): Promise<SyncTableManagerGraphQlResult<BaseT>> {
    const { limit, shouldDeferBy } = await SyncTableManagerGraphQl.getMaxLimitAndDeferWaitTime(
      this.context,
      this.prevContinuation,
      defaultLimit
    );

    if (shouldDeferBy > 0) {
      return SyncTableManagerGraphQl.skipRun(this.prevContinuation, shouldDeferBy);
    }

    logAdmin(`🚀  GraphQL Admin API: Starting sync…`);

    const response = await this.syncFunction({ limit, cursor: this.prevContinuation?.cursor });

    // /** Always set continuation if extraContinuationData is set */
    // if (this.extraContinuationData) {
    //   this.continuation = {
    //     graphQlLock: 'true',
    //     retries: 0,
    //     extraData: this.extraContinuationData,
    //   };
    // }

    const { pageInfo, cost } = response;
    const hasNextRun = pageInfo && pageInfo.hasNextPage;

    /** Set continuation if a next page exists */
    if (hasNextRun) {
      this.continuation = {
        graphQlLock: 'true',
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

export const SyncTableManagerGraphQlWithMetafields = AddMetafieldsSupportMixin(SyncTableManagerGraphQl);
export type SyncTableManagerGraphQlWithMetafieldsType<
  ResourceConstructorT extends AbstractGraphQlResourceWithMetafields
> = Omit<InstanceType<typeof SyncTableManagerGraphQlWithMetafields>, 'resource'> & {
  readonly resource: (new () => ResourceConstructorT) & typeof AbstractGraphQlResourceWithMetafields;
};
