// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GraphQlClient } from '../../Clients/GraphQlClient';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../../Clients/GraphQlErrors';
import { wait } from '../../Clients/utils/client-utils';
import { GRAPHQL_BUDGET__MAX } from '../../config';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import { throttleStatusQuery } from '../../graphql/shop-graphql';
import { Stringified } from '../../types/utilities';
import { logAdmin } from '../../utils/helpers';
import { SyncTableGraphQlContinuation, SyncTableMixedContinuation } from '../types/SyncTable.types';

// #endregion

// #region Continuation
/**
 * Serializes a value to a JSON string with a special type to ensure that the
 * resulting string can be used to recreate the original value.
 *
 * @param value The value to serialize.
 * @param replacer An optional function used to transform values before they
 * are serialized.
 * @param space An optional string or number used to add indentation,
 * white space, and line breaks to the resulting JSON.
 * @returns A string that contains the JSON representation of the given value
 * with a special type to ensure it can be used to recreate the original value.
 */

export function stringifyContinuationProperty<T>(
  value: T,
  replacer?: (key: string, value: any) => any,
  space?: string | number
): string & Stringified<T> {
  return JSON.stringify(value, replacer, space) as string & Stringified<T>;
}
/**
 * Parses a JSON string with a special type created by
 * `stringifyContinuationProperty` to recreate the original value.
 *
 * @param text The string to parse.
 * @param reviver An optional function used to transform values after they
 * are parsed.
 * @returns The original value recreated from the parsed string.
 */
export function parseContinuationProperty<T>(text: Stringified<T>, reviver?: (key: any, value: any) => any): T {
  return JSON.parse(text);
}
// #endregion

// #region GraphQl auto throttling
async function checkThrottleStatus(context: coda.ExecutionContext): Promise<ShopifyGraphQlThrottleStatus> {
  const response = await new GraphQlClient({ context }).request<typeof throttleStatusQuery>({
    documentNode: throttleStatusQuery,
    variables: {},
    options: { cacheTtlSecs: CACHE_DISABLED },
  });
  const { extensions } = response.body;
  return extensions.cost.throttleStatus;
}

// TODO: don't pass the whole prevContinuation object ?
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
  console.log('maximumAvailable', maximumAvailable);
  console.log('currentlyAvailable', currentlyAvailable);

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
