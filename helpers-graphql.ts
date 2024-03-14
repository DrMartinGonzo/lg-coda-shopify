import * as coda from '@codahq/packs-sdk';

import {
  arrayUnique,
  getShopifyRequestHeaders,
  getShopifyStorefrontRequestHeaders,
  isCodaCached,
  logAdmin,
  wait,
} from './helpers';
import { GRAPHQL_BUDGET__MAX, GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from './constants';
import { ShopifyMaxExceededError } from './ShopifyErrors';
import { GraphQlResourceName } from './types/RequestsGraphQl';
import { MetafieldOwnerType } from './types/admin.types';

import type {
  SyncTableGraphQlContinuation,
  SyncTableMixedContinuation,
  SyncTableRestAugmentedContinuation,
} from './types/SyncTable';
import type { FetchRequestOptions } from './types/Requests';
import type {
  ShopifyGraphQlError,
  ShopifyGraphQlUserError,
  ShopifyGraphQlThrottleStatus,
  ShopifyGraphQlRequestCost,
} from './types/ShopifyGraphQl';

const ABSOLUTE_MAX_ENTRIES_PER_RUN = 250;

const queryCheckThrottleStatus = /* GraphQL */ `
  query CheckThrottleStatus {
    shop {
      id
    }
  }
`;

/*
function getGraphQlResourceFromRestResourceSingularType(restResourceSingular: string): GraphQlResource {
  switch (restResourceSingular) {
    case restResources.Article.singular:
      return GraphQlResource.Article;
    case restResources.Blog.singular:
      return GraphQlResource.Blog;
    case restResources.Collection.singular:
      return GraphQlResource.Collection;
    case restResources.Customer.singular:
      return GraphQlResource.Customer;
    case restResources.DraftOrder.singular:
      return GraphQlResource.DraftOrder;
    case restResources.Location.singular:
      return GraphQlResource.Location;
    case restResources.Order.singular:
      return GraphQlResource.Order;
    case restResources.Page.singular:
      return GraphQlResource.Page;
    case restResources.Product.singular:
      return GraphQlResource.Product;
    case restResources.Shop.singular:
      return GraphQlResource.Shop;
    case restResources.ProductVariant.singular:
      return GraphQlResource.ProductVariant;
  }

  throw new Error(`No GraphQL Admin Api match for Rest type of: \`${restResourceSingular}\``);
}
*/

export function getGraphQlResourceFromMetafieldOwnerType(metafieldOwnerType: MetafieldOwnerType): GraphQlResourceName {
  switch (metafieldOwnerType) {
    case MetafieldOwnerType.Article:
      return GraphQlResourceName.OnlineStoreArticle;
    case MetafieldOwnerType.Blog:
      return GraphQlResourceName.OnlineStoreBlog;
    case MetafieldOwnerType.Collection:
      return GraphQlResourceName.Collection;
    case MetafieldOwnerType.Customer:
      return GraphQlResourceName.Customer;
    case MetafieldOwnerType.Draftorder:
      return GraphQlResourceName.DraftOrder;
    case MetafieldOwnerType.Location:
      return GraphQlResourceName.Location;
    case MetafieldOwnerType.Order:
      return GraphQlResourceName.Order;
    case MetafieldOwnerType.Page:
      return GraphQlResourceName.OnlineStorePage;
    case MetafieldOwnerType.Product:
      return GraphQlResourceName.Product;
    case MetafieldOwnerType.Shop:
      return GraphQlResourceName.Shop;
    case MetafieldOwnerType.Productvariant:
      return GraphQlResourceName.ProductVariant;
  }

  throw new Error(`No GraphQL Admin Api match for Metafield Owner type of: \`${metafieldOwnerType}\``);
}

// #region GID functions
function isGraphQlGid(gid: string) {
  if (gid.startsWith('gid://shopify/')) return true;
  return false;
}
export function idToGraphQlGid(resourceType: string, id: number | string) {
  if (typeof id === 'string' && isGraphQlGid(id)) {
    return id as string;
  }
  if (resourceType === undefined || id === undefined || typeof id !== 'number') {
    throw new Error('Unable to format GraphQlGid');
  }
  return `gid://shopify/${resourceType}/${id}`;
}
export function graphQlGidToId(gid: string): number {
  if (!gid) throw new Error('Invalid GID');
  if (!Number.isNaN(parseInt(gid))) return Number(gid);

  const maybeNum = gid.split('/').at(-1)?.split('?').at(0);
  if (maybeNum) {
    return Number(maybeNum);
  }
  throw new Error(`Invalid GID: ${gid}`);
}
export function graphQlGidToResourceName(gid: string): GraphQlResourceName {
  if (!gid) throw new Error('Invalid GID');
  return gid.split('gid://shopify/').at(1)?.split('/').at(0) as GraphQlResourceName;
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
  return arrayUnique(errors.map((error) => `• ${error.message}`)).join('\n\n');
}
function formatGraphQlUserErrors(userErrors: ShopifyGraphQlUserError[]) {
  return arrayUnique(
    userErrors.map((error) => {
      return `• ${error.code ? error.code + ': ' : ''}${error.message}`;
    })
  ).join('\n\n');
}
// #endregion

// #region GraphQl auto throttling
export async function checkThrottleStatus(context: coda.ExecutionContext): Promise<ShopifyGraphQlThrottleStatus> {
  const { response } = await makeGraphQlRequest({ payload: { query: queryCheckThrottleStatus } }, context);
  const { extensions } = response.body;
  return extensions.cost.throttleStatus;
}

function calcSyncTableMaxEntriesPerRunOld(
  prevContinuation: SyncTableGraphQlContinuation,
  lastThrottleStatus: ShopifyGraphQlThrottleStatus
) {
  const { lastCost, lastMaxEntriesPerRun } = prevContinuation;
  if (!lastMaxEntriesPerRun || !lastCost) {
    const errorContent = JSON.stringify(prevContinuation, undefined, 2);
    throw new Error(
      `calcSyncTableMaxEntriesPerRun: No lastMaxEntriesPerRun or lastCost in prevContinuation:\n${errorContent}`
    );
  }

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
      maxEntriesPerRun = calcSyncTableMaxEntriesPerRunOld(prevContinuation, throttleStatus);
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
interface GraphQlRequestParams extends Omit<FetchRequestOptions, 'url'> {
  payload: any;
  apiVersion?: string;
  getUserErrors?: CallableFunction;
  retries?: number;
  storeFront?: boolean;
}

export type GraphQlResponse<Data extends any> = {
  data: Data;
  errors: any;
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
};
export async function makeGraphQlRequest<Data extends any>(
  params: GraphQlRequestParams,
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

  // always disable cache when in a synctable context, unless forceSyncContextCache is set
  if (context.sync && !params.forceSyncContextCache) {
    options.cacheTtlSecs = 0;
    options.forceCache = false;
  } else {
    options.cacheTtlSecs = params.cacheTtlSecs;
    options.forceCache = true;
  }

  try {
    const response = (await context.fetcher.fetch(options)) as coda.FetchResponse<GraphQlResponse<Data>>;
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

interface GraphQlSyncTableRequestParams extends Omit<GraphQlRequestParams, 'retries' | 'getUserErrors'> {
  maxEntriesPerRun: number;
  prevContinuation: SyncTableGraphQlContinuation;
  extraContinuationData?: any;
  getPageInfo?: CallableFunction;
}
export async function makeSyncTableGraphQlRequest<Data extends any>(
  params: GraphQlSyncTableRequestParams,
  context: coda.SyncExecutionContext
): Promise<{
  response: coda.FetchResponse<GraphQlResponse<Data>>;
  continuation: SyncTableGraphQlContinuation | null;
}> {
  if (params.prevContinuation?.retries) {
    logAdmin(`🔄 Retrying (count: ${params.prevContinuation.retries}) sync of ${params.maxEntriesPerRun} entries…`);
  }
  logAdmin(`🚀  GraphQL Admin API: Starting sync of ${params.maxEntriesPerRun} entries…`);

  try {
    const { response, retries } = await makeGraphQlRequest<Data>(
      {
        payload: params.payload,
        apiVersion: params.apiVersion,
        storeFront: params.storeFront,
        retries: params.prevContinuation?.retries ?? 0,
      },
      context
    );

    let continuation: SyncTableGraphQlContinuation | null = null;
    const pageInfo = response.body?.data && params.getPageInfo ? params.getPageInfo(response.body.data) : undefined;
    const hasNextRun = retries > 0 || (pageInfo && pageInfo.hasNextPage);

    if (hasNextRun) {
      continuation = {
        ...(continuation ?? {}),
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

interface GraphQlAugmentedSyncTableRequestParams
  extends Omit<GraphQlSyncTableRequestParams, 'getPageInfo' | 'getUserErrors'> {
  prevContinuation: SyncTableRestAugmentedContinuation;
  nextRestUrl?: string;
}
/**
 * A special function used when we try to augment a Rest request with GraphQL results
 * Il n'y a jamais de continuation, puisque l'on query uniquement spécifiquement par ID
 * Du coup, il faut renvoyer la continuation qui provient elle de la requête Rest initiale agrémentée de diverses choses
 * @param params
 * @param context
 * @returns
 */
export async function makeAugmentedSyncTableGraphQlRequest(
  params: GraphQlAugmentedSyncTableRequestParams,
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
        apiVersion: params.apiVersion,
        storeFront: params.storeFront,
        retries: params.prevContinuation?.retries ?? 0,
      },
      context
    );

    let continuation: SyncTableRestAugmentedContinuation | null = null;
    const hasNextRun = retries > 0 || params.nextRestUrl;

    if (hasNextRun) {
      continuation = {
        ...(continuation ?? {}),
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

export function getMixedSyncTableRemainingAndToProcessItems<
  C extends SyncTableMixedContinuation,
  Item,
  N extends number
>(prevContinuation: C, restItems: Item[], maxEntriesPerRun: N) {
  let toProcess: Item[] = [];
  let remaining: Item[] = [];

  if (prevContinuation?.cursor || prevContinuation?.retries) {
    logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
    toProcess = prevContinuation?.extraContinuationData?.currentBatch?.processing;
    remaining = prevContinuation?.extraContinuationData?.currentBatch?.remaining;
  } else {
    const stillProcessingRestItems = prevContinuation?.extraContinuationData?.currentBatch?.remaining.length > 0;
    let items: Item[] = [];
    if (stillProcessingRestItems) {
      items = [...prevContinuation.extraContinuationData.currentBatch.remaining];
      logAdmin(`🔁 Fetching next batch of ${items.length} items`);
    } else {
      items = [...restItems];
      logAdmin(`🟢 Found ${items.length} items to augment with metafields`);
    }

    toProcess = items.splice(0, maxEntriesPerRun);
    remaining = items;
  }
  return { toProcess, remaining };
}

interface GraphQlMixedSyncTableRequestParams extends Omit<GraphQlSyncTableRequestParams, 'getUserErrors'> {
  prevContinuation: SyncTableMixedContinuation;
  nextRestUrl?: string;
}
export async function makeMixedSyncTableGraphQlRequest<Data extends any>(
  params: GraphQlMixedSyncTableRequestParams,
  context: coda.SyncExecutionContext
): Promise<{
  response: coda.FetchResponse<GraphQlResponse<Data>>;
  continuation: SyncTableMixedContinuation | null;
}> {
  if (params.prevContinuation?.retries) {
    logAdmin(`🔄 Retrying (count: ${params.prevContinuation.retries}) sync of ${params.maxEntriesPerRun} entries…`);
  }
  logAdmin(`🚀  GraphQL Admin API: Starting sync of ${params.maxEntriesPerRun} entries…`);

  try {
    const { response, retries } = await makeGraphQlRequest<Data>(
      {
        payload: params.payload,
        apiVersion: params.apiVersion,
        retries: params.prevContinuation?.retries ?? 0,
      },
      context
    );

    let continuation: SyncTableMixedContinuation | null = null;
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
        ...(continuation ?? {}),
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
