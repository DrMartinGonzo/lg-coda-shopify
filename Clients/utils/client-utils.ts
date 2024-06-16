// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Errors/GraphQlErrors';
import { GRAPHQL_BUDGET__MAX } from '../../config';
import { CACHE_DEFAULT, CACHE_MAX } from '../../constants/cacheDurations-constants';
import { logAdmin } from '../../utils/helpers';
import { FetchRequestOptions } from '../Client.types';
import { GRAPHQL_NODES_LIMIT } from '../GraphQlClients';

// #endregion

export function isCodaCached(response: coda.FetchResponse<any>): boolean {
  return (!!response.headers['Coda-Fetcher-Cache-Hit'] && response.headers['Coda-Fetcher-Cache-Hit'] === '1') ?? false;
}

const getShopifyAccessToken = (context: coda.ExecutionContext) => '{{token-' + context.invocationToken + '}}';
export const getShopifyRequestHeaders = (context: coda.ExecutionContext) => {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': getShopifyAccessToken(context),
  };
};

const getShopifyStorefrontRequestHeaders = (context: coda.ExecutionContext) => {
  return {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': getShopifyAccessToken(context),
  };
};

/**
 * Delays the execution of subsequent code for a specified number of milliseconds.
 * Pack need to be executed/uploaded with --timerStrategy=fake flag for enable setTimeout shim
 *
 * @param {number} ms - The duration in milliseconds to wait
 */
export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Rate limit wait'), ms);
  });
}

type WithCacheArgs<T> = T & { options: FetchRequestOptions };
export function withCacheDefault<T>({ options, ...args }: WithCacheArgs<T>) {
  return {
    options: {
      ...options,
      cacheTtlSecs: options?.cacheTtlSecs ?? CACHE_DEFAULT,
    },
    ...args,
  } as T;
}
export function withCacheMax<T>({ options, ...args }: WithCacheArgs<T>) {
  return {
    options: {
      ...options,
      cacheTtlSecs: options?.cacheTtlSecs ?? CACHE_MAX,
    },
    ...args,
  } as T;
}

export function calcGraphQlMaxLimit({
  lastCost,
  lastLimit,
  throttleStatus,
}: {
  lastCost: ShopifyGraphQlRequestCost | undefined;
  lastLimit: number | undefined;
  throttleStatus: ShopifyGraphQlThrottleStatus;
}) {
  if (!lastLimit || !lastCost) {
    console.error(`calcSyncTableMaxLimit: No lastLimit or lastCost in prevContinuation`);
  }
  const costOneEntry = lastCost.requestedQueryCost / lastLimit;
  const maxCost = Math.min(GRAPHQL_BUDGET__MAX, throttleStatus.currentlyAvailable);
  const maxLimit = Math.floor(maxCost / costOneEntry);
  return Math.min(GRAPHQL_NODES_LIMIT, maxLimit);
}

function minGraphQlPointsNeeded(throttleStatus: ShopifyGraphQlThrottleStatus) {
  return throttleStatus.maximumAvailable - 1;
}
export function calcGraphQlWaitTime(throttleStatus: ShopifyGraphQlThrottleStatus) {
  const { currentlyAvailable, maximumAvailable } = throttleStatus;
  const minPointsNeeded = minGraphQlPointsNeeded(throttleStatus);
  const deferByMs = currentlyAvailable < minPointsNeeded ? 3000 : 0;
  if (deferByMs > 0) {
    logAdmin(`🚫 Not enough points (${currentlyAvailable}/${minPointsNeeded}). Skip and wait ${deferByMs / 1000}s`);
  }

  return deferByMs;
}
