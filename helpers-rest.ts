import * as coda from '@codahq/packs-sdk';
import { getShopifyRequestHeaders, isCodaCached, logAdmin } from './helpers';
import { SyncTableRestContinuation } from './types/tableSync';
import { RestResource, restResources } from './types/Rest';
import { GraphQlResource } from './types/GraphQl';

// TODO: better error handling

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

export function getRestResourceFromGraphQlResourceType(resourceType: GraphQlResource): RestResource {
  switch (resourceType) {
    case GraphQlResource.Article:
      return restResources.Article;
    case GraphQlResource.Blog:
      return restResources.Blog;
    case GraphQlResource.Collection:
      return restResources.Collection;
    case GraphQlResource.Customer:
      return restResources.Customer;
    case GraphQlResource.DraftOrder:
      return restResources.DraftOrder;
    case GraphQlResource.Location:
      return restResources.Location;
    case GraphQlResource.Order:
      return restResources.Order;
    case GraphQlResource.Page:
      return restResources.Page;
    case GraphQlResource.Product:
      return restResources.Product;
    case GraphQlResource.Shop:
      return restResources.Shop;
    case GraphQlResource.ProductVariant:
      return restResources.ProductVariant;
  }

  throw new Error(`No Rest Admin Api match for GraphQl type of: \`${resourceType}\``);
}

export async function makeSyncTableGetRequest(
  params: {
    url: string;
    cacheTtlSecs?: number;
    extraContinuationData?: any;
  },
  context: coda.SyncExecutionContext
) {
  logAdmin(`🚀  Rest Admin API: Starting sync…`);

  let continuation: SyncTableRestContinuation = null;
  const response = await makeGetRequest({ url: params.url, cacheTtlSecs: params.cacheTtlSecs }, context);

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

async function doRequest(options: coda.FetchRequest, context: coda.ExecutionContext) {
  let response: coda.FetchResponse<any>;
  try {
    response = await context.fetcher.fetch(options);
    return response;
  } catch (error) {
    console.log('error', error);
    throw new coda.UserVisibleError(error);
  }
}

export interface GetRequestParams {
  url: string;
  cacheTtlSecs?: number;
}
export async function makeGetRequest(params: GetRequestParams, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'GET',
    url: params.url,
    headers: getShopifyRequestHeaders(context),
  };
  if (params.cacheTtlSecs !== undefined) {
    options.cacheTtlSecs = params.cacheTtlSecs;
  }

  const response = await doRequest(options, context);
  const isCachedResponse = isCodaCached(response);
  return response;
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
