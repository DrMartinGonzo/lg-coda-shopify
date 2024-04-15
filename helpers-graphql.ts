// #region Imports
import * as coda from '@codahq/packs-sdk';
import { graphql } from './utils/graphql';

import { GRAPHQL_BUDGET__MAX } from './config/config';
import { GraphQlResourceName } from './resources/ShopifyResource.types';
import { logAdmin, wait } from './utils/helpers';

import { FormattingError, InvalidValueError } from './Errors';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './Fetchers/NEW/GraphQLError';
import { GraphQlClientNEW } from './Fetchers/NEW/GraphQlClientNEW';
import type { SyncTableGraphQlContinuation } from './Fetchers/SyncTable/SyncTable.types';
import { SyncTableMixedContinuation } from './Fetchers/SyncTable/SyncTable.types';
import { parseContinuationProperty } from './Fetchers/fetcher-helpers';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from './constants';
import { throttleStatusQuery } from './resources/shop/shop-graphql';

// #endregion

// #region GID functions
function isGraphQlGid(gid: string) {
  if (gid.startsWith('gid://shopify/')) return true;
  return false;
}

export function idToGraphQlGid(resourceName: GraphQlResourceName, id: number | string) {
  if (typeof id === 'string' && isGraphQlGid(id)) {
    return id as string;
  }
  if (resourceName === undefined || id === undefined || typeof id !== 'number') {
    throw new FormattingError('GraphQlGid', resourceName, id);
  }
  return `gid://shopify/${resourceName}/${id}`;
}

export function graphQlGidToId(gid: string): number {
  if (!gid || !isGraphQlGid(gid)) throw new InvalidValueError('GID', gid);
  if (!Number.isNaN(parseInt(gid))) return Number(gid);

  const maybeNum = gid.split('/').at(-1)?.split('?').at(0);
  if (maybeNum) {
    return Number(maybeNum);
  }
  throw new InvalidValueError('GID', gid);
}

function graphQlGidToResourceName(gid: string): GraphQlResourceName {
  if (!gid || !isGraphQlGid(gid)) throw new InvalidValueError('GID', gid);
  return gid.split('gid://shopify/').at(1)?.split('/').at(0) as GraphQlResourceName;
}
// #endregion

// #region GraphQl auto throttling
async function checkThrottleStatus(context: coda.ExecutionContext): Promise<ShopifyGraphQlThrottleStatus> {
  const response = await new GraphQlClientNEW({ context }).request<typeof throttleStatusQuery>({
    documentNode: throttleStatusQuery,
    variables: {},
    options: { cacheTtlSecs: CACHE_DISABLED },
  });
  const { extensions } = response.body;
  return extensions.cost.throttleStatus;
}

function calcSyncTableMaxEntriesPerRun(
  prevContinuation: SyncTableMixedContinuation | SyncTableGraphQlContinuation,
  currentThrottleStatus: ShopifyGraphQlThrottleStatus,
  defaultMaxEntriesPerRun: number
) {
  const lastCost = parseContinuationProperty<ShopifyGraphQlRequestCost>(prevContinuation.lastCost);
  const lastMaxEntriesPerRun = prevContinuation.lastMaxEntriesPerRun;

  if (!lastMaxEntriesPerRun || !lastCost) {
    console.error(`calcSyncTableMaxEntriesPerRun: No lastMaxEntriesPerRun or lastCost in prevContinuation`);
    return defaultMaxEntriesPerRun;
  }

  const costOneEntry = lastCost.requestedQueryCost / lastMaxEntriesPerRun;
  const maxCost = Math.min(GRAPHQL_BUDGET__MAX, currentThrottleStatus.currentlyAvailable);
  const maxEntries = Math.floor(maxCost / costOneEntry);
  return Math.min(GRAPHQL_NODES_LIMIT, maxEntries);
}

export async function getGraphQlSyncTableMaxEntriesAndDeferWait(
  defaultMaxEntriesPerRun: number,
  prevContinuation: SyncTableGraphQlContinuation,
  context: coda.ExecutionContext
) {
  const previousLockAcquired = prevContinuation?.graphQlLock ? prevContinuation.graphQlLock === 'true' : false;
  const throttleStatus = await checkThrottleStatus(context);
  const { currentlyAvailable, maximumAvailable } = throttleStatus;

  let maxEntriesPerRun: number;
  let shouldDeferBy = 0;

  if (previousLockAcquired) {
    maxEntriesPerRun = calcSyncTableMaxEntriesPerRun(prevContinuation, throttleStatus, defaultMaxEntriesPerRun);
  } else {
    const minPointsNeeded = maximumAvailable - 1;
    shouldDeferBy = currentlyAvailable < minPointsNeeded ? 3000 : 0;
    maxEntriesPerRun = defaultMaxEntriesPerRun;

    if (shouldDeferBy > 0) {
      logAdmin(
        `🚫 Not enough points (${currentlyAvailable}/${minPointsNeeded}). Skip and wait ${shouldDeferBy / 1000}s`
      );
    }
  }

  return {
    maxEntriesPerRun,
    shouldDeferBy,
    throttleStatus,
  };
}

export async function skipGraphQlSyncTableRun(prevContinuation: SyncTableGraphQlContinuation, waitms: number) {
  await wait(waitms);
  return {
    response: {
      data: [],
      headers: {},
    },
    continuation: { ...prevContinuation, graphQlLock: 'false' },
  };
}
// #endregion

// #region Unused stuff
/*
export async function makeGraphQlBulkRequest(
  params: {
    payload: any;
    apiVersion?: string;
  },
  context: coda.ExecutionContext
) {
  const options: coda.FetchRequest = {
    method: 'POST',
    url: `${context.endpoint}/admin/api/${params.apiVersion ?? GRAPHQL_DEFAULT_API_VERSION}/graphql.json`,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };

  const res = await context.fetcher.fetch(options);
  return res.body.data.bulkOperationRunQuery.bulkOperation.id;
}
*/
// #endregion
