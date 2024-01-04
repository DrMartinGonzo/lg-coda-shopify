import * as coda from '@codahq/packs-sdk';
import { getShopifyRequestHeaders } from './helpers';
import { FormatFunction } from './types/misc';
import { SyncTableRestContinuation } from './types/tableSync';

export const cleanQueryParams = (params) => {
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

export async function makeSyncTableGetRequest(
  params: {
    url: string;
    cacheTtlSecs?: number;
    formatFunction: FormatFunction;
    mainDataKey: string;
    extraContinuationData?: any;
  },
  context: coda.SyncExecutionContext
) {
  let continuation: SyncTableRestContinuation = null;
  const response = await makeGetRequest({ url: params.url, cacheTtlSecs: params.cacheTtlSecs }, context);
  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);
  if (nextUrl) {
    continuation = {
      nextUrl,
      extraContinuationData: params.extraContinuationData,
    };
  }

  let items = [];
  if (body[params.mainDataKey]) {
    items = body[params.mainDataKey].map((item) => params.formatFunction(item, context));
  }

  return {
    result: items,
    continuation,
  };
}

async function doRequest(options: coda.FetchRequest, context: coda.ExecutionContext) {
  try {
    return await context.fetcher.fetch(options);
  } catch (error) {
    throw new coda.UserVisibleError(error);
  }
}

export async function makeGetRequest(
  params: {
    url: string;
    cacheTtlSecs?: number;
  },
  context: coda.ExecutionContext
) {
  const options: coda.FetchRequest = {
    method: 'GET',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
  };
  if (params.cacheTtlSecs !== undefined) {
    options.cacheTtlSecs = params.cacheTtlSecs;
  }

  return doRequest(options, context);
}

export async function makePutRequest(params: { url: string; payload: any }, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'PUT',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };
  return doRequest(options, context);
}

export async function makePostRequest(params: { url: string; payload: any }, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'POST',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
    body: JSON.stringify(params.payload),
  };
  return doRequest(options, context);
}

export async function makeDeleteRequest(params: { url: string }, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'DELETE',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
  };
  return doRequest(options, context);
}
