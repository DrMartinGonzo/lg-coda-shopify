import * as coda from '@codahq/packs-sdk';
import { getShopifyRequestHeaders, isCodaCached, logAdmin } from './helpers';
import { GraphQlResourceName } from './typesNew/ShopifyGraphQlResourceTypes';
import { CACHE_DEFAULT, REST_DEFAULT_API_VERSION } from './constants';

import type { FetchRequestOptions } from './typesNew/Fetcher';
import type { SyncTableRestContinuation } from './types/SyncTable';

// TODO: better error handling

export function getRestBaseUrl(context: coda.ExecutionContext): string {
  return `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}`;
}

export const cleanQueryParams = <T>(params: T) => {
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
};

export const extractNextUrlPagination = (response) => {
  let nextUrl;
  const link = response.headers.link;
  if (link) {
    const parts = link.split(',');
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (part.indexOf('next') !== -1) {
        nextUrl = part.split(';')[0].trim().slice(1, -1);
        break;
      }
    }
  }

  return nextUrl;
};

export async function makeSyncTableGetRequest<Data extends any>(
  params: {
    url: string;
    extraContinuationData?: any;
  },
  context: coda.SyncExecutionContext
): Promise<{
  response: coda.FetchResponse<Data>;
  continuation: SyncTableRestContinuation | null;
}> {
  logAdmin(`🚀  Rest Admin API: Starting sync…`);

  let continuation: SyncTableRestContinuation | null = null;
  const response = await makeGetRequest<Data>({ url: params.url }, context);

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);
  if (nextUrl) {
    continuation = {
      nextUrl,
      extraContinuationData: params.extraContinuationData,
    };
  }

  return {
    response,
    continuation,
  };
}

export interface GetRequestParams extends FetchRequestOptions {
  url: string;
}
export async function makeGetRequest<Data extends any>(params: GetRequestParams, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'GET',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
  };
  // always disable cache when in a synctable context, unless forceSyncContextCache is set
  if (context.sync && !params.forceSyncContextCache) {
    options.cacheTtlSecs = 0;
  } else {
    options.cacheTtlSecs = params.cacheTtlSecs ?? CACHE_DEFAULT;
  }
  let response: coda.FetchResponse<Data>;
  try {
    response = await context.fetcher.fetch(options);
    return response;
  } catch (error) {
    console.log('error', error);
    throw new coda.UserVisibleError(error);
  }
}

interface PutRequestParams extends Omit<FetchRequestOptions, 'cacheTtlSecs' | 'forceSyncContextCache'> {
  url: string;
  payload?: any;
}
export async function makePutRequest<Data extends any>(params: PutRequestParams, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'PUT',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };
  let response: coda.FetchResponse<Data>;
  try {
    response = await context.fetcher.fetch(options);
    return response;
  } catch (error) {
    throw new coda.UserVisibleError(error);
  }
}

interface PostRequestParams extends PutRequestParams {}
export async function makePostRequest<Data extends any>(params: PostRequestParams, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'POST',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };
  let response: coda.FetchResponse<Data>;
  try {
    response = await context.fetcher.fetch(options);
    return response;
  } catch (error) {
    throw new coda.UserVisibleError(error);
  }
}

interface DeleteRequestParams extends Omit<FetchRequestOptions, 'cacheTtlSecs' | 'forceSyncContextCache'> {
  url: string;
}
export async function makeDeleteRequest(params: DeleteRequestParams, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'DELETE',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
  };
  let response: coda.FetchResponse<{}>;
  try {
    response = await context.fetcher.fetch(options);
    return response;
  } catch (error) {
    throw new coda.UserVisibleError(error);
  }
}
