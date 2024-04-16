import * as coda from '@codahq/packs-sdk';
import UrlParse from 'url-parse';

import { PageInfo, PageInfoParams } from '@shopify/shopify-api/lib/clients/types';
import { REST_DEFAULT_API_VERSION } from '../config';
import { getShopifyRequestHeaders } from './utils/client-utils';
import { FetchRequestOptions } from './Client.types';

function generateApiUrlFormatter(defaultApiVersion: string, formatPaths = true) {
  return (context: coda.ExecutionContext, path: string, apiVersion?: string) => {
    // if (apiVersion) {
    //   validateApiVersion({
    //     ...baseApiVersionValidationParams,
    //     apiVersion,
    //   });
    // }

    const storeUrl = context.endpoint;

    const urlApiVersion = (apiVersion ?? defaultApiVersion).trim();
    let cleanPath = path.replace(/^\//, '');
    if (formatPaths) {
      if (!cleanPath.startsWith('admin')) {
        cleanPath = `admin/api/${urlApiVersion}/${cleanPath}`;
      }
      if (!cleanPath.endsWith('.json')) {
        cleanPath = `${cleanPath}.json`;
      }
    }

    // const params = new URLSearchParams();
    // if (searchParams) {
    //   for (const [key, value] of Object.entries(searchParams)) {
    //     convertValue(params, key, value);
    //   }
    // }
    // const queryString = params.toString() ? `?${params.toString()}` : '';

    return `${storeUrl}/${cleanPath}`;
  };
}

const apiUrlFormatter = generateApiUrlFormatter(REST_DEFAULT_API_VERSION);

// #region Types
// export interface PageInfo {
//   limit: string;
//   previousPageUrl?: string;
//   nextPageUrl?: string;
// }

interface RestRequestReturn<T = any> {
  body: T;
  headers: coda.FetchResponse['headers'];
  pageInfo?: PageInfo;
}

type SearchParamField = string | number;
type SearchParamFields = SearchParamField | SearchParamField[] | Record<string, SearchParamField | SearchParamField[]>;
export type SearchParams = Record<string, SearchParamFields>;

interface GetRequestParams {
  /** The path to the resource, relative to the API version root. */
  path: string;
  /** Query parameters to be sent with the request. */
  query?: SearchParams;
  /** The maximum number of times the request can be made if it fails with a throttling or server error. */
  tries?: number;

  options?: FetchRequestOptions;
}
type PostRequestParams = GetRequestParams & {
  /**
   * The request body.
   */
  data: Record<string, any> | string;
};
type PutRequestParams = PostRequestParams;
type DeleteRequestParams = GetRequestParams;
type RequestParams = (GetRequestParams | PostRequestParams) & {
  method: coda.FetchMethodType;
};
// #endregion

interface RestClientParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}

export class RestClient {
  private static LINK_HEADER_REGEXP = /<([^<]+)>; rel="([^"]+)"/;
  private static DEFAULT_LIMIT = '250';
  private static RETRY_WAIT_TIME = 1000;

  static readonly DEPRECATION_ALERT_DELAY = 300000;

  protected readonly context: coda.ExecutionContext;

  readonly apiVersion: string;

  constructor({ context, apiVersion }: RestClientParams) {
    this.context = context;
    this.apiVersion = apiVersion;
  }

  private static cleanQueryParams = <T>(params: T): T => {
    if (!params) return {} as T;

    Object.keys(params).forEach((key) => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    return params;
  };

  private static parsePageInfoLinks(link: string, query: SearchParams) {
    const pageInfo: PageInfo = {
      limit: query?.limit ? query?.limit.toString() : RestClient.DEFAULT_LIMIT,
    };

    const links = link.split(', ');
    for (const link of links) {
      const parsedLink = link.match(RestClient.LINK_HEADER_REGEXP);
      if (!parsedLink) {
        continue;
      }

      const linkRel = parsedLink[2];
      const linkUrl = new UrlParse(parsedLink[1], true);
      const linkFields = linkUrl?.query?.fields;
      const linkPageToken = linkUrl?.query?.page_info;

      if (!pageInfo.fields && linkFields) {
        pageInfo.fields = linkFields.split(',');
      }

      if (linkPageToken) {
        switch (linkRel) {
          case 'previous':
            pageInfo.previousPageUrl = parsedLink[1];
            pageInfo.prevPage = this.buildRequestParams(parsedLink[1]);

            break;
          case 'next':
            pageInfo.nextPageUrl = parsedLink[1];
            pageInfo.nextPage = this.buildRequestParams(parsedLink[1]);

            break;
        }
      }
    }

    return pageInfo;
  }

  private static buildRequestParams(newPageUrl: string): PageInfoParams {
    const pattern = `^/admin/api/[^/]+/(.*).json$`;

    const url = new UrlParse(newPageUrl, true);
    const path = url.pathname.replace(new RegExp(pattern), '$1');
    return {
      path,
      query: url.query,
    };
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // #region Requests
  protected async request<T = any>(params: RequestParams) {
    const url = coda.withQueryParams(
      apiUrlFormatter(this.context, params.path, REST_DEFAULT_API_VERSION),
      RestClient.cleanQueryParams(params.query ?? {})
    );

    const fetcherOptions: coda.FetchRequest = {
      method: params.method,
      url,
      headers: getShopifyRequestHeaders(this.context),
    };
    if (['POST', 'PUT'].includes(params.method) && 'data' in params) {
      fetcherOptions.body = JSON.stringify(params.data);
    }
    // Use default Coda cacheTtlSecs value or set a custom one if present
    if (params.options?.cacheTtlSecs !== undefined) {
      fetcherOptions.cacheTtlSecs = params.options.cacheTtlSecs;
    }

    const response = await this.context.fetcher.fetch<T>(fetcherOptions);

    const requestReturn: RestRequestReturn<T> = {
      body: response.body,
      headers: response.headers,
    };
    const link = response.headers.link as string | undefined;
    if (link !== undefined) {
      requestReturn.pageInfo = RestClient.parsePageInfoLinks(link, params.query);
    }

    return requestReturn;
  }

  /**
   * Performs a GET request on the given path.
   */
  public async get<T = any>(params: GetRequestParams) {
    return this.request<T>({ method: 'GET', ...params });
  }

  /**
   * Performs a POST request on the given path.
   */
  public async post<T = any>(params: PostRequestParams) {
    return this.request<T>({ method: 'POST', ...params });
  }

  /**
   * Performs a PUT request on the given path.
   */
  public async put<T = any>(params: PutRequestParams) {
    return this.request<T>({ method: 'PUT', ...params });
  }

  /**
   * Performs a DELETE request on the given path.
   */
  public async delete<T = any>(params: DeleteRequestParams) {
    return this.request<T>({ method: 'DELETE', ...params });
  }
  // #endregion
}
