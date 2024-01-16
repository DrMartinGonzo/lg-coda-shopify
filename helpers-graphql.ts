import * as coda from '@codahq/packs-sdk';

import { getShopifyRequestHeaders, getShopifyStorefrontRequestHeaders, wait } from './helpers';
import { GRAPHQL_BUDGET__MAX, GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX, IS_ADMIN_RELEASE } from './constants';
import {
  ShopifyGraphQlError,
  ShopifyGraphQlUserError,
  ShopifyMaxExceededError,
  ShopifyRetryableErrors,
  ShopifyThrottledError,
} from './shopifyErrors';
import { ShopifyGraphQlRequestCost } from './types/ShopifyGraphQlErrors';
import { SyncTableGraphQlContinuation, SyncTableStorefrontContinuation } from './types/tableSync';
import { FormatFunction } from './types/misc';

// TODO: still not ready, calculate this max ?
const ABSOLUTE_MAX_ENTRIES_PER_RUN = 100;

export function idToGraphQlGid(resourceType: string, id: number) {
  if (id === undefined) return undefined;
  return `gid://shopify/${resourceType}/${id}`;
}
export function graphQlGidToId(graphQlId: string) {
  if (graphQlId === undefined) return undefined;
  return parseInt(graphQlId.split('/').pop().split('?')[0]);
}
export function graphQlGidToResourceName(graphQlId: string): string {
  if (graphQlId === undefined) return undefined;
  return graphQlId.split('gid://shopify/')[1].split('/').pop();
}

export function calcSyncTableMaxEntriesPerRun(prevContinuation: SyncTableGraphQlContinuation) {
  const startTime = Date.now();
  const { lastCost, lastThrottleStatus, lastMaxEntriesPerRun, lastSyncTime } = prevContinuation;
  const { restoreRate, currentlyAvailable: lastAvailablePoints, maximumAvailable } = lastThrottleStatus;
  const { requestedQueryCost: lastRequestedQueryCost } = lastCost;
  const elapsedSinceLastRun = (startTime - lastSyncTime) / 1000;
  console.log('lastAvailablePoints', lastAvailablePoints);

  // const availablePoints = Math.min(
  //   maximumAvailable,
  //   lastAvailablePoints + elapsedSinceLastRun * (restoreRate ?? GRAPHQL_DEFAULT_RESTORE_RATE)
  // );
  // console.log('availablePoints', availablePoints);
  const costOneEntry = lastRequestedQueryCost / lastMaxEntriesPerRun;
  // const maxCost = Math.min(GRAPHQL_BUDGET__MAX, availablePoints);
  const maxCost = Math.min(GRAPHQL_BUDGET__MAX, lastAvailablePoints);
  const maxEntries = Math.floor(maxCost / costOneEntry);
  return Math.min(ABSOLUTE_MAX_ENTRIES_PER_RUN, maxEntries);
}

/**
 * Check if the available capacity for next execution is less than the requested
 * query cost.
 *
 * @param cost - The cost property of the query being requested.
 */
export function willThrottle(cost: ShopifyGraphQlRequestCost) {
  return cost.throttleStatus.currentlyAvailable < cost.requestedQueryCost;
}
/**
 * Check if there are any 'THROTTLED' errors.
 *
 * @param errors - The array of errors to check for a 'THROTTLED' code. Defaults to an empty array.
 */
export function isThrottled(errors: ShopifyGraphQlError[]) {
  return errors && errors.length && errors.some((error) => error.extensions?.code === 'THROTTLED');
}

export function isMaxCostExceeded(errors: ShopifyGraphQlError[]) {
  return errors && errors.length && errors.some((error) => error.extensions?.code === 'MAX_COST_EXCEEDED');
}

export async function handleSyncTableGraphQlContinuation(
  { extensions, extraContinuationData, pageInfo },
  currentMaxEntriesPerRun: number,
  storeFront?: boolean
) {
  let continuation: SyncTableStorefrontContinuation | SyncTableGraphQlContinuation = null;
  const endTime = Date.now();

  let requestedQueryCost: number;
  let restoreRate: number;

  if (!storeFront) {
    requestedQueryCost = extensions.cost.requestedQueryCost;
    restoreRate = extensions.cost.throttleStatus.restoreRate;
  }

  // repay the cost of the query if not Storefront
  if (!storeFront && pageInfo && pageInfo.hasNextPage) {
    const waitMs = (requestedQueryCost / restoreRate) * 1000;
    if (waitMs > 0) {
      console.log(`⏳ Repay query cost (${requestedQueryCost}) by waiting ${waitMs / 1000}s`);
      await wait(waitMs);
    }
  }

  if (pageInfo && pageInfo.hasNextPage) {
    continuation = {
      cursor: pageInfo.endCursor,
      lastSyncTime: endTime,
      retryCount: 0,
      extraContinuationData,
    };
    if (!storeFront) {
      continuation = {
        ...continuation,
        lastCost: {
          requestedQueryCost: extensions.cost.requestedQueryCost,
          actualQueryCost: extensions.cost.actualQueryCost,
        },
        lastMaxEntriesPerRun: currentMaxEntriesPerRun,
        lastThrottleStatus: extensions.cost.throttleStatus,
      };
    }
  }

  return continuation;
}

export async function handleSyncTableGraphQlErrorContinuation(
  error: Error,
  prevContinuation: SyncTableStorefrontContinuation | SyncTableGraphQlContinuation,
  currentMaxEntriesPerRun: number,
  extraContinuationData: any
) {
  console.log('error', error);

  // If error qualifies for a retry, wait for next run and adjust maxEntriesPerRun
  const currRetries = prevContinuation?.retryCount ?? 0;
  if (currRetries < GRAPHQL_RETRIES__MAX && error instanceof ShopifyRetryableErrors) {
    const continuation: SyncTableStorefrontContinuation | SyncTableGraphQlContinuation = {
      ...prevContinuation,
      retryCount: currRetries + 1,
      extraContinuationData,
    };

    // ---- ShopifyThrottledError
    //      give time to regen enough points
    if (error instanceof ShopifyThrottledError) {
      const { actualQueryCost, requestedQueryCost } = error.cost;
      const { restoreRate, maximumAvailable, currentlyAvailable } = error.cost.throttleStatus;

      let waitMs = 0;
      const restoreAllPointsIfThrottled = true;
      if (restoreAllPointsIfThrottled) {
        // restore all points
        waitMs = ((maximumAvailable - currentlyAvailable) / restoreRate) * 1000;
        console.log(`⏳ TROTTLED : restore all points by waiting ${waitMs / 1000}s`);
      } else {
        // repay query cost
        waitMs = (requestedQueryCost / restoreRate) * 1000;
        console.log(`⏳ TROTTLED : Repay query cost (${requestedQueryCost}) by waiting ${waitMs / 1000}s`);
      }

      await wait(waitMs);

      continuation.lastCost = { requestedQueryCost, actualQueryCost };
      continuation.lastThrottleStatus = error.cost.throttleStatus;
      continuation.lastSyncTime = Date.now();
      continuation.lastMaxEntriesPerRun = currentMaxEntriesPerRun;
    }

    // ---- ShopifyMaxExceededError
    // Adjust maxEntriesPerRun for next run
    else if (error instanceof ShopifyMaxExceededError) {
      const maxCostError = error.originalError;
      const { maxCost, cost } = maxCostError.extensions;
      const diminishingFactor = 0.75;
      continuation.reducedMaxEntriesPerRun = Math.min(
        ABSOLUTE_MAX_ENTRIES_PER_RUN,
        Math.max(1, Math.floor((maxCost / cost) * currentMaxEntriesPerRun * diminishingFactor))
      );
      console.log(
        `⛔️ MAX_COST_EXCEEDED : Adjuste next query to run with ${continuation.reducedMaxEntriesPerRun} max entries`
      );
    }

    return continuation;
  } else if (error instanceof coda.UserVisibleError) {
    throw error;
  } else {
    throw error;
  }
}

export function formatGraphQlErrors(errors: ShopifyGraphQlError[]) {
  return errors.map((error) => error.message).join('\n\n');
}

export function handleGraphQlUserError(userErrors: ShopifyGraphQlUserError[]) {
  // Abort if no errors
  if (!userErrors || !userErrors.length) return;

  const errorMsg = userErrors.map((error) => `• ${error.code}\n${error.message}`).join('\n\n');
  throw new coda.UserVisibleError(errorMsg);
}

export function handleGraphQlError(errors: ShopifyGraphQlError[]) {
  // Abort if no errors or throttled errors
  if (!errors || !errors.length || isThrottled(errors)) return;

  const errorMsg = errors.map((error) => `• ${error.message}`).join('\n\n');
  console.log('errorMsg', errorMsg);
  throw new coda.UserVisibleError(errorMsg);
}

/**====================================================================================================================
 *    GraphQL Request functions
 *===================================================================================================================== */
export async function makeGraphQlRequest(
  params: {
    payload: any;
    cacheTtlSecs?: number;
    apiVersion?: string;
    storeFront?: boolean;
  },
  context: coda.ExecutionContext
) {
  const apiVersion = params.apiVersion ?? GRAPHQL_DEFAULT_API_VERSION;
  const options: coda.FetchRequest = {
    method: 'POST',
    url: `${context.endpoint}${params.storeFront ? '' : '/admin'}/api/${apiVersion}/graphql.json`,
    headers: params.storeFront ? getShopifyStorefrontRequestHeaders(context) : getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };
  if (params.cacheTtlSecs !== undefined) {
    options.cacheTtlSecs = params.cacheTtlSecs;
    options.forceCache = true;
  }

  if (IS_ADMIN_RELEASE) {
    console.log(
      `ℹ️ GraphQlRequest info:
      apiVersion: ${apiVersion}
      | storeFront: ${params.storeFront}
      | payload: ${JSON.stringify(params.payload, null, 2)}`
    );
  }

  try {
    const response = await context.fetcher.fetch(options);
    const { body } = response;
    const { errors, extensions } = body;

    if (errors) {
      if (isThrottled(errors)) {
        const throttledError = errors.find((error) => error.extensions?.code === 'THROTTLED');
        throw new ShopifyThrottledError(
          `Throttled : requestedQueryCost is ${extensions.cost.requestedQueryCost} while currentlyAvailable ${extensions.cost.throttleStatus.currentlyAvailable}`,
          throttledError,
          extensions.cost
        );
      } else if (isMaxCostExceeded(errors)) {
        const maxCostError = errors.find((error) => error.extensions?.code === 'MAX_COST_EXCEEDED');
        throw new ShopifyMaxExceededError(
          `Max cost exceeded : maxCost is ${maxCostError.extensions.maxCost} while cost is ${maxCostError.extensions.cost}`,
          maxCostError
        );
      } else {
        throw new coda.UserVisibleError(formatGraphQlErrors(errors));
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
}

export async function makeSyncTableGraphQlRequest(
  params: {
    payload: any;
    cacheTtlSecs?: number;
    apiVersion?: string;
    maxEntriesPerRun: number;
    prevContinuation: SyncTableStorefrontContinuation | SyncTableGraphQlContinuation;
    extraContinuationData?: any;
    mainDataKey: string;
    storeFront?: boolean;
  },
  context: coda.SyncExecutionContext
) {
  if (IS_ADMIN_RELEASE) {
    console.log(
      `ℹ️ SyncTableGraphQlRequest info :
      maxEntriesPerRun : ${params.maxEntriesPerRun}
      | extraContinuationData : ${JSON.stringify(params.extraContinuationData, null, 2)}`
    );
  }

  let response;
  try {
    response = await makeGraphQlRequest(
      {
        payload: params.payload,
        cacheTtlSecs: params.cacheTtlSecs,
        apiVersion: params.apiVersion,
        storeFront: params.storeFront,
      },
      context
    );

    const continuation = await handleSyncTableGraphQlContinuation(
      {
        extensions: response.body.extensions,
        extraContinuationData: params.extraContinuationData,
        pageInfo: response.body.data?.[params.mainDataKey]?.pageInfo,
      },
      params.maxEntriesPerRun,
      params.storeFront
    );

    return {
      response,
      continuation,
    };
  } catch (error) {
    const continuation = await handleSyncTableGraphQlErrorContinuation(
      error,
      params.prevContinuation,
      params.maxEntriesPerRun,
      params.extraContinuationData
    );
    return {
      response,
      continuation,
    };
  }
}
