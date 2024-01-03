import * as coda from '@codahq/packs-sdk';
import { getShopifyRequestHeaders } from './helpers';

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

export async function restGetRequest(
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

  return context.fetcher.fetch(options);
}

export async function restPutRequest(params: { url: string; payload: any }, context: coda.ExecutionContext) {
  const options: coda.FetchRequest = {
    method: 'PUT',
    url: params.url,
    body: JSON.stringify(params.payload),
    headers: getShopifyRequestHeaders(context),
  };

  return context.fetcher.fetch(options);
}
