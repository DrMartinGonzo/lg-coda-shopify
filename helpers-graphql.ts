import * as coda from '@codahq/packs-sdk';
import { getShopifyRequestHeaders, wait } from './helpers';
import { GRAPHQL_BUDGET__MAX, GRAPHQL_RETRIES__MAX } from './constants';
import {
  ShopifyGraphQlError,
  ShopifyGraphQlUserError,
  ShopifyMaxExceededError,
  ShopifyRetryableErrors,
  ShopifyThrottledError,
} from './shopifyErrors';
import { ShopifyGraphQlRequestCost } from './types/Shopify';
import { SyncTableGraphQlContinuation } from './types/tableSync';

export function calcSyncTableMaxEntriesPerRun(prevContinuation: SyncTableGraphQlContinuation) {
  // TODO: still not ready, calculate this max ?
  const absoluteMax = 100;
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
  return Math.min(absoluteMax, maxEntries);
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

export async function handleSyncTableGraphQlResults(
  { nodes, extensions, pageInfo, extraContinuationData },
  currentMaxEntriesPerRun: number,
  formatFunction: CallableFunction
) {
  let result = [];
  let continuation: SyncTableGraphQlContinuation = null;
  const endTime = Date.now();
  const {
    requestedQueryCost,
    throttleStatus: { restoreRate },
  } = extensions.cost;

  // repay the cost of the query
  const waitMs = (requestedQueryCost / restoreRate) * 1000;
  if (waitMs > 0) {
    console.log(`Repay query cost by waiting ${waitMs / 1000}s`);
    await wait(waitMs);
  }

  if (nodes) {
    result = nodes.map(formatFunction);

    if (pageInfo && pageInfo.hasNextPage) {
      continuation = {
        cursor: pageInfo.endCursor,
        lastCost: {
          requestedQueryCost: extensions.cost.requestedQueryCost,
          actualQueryCost: extensions.cost.actualQueryCost,
        },
        lastMaxEntriesPerRun: currentMaxEntriesPerRun,
        lastSyncTime: endTime,
        lastThrottleStatus: extensions.cost.throttleStatus,
        retryCount: 0,
        extraContinuationData,
      };
    }
  }

  return {
    result,
    continuation,
  };
}

export async function handleSyncTableGraphQlError(
  error: Error,
  prevContinuation: SyncTableGraphQlContinuation,
  currentMaxEntriesPerRun: number,
  extraContinuationData: any
) {
  console.log('error', error);

  // If error qualifies for a retry, wait for next run and adjust maxEntriesPerRun
  const currRetries = prevContinuation?.retryCount ?? 0;
  if (currRetries < GRAPHQL_RETRIES__MAX && error instanceof ShopifyRetryableErrors) {
    const continuation: SyncTableGraphQlContinuation = {
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
      const restoreAllPoints = true;
      if (restoreAllPoints) {
        // restore all points
        waitMs = ((maximumAvailable - currentlyAvailable) / restoreRate) * 1000;
        console.log(`TROTTLED : restore all points ${waitMs / 1000}s`);
      } else {
        // repay query cost
        waitMs = (requestedQueryCost / restoreRate) * 1000;
        console.log(`TROTTLED : Repay query cost by waiting ${waitMs / 1000}s`);
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
      // TODO: respect absoluteMax
      continuation.reducedMaxEntriesPerRun = Math.max(
        1,
        Math.floor((maxCost / cost) * currentMaxEntriesPerRun * diminishingFactor)
      );
    }

    return {
      result: [],
      continuation,
    };
  } else {
    throw new coda.UserVisibleError(error.message);
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
export async function graphQlRequest(
  context: coda.ExecutionContext,
  payload: any,
  cacheTtlSecs?: number,
  apiVersion: string = '2023-04'
) {
  const options: coda.FetchRequest = {
    method: 'POST',
    url: `${context.endpoint}/admin/api/${apiVersion}/graphql.json`,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(payload),
  };
  if (cacheTtlSecs !== undefined) {
    options.cacheTtlSecs = cacheTtlSecs;
  }

  return context.fetcher.fetch(options);
}

export async function syncTableGraphQlRequest(
  context: coda.ExecutionContext,
  params: {
    payload: any;
    cacheTtlSecs?: number;
    apiVersion?: string;
    formatFunction: CallableFunction;
    maxEntriesPerRun: number;
    prevContinuation: SyncTableGraphQlContinuation;
    extraContinuationData?: any;
    mainDataKey: string;
  }
) {
  console.log('prevContinuation', params.prevContinuation);
  console.log('maxEntriesPerRun', params.maxEntriesPerRun);

  const options: coda.FetchRequest = {
    method: 'POST',
    url: `${context.endpoint}/admin/api/${params.apiVersion ?? '2023-04'}/graphql.json`,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };
  if (params.cacheTtlSecs !== undefined) {
    options.cacheTtlSecs = params.cacheTtlSecs;
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

    return await handleSyncTableGraphQlResults(
      {
        nodes: response.body.data?.[params.mainDataKey]?.nodes,
        pageInfo: response.body.data?.[params.mainDataKey]?.pageInfo,
        extensions: response.body.extensions,
        extraContinuationData: params.extraContinuationData,
      },
      params.maxEntriesPerRun,
      params.formatFunction
    );
  } catch (error) {
    return await handleSyncTableGraphQlError(
      error,
      params.prevContinuation,
      params.maxEntriesPerRun,
      params.extraContinuationData
    );
  }
}
