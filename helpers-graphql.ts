import * as coda from '@codahq/packs-sdk';

import { getShopifyRequestHeaders, getShopifyStorefrontRequestHeaders, isCodaCached, logAdmin, wait } from './helpers';
import { GRAPHQL_BUDGET__MAX, GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from './constants';
import { ShopifyGraphQlError, ShopifyGraphQlUserError, ShopifyMaxExceededError } from './shopifyErrors';
import { ShopifyGraphQlThrottleStatus } from './types/ShopifyGraphQlErrors';
import {
  SyncTableGraphQlContinuation,
  SyncTableMixedContinuation,
  SyncTableRestAugmentedContinuation,
} from './types/tableSync';

// TODO: still not ready, calculate this max ?
const ABSOLUTE_MAX_ENTRIES_PER_RUN = 250;

const queryCheckThrottleStatus = /* GraphQL */ `
  query CheckThrottleStatus {
    shop {
      id
    }
  }
`;

// #region GID functions
export function idToGraphQlGid(resourceType: string, id: number) {
  if (id === undefined) return undefined;
  return `gid://shopify/${resourceType}/${id}`;
}
export function graphQlGidToId(gid: string) {
  if (gid === undefined) return undefined;
  return parseInt(gid.split('/').pop().split('?')[0]);
}
export function graphQlGidToResourceName(gid: string): string {
  if (gid === undefined) return undefined;
  return gid.split('gid://shopify/')[1].split('/').pop();
}
// #endregion

// #region GraphQL Errors
/**
 * Check if there are any 'THROTTLED' errors.
 *
 * @param errors - The array of errors to check for a 'THROTTLED' code.
 */
function isThrottled(errors: ShopifyGraphQlError[]) {
  return errors && errors.length && errors.some((error) => error.extensions?.code === 'THROTTLED');
}
/**
 * Check if there are any 'MAX_COST_EXCEEDED' errors.
 *
 * @param errors - The array of errors to check for a 'MAX_COST_EXCEEDED' code.
 */
function isMaxCostExceeded(errors: ShopifyGraphQlError[]) {
  return errors && errors.length && errors.some((error) => error.extensions?.code === 'MAX_COST_EXCEEDED');
}

function getGraphQlErrorByCode(errors: ShopifyGraphQlError[], code: string) {
  return errors.find((error) => error.extensions?.code === code);
}

function formatGraphQlErrors(errors: ShopifyGraphQlError[]) {
  return errors.map((error) => `• ${error.message}`).join('\n\n');
}
function formatGraphQlUserErrors(userErrors: ShopifyGraphQlUserError[]) {
  return userErrors
    .map((error) => {
      return `• ${error.code ? error.code + ': ' : ''}${error.message}`;
    })
    .join('\n\n');
}
// #endregion

// #region GraphQl auto throttling
export async function checkThrottleStatus(context: coda.ExecutionContext): Promise<ShopifyGraphQlThrottleStatus> {
  const { response } = await makeGraphQlRequest({ payload: { query: queryCheckThrottleStatus } }, context);
  const { extensions } = response.body;
  return extensions.cost.throttleStatus;
}

function calcSyncTableMaxEntriesPerRun(
  prevContinuation: SyncTableGraphQlContinuation,
  lastThrottleStatus: ShopifyGraphQlThrottleStatus
) {
  const { lastCost, lastMaxEntriesPerRun } = prevContinuation;
  const { currentlyAvailable: lastAvailablePoints, maximumAvailable } = lastThrottleStatus;
  const { requestedQueryCost: lastRequestedQueryCost } = lastCost;

  const costOneEntry = lastRequestedQueryCost / lastMaxEntriesPerRun;
  const maxCost = Math.min(GRAPHQL_BUDGET__MAX, lastAvailablePoints);
  const maxEntries = Math.floor(maxCost / costOneEntry);
  return Math.min(ABSOLUTE_MAX_ENTRIES_PER_RUN, maxEntries);
}

/**
 * Repay graphQL query cost to avoid throttled status.
 *
 * It calculates the waiting time based on the actualQueryCost and the restore
 * rate, then applies the delay.
 *
 * @param cost - The cost property of the query being requested.
 * @param throttled - If the query was throttled, we repay all points to reach maximumAvailable as a safety measure
 */
async function repayGraphQlCost(cost: any, throttled?: boolean) {
  const { actualQueryCost, requestedQueryCost } = cost;
  const { restoreRate, maximumAvailable, currentlyAvailable } = cost.throttleStatus;

  let waitMs = 0;
  let msg = '';
  if (throttled) {
    // restore all points
    waitMs = ((maximumAvailable - currentlyAvailable) / restoreRate) * 1000;
    msg = `⏳ TROTTLED : restore all points by waiting ${waitMs / 1000}s`;
  } else {
    waitMs = (actualQueryCost / restoreRate) * 1000;
    msg = `⏳ Repay cost (${actualQueryCost}) by waiting ${waitMs / 1000}s`;
  }

  if (waitMs > 0) {
    console.log(msg);
    return wait(waitMs);
  }
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
    if (prevContinuation?.reducedMaxEntriesPerRun) {
      maxEntriesPerRun = prevContinuation.reducedMaxEntriesPerRun;
    } else if (prevContinuation?.lastCost) {
      maxEntriesPerRun = calcSyncTableMaxEntriesPerRun(prevContinuation, throttleStatus);
    } else {
      maxEntriesPerRun = defaultMaxEntriesPerRun;
    }
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
  };
}

export async function skipGraphQlSyncTableRun(prevContinuation: SyncTableGraphQlContinuation, waitms: number) {
  await wait(waitms);
  return {
    result: [],
    continuation: { ...prevContinuation, graphQlLock: 'false' },
  };
}
// #endregion

// #region GraphQL Request functions
export async function makeGraphQlRequest(
  params: {
    payload: any;
    cacheTtlSecs?: number;
    apiVersion?: string;
    storeFront?: boolean;
    retries?: number;
    getUserErrors?: CallableFunction;
  },
  context: coda.ExecutionContext | coda.SyncExecutionContext
) {
  let currRetries = params.retries ?? 0;
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

  try {
    const response = await context.fetcher.fetch(options);
    const { body } = response;
    const { errors, extensions } = body;
    const isCachedResponse = isCodaCached(response);

    if (errors) {
      const isThrottledError = isThrottled(errors);
      const isMaxCostExceededError = isMaxCostExceeded(errors);
      if (isThrottledError || isMaxCostExceededError) {
        currRetries++;
        if (currRetries > GRAPHQL_RETRIES__MAX) {
          throw new coda.UserVisibleError(`Max retries (${GRAPHQL_RETRIES__MAX}) of GraphQL requests exceeded.`);
        } else {
          if (isThrottledError) {
            if (!isCachedResponse) await repayGraphQlCost(extensions.cost, true);
            /* We are in a Sync Table request. Schedule a retry */
            if (context.sync.schema) return { response, retries: currRetries };

            /* We are doing a normal request. Retry immediately */
            logAdmin(`🔄 Retrying (count: ${currRetries})...`);
            return makeGraphQlRequest({ ...params, retries: currRetries }, context);
          }

          /* Max cost exceeded errors will be handled by makeSyncTableGraphQlRequest */
          if (isMaxCostExceededError) {
            const maxCostError = getGraphQlErrorByCode(errors, 'MAX_COST_EXCEEDED');
            throw new ShopifyMaxExceededError(
              `⛔️ MAX_COST_EXCEEDED: maxCost is ${maxCostError.extensions.maxCost} while cost is ${maxCostError.extensions.cost}.`,
              maxCostError
            );
          }
        }
      } else {
        throw new coda.UserVisibleError(formatGraphQlErrors(errors));
      }
    } else {
      const userErrors: ShopifyGraphQlUserError[] = params.getUserErrors ? params.getUserErrors(body) : undefined;
      if (userErrors && userErrors.length) {
        throw new coda.UserVisibleError(formatGraphQlUserErrors(userErrors));
      }
    }

    // Always repay cost if not storeFront
    if (!isCachedResponse && !params.storeFront && extensions?.cost) {
      await repayGraphQlCost(extensions.cost);
    }

    return {
      response,
      retries: 0, // reset retries counter because we just got a full response
    };
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
    prevContinuation: SyncTableGraphQlContinuation;
    extraContinuationData?: any;
    getPageInfo?: CallableFunction;
    storeFront?: boolean;
  },
  context: coda.SyncExecutionContext
) {
  if (params.prevContinuation?.retries) {
    logAdmin(`🔄 Retrying (count: ${params.prevContinuation.retries}) sync of ${params.maxEntriesPerRun} entries…`);
  }
  logAdmin(`🚀  GraphQL Admin API: Starting sync of ${params.maxEntriesPerRun} entries…`);

  try {
    const { response, retries } = await makeGraphQlRequest(
      {
        payload: params.payload,
        cacheTtlSecs: params.cacheTtlSecs,
        apiVersion: params.apiVersion,
        storeFront: params.storeFront,
        retries: params.prevContinuation?.retries ?? 0,
      },
      context
    );

    let continuation: SyncTableGraphQlContinuation = null;
    const pageInfo = response.body?.data && params.getPageInfo ? params.getPageInfo(response.body.data) : undefined;
    const hasNextRun = retries > 0 || (pageInfo && pageInfo.hasNextPage);

    if (hasNextRun) {
      continuation = {
        ...continuation,
        graphQlLock: 'true',
        retries,
        extraContinuationData: params.extraContinuationData,
      };

      if (pageInfo && pageInfo.hasNextPage) {
        continuation = {
          ...continuation,
          cursor: pageInfo.endCursor,
        };
      }
      if (response.body.extensions?.cost) {
        continuation = {
          ...continuation,
          lastCost: {
            requestedQueryCost: response.body.extensions.cost.requestedQueryCost,
            actualQueryCost: response.body.extensions.cost.actualQueryCost,
          },
          lastMaxEntriesPerRun: params.maxEntriesPerRun,
          lastThrottleStatus: {
            ...response.body.extensions.cost.throttleStatus,
            // update currentlyAvailable to account for the fact that we repayed the cost by waiting
            // currentlyAvailable: Math.min(
            //   response.body.extensions.cost.throttleStatus.maximumAvailable,
            //   response.body.extensions.cost.throttleStatus.currentlyAvailable +
            //     response.body.extensions.cost.actualQueryCost
            // ),
          },
        };
      }
    }

    return {
      response,
      continuation,
    };
  } catch (error) {
    if (error instanceof ShopifyMaxExceededError) {
      const maxCostError = error.originalError;
      const { maxCost, cost } = maxCostError.extensions;
      const diminishingFactor = 0.75;
      const reducedMaxEntriesPerRun = Math.min(
        ABSOLUTE_MAX_ENTRIES_PER_RUN,
        Math.max(1, Math.floor((maxCost / cost) * params.maxEntriesPerRun * diminishingFactor))
      );

      const errorContinuation = {
        ...params.prevContinuation,
        graphQlLock: 'true',
        retries: (params.prevContinuation?.retries ?? 0) + 1,
        extraContinuationData: params.extraContinuationData,
        reducedMaxEntriesPerRun: reducedMaxEntriesPerRun,
      };

      console.log(
        `🎚️ ${error.message} Adjusting next query to run with ${errorContinuation.reducedMaxEntriesPerRun} max entries.`
      );

      console.log('errorContinuation', errorContinuation);
      return {
        response: undefined,
        continuation: errorContinuation,
      };
    } else {
      throw error;
    }
  }
}

/**
 * A special function used when we try to augment a Rest request with GraphQL results
 * Il n'y a jamais de continuation, puisque l'on query uniquement spécifiquement par id
 * Du coup, il faut renvoyer la continuation qui provient elle de la requête Rest initiale agrémentée de diverses choses
 * @param params
 * @param context
 * @returns
 */
export async function makeAugmentedSyncTableGraphQlRequest(
  params: {
    payload: any;
    cacheTtlSecs?: number;
    apiVersion?: string;
    maxEntriesPerRun: number;
    prevContinuation: SyncTableRestAugmentedContinuation;
    nextRestUrl?: string;
    extraContinuationData?: any;
    storeFront?: boolean;
  },
  context: coda.SyncExecutionContext
): Promise<{
  response: coda.FetchResponse<any>;
  continuation: SyncTableRestAugmentedContinuation | null;
}> {
  if (params.prevContinuation?.retries) {
    logAdmin(`🔄 Retrying (count: ${params.prevContinuation.retries}) sync of ${params.maxEntriesPerRun} entries…`);
  }
  logAdmin(`🚀  GraphQL Admin API: Starting sync of ${params.maxEntriesPerRun} entries…`);

  try {
    const { response, retries } = await makeGraphQlRequest(
      {
        payload: params.payload,
        cacheTtlSecs: params.cacheTtlSecs,
        apiVersion: params.apiVersion,
        storeFront: params.storeFront,
        retries: params.prevContinuation?.retries ?? 0,
      },
      context
    );

    let continuation: SyncTableRestAugmentedContinuation = null;
    const hasNextRun = retries > 0 || params.nextRestUrl;

    if (hasNextRun) {
      continuation = {
        ...continuation,
        graphQlLock: 'true',
        retries,
        extraContinuationData: params.extraContinuationData,
        nextUrl: params.prevContinuation?.nextUrl,
      };

      if (params.nextRestUrl) {
        continuation = {
          ...continuation,
          nextUrl: params.nextRestUrl,
        };
      }
      if (response.body.extensions?.cost) {
        continuation = {
          ...continuation,
          lastCost: {
            requestedQueryCost: response.body.extensions.cost.requestedQueryCost,
            actualQueryCost: response.body.extensions.cost.actualQueryCost,
          },
          lastMaxEntriesPerRun: params.maxEntriesPerRun,
          lastThrottleStatus: response.body.extensions.cost.throttleStatus,
        };
      }
    }

    return {
      response,
      continuation,
    };
  } catch (error) {
    if (error instanceof ShopifyMaxExceededError) {
      const maxCostError = error.originalError;
      const { maxCost, cost } = maxCostError.extensions;
      const diminishingFactor = 0.75;
      const reducedMaxEntriesPerRun = Math.min(
        ABSOLUTE_MAX_ENTRIES_PER_RUN,
        Math.max(1, Math.floor((maxCost / cost) * params.maxEntriesPerRun * diminishingFactor))
      );

      const errorContinuation = {
        ...params.prevContinuation,
        graphQlLock: 'true',
        retries: (params.prevContinuation?.retries ?? 0) + 1,
        extraContinuationData: params.extraContinuationData,
        reducedMaxEntriesPerRun: reducedMaxEntriesPerRun,
      };

      console.log(
        `🎚️ ${error.message} Adjusting next query to run with ${errorContinuation.reducedMaxEntriesPerRun} max entries.`
      );

      console.log('errorContinuation', errorContinuation);
      return {
        response: undefined,
        continuation: errorContinuation,
      };
    } else {
      throw error;
    }
  }
}

export function getMixedSyncTableRemainingAndToProcessItems(
  prevContinuation: SyncTableMixedContinuation,
  restItems: any[],
  maxEntriesPerRun: number
) {
  let toProcess = [];
  let remaining = [];

  if (prevContinuation?.cursor || prevContinuation?.retries) {
    logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
    toProcess = prevContinuation?.extraContinuationData?.currentBatch?.processing;
    remaining = prevContinuation?.extraContinuationData?.currentBatch?.remaining;
  } else {
    const stillProcessingRestItems = prevContinuation?.extraContinuationData?.currentBatch?.remaining.length > 0;
    let items = [];
    if (stillProcessingRestItems) {
      items = [...prevContinuation.extraContinuationData.currentBatch.remaining];
      logAdmin(`🔁 Fetching next batch of ${items.length} Variants`);
    } else {
      items = [...restItems];
      logAdmin(`🟢 Found ${items.length} Variants to augment with metafields`);
    }

    toProcess = items.splice(0, maxEntriesPerRun);
    remaining = items;
  }
  return { toProcess, remaining };
}

export async function makeMixedSyncTableGraphQlRequest(
  params: {
    payload: any;
    cacheTtlSecs?: number;
    apiVersion?: string;
    maxEntriesPerRun: number;
    prevContinuation: SyncTableMixedContinuation;
    nextRestUrl?: string;
    getPageInfo?: CallableFunction;
    extraContinuationData?: any;
  },
  context: coda.SyncExecutionContext
): Promise<{
  response: coda.FetchResponse<any>;
  continuation: SyncTableMixedContinuation | null;
}> {
  if (params.prevContinuation?.retries) {
    logAdmin(`🔄 Retrying (count: ${params.prevContinuation.retries}) sync of ${params.maxEntriesPerRun} entries…`);
  }
  logAdmin(`🚀  GraphQL Admin API: Starting sync of ${params.maxEntriesPerRun} entries…`);

  try {
    const { response, retries } = await makeGraphQlRequest(
      {
        payload: params.payload,
        cacheTtlSecs: params.cacheTtlSecs,
        apiVersion: params.apiVersion,
        retries: params.prevContinuation?.retries ?? 0,
      },
      context
    );

    let continuation: SyncTableMixedContinuation = null;
    const pageInfo = response.body?.data && params.getPageInfo ? params.getPageInfo(response.body.data) : undefined;
    const hasNextPage = pageInfo && pageInfo.hasNextPage;
    const hasRemainingItems = params.extraContinuationData?.currentBatch?.remaining.length > 0;

    const triggerNextRestSync =
      !retries &&
      !hasNextPage &&
      !hasRemainingItems &&
      (params.nextRestUrl !== undefined || params.prevContinuation?.scheduledNextRestUrl !== undefined);

    const hasNextRun = retries > 0 || hasNextPage || hasRemainingItems || triggerNextRestSync;
    console.log('hasNextRun', hasNextRun);

    if (hasNextRun) {
      continuation = {
        ...continuation,
        graphQlLock: 'true',
        retries,
        extraContinuationData: {
          ...params.extraContinuationData,
          skipNextRestSync: true,
        },
        scheduledNextRestUrl: params.prevContinuation?.scheduledNextRestUrl ?? params.nextRestUrl,
      };
      // console.log('continuation.scheduledNextRestUrl', continuation.scheduledNextRestUrl);
      if (triggerNextRestSync) {
        continuation = {
          ...continuation,
          extraContinuationData: {
            ...params.extraContinuationData,
            skipNextRestSync: false,
          },
          nextUrl: params.nextRestUrl ?? params.prevContinuation?.scheduledNextRestUrl,
          scheduledNextRestUrl: undefined,
        };
      }

      if (hasNextPage) {
        // @ts-ignore
        continuation = {
          ...continuation,
          cursor: pageInfo.endCursor,
        };
      }

      if (response.body.extensions?.cost) {
        // @ts-ignore
        continuation = {
          ...continuation,
          lastCost: {
            requestedQueryCost: response.body.extensions.cost.requestedQueryCost,
            actualQueryCost: response.body.extensions.cost.actualQueryCost,
          },
          lastMaxEntriesPerRun: params.maxEntriesPerRun,
          lastThrottleStatus: response.body.extensions.cost.throttleStatus,
        };
      }
    }

    return {
      response,
      continuation,
    };
  } catch (error) {
    if (error instanceof ShopifyMaxExceededError) {
      const maxCostError = error.originalError;
      const { maxCost, cost } = maxCostError.extensions;
      const diminishingFactor = 0.75;
      const reducedMaxEntriesPerRun = Math.min(
        ABSOLUTE_MAX_ENTRIES_PER_RUN,
        Math.max(1, Math.floor((maxCost / cost) * params.maxEntriesPerRun * diminishingFactor))
      );

      const errorContinuation: SyncTableMixedContinuation = {
        ...params.prevContinuation,
        graphQlLock: 'true',
        retries: (params.prevContinuation?.retries ?? 0) + 1,
        extraContinuationData: {
          ...params.extraContinuationData,
          skipNextRestSync: true,
        },
        scheduledNextRestUrl: params.prevContinuation?.scheduledNextRestUrl ?? params.nextRestUrl,
        reducedMaxEntriesPerRun: reducedMaxEntriesPerRun,
      };

      console.log(
        `🎚️ ${error.message} Adjusting next query to run with ${errorContinuation.reducedMaxEntriesPerRun} max entries.`
      );

      return {
        response: undefined,
        continuation: errorContinuation,
      };
    } else {
      throw error;
    }
  }
}
// #endregion

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
