// #region Imports
import * as coda from '@codahq/packs-sdk';
import UrlParse from 'url-parse';

import { PageInfo, PageInfoParams } from '@shopify/shopify-api';
import { AbstractRestResource } from '../Resources/Abstract/Rest/AbstractRestResource';
import { REST_DEFAULT_API_VERSION } from '../config';
import { FetchRequestOptions, SearchParams } from './Client.types';
import { getShopifyRequestHeaders } from './utils/client-utils';

// #endregion

// #region Types
export interface RestRequestReturn<T extends AbstractRestResource = AbstractRestResource> {
  body: {
    [key: string]: T['apiData'];
  };
  headers: coda.FetchResponse['headers'];
  pageInfo?: PageInfo;
}

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

interface RestClientParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}
// #endregion

export class RestClient {
  private static LINK_HEADER_REGEXP = /<([^<]+)>; rel="([^"]+)"/;
  private static DEFAULT_LIMIT = '250';
  private static RETRY_WAIT_TIME = 1000;

  static readonly DEPRECATION_ALERT_DELAY = 300000;

  protected readonly context: coda.ExecutionContext;

  readonly apiVersion: string;

  constructor({ context, apiVersion = REST_DEFAULT_API_VERSION }: RestClientParams) {
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
  private apiUrlFormatter(path: string) {
    let cleanPath = path.replace(/^\//, '');
    if (!cleanPath.startsWith('admin')) {
      cleanPath = `admin/api/${this.apiVersion}/${cleanPath}`;
    }
    if (!cleanPath.endsWith('.json')) {
      cleanPath = `${cleanPath}.json`;
    }
    return `${this.context.endpoint}/${cleanPath}`;
  }

  protected async request<T extends AbstractRestResource = AbstractRestResource>(params: RequestParams) {
    const url = coda.withQueryParams(
      this.apiUrlFormatter(params.path),
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

    const response = await this.context.fetcher.fetch<T['apiData']>(fetcherOptions);

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
  public async get<T extends AbstractRestResource = AbstractRestResource>(params: GetRequestParams) {
    return this.request<T>({ method: 'GET', ...params });
  }

  /**
   * Performs a POST request on the given path.
   */
  public async post<T extends AbstractRestResource = AbstractRestResource>(params: PostRequestParams) {
    return this.request<T>({ method: 'POST', ...params });
  }

  /**
   * Performs a PUT request on the given path.
   */
  public async put<T extends AbstractRestResource = AbstractRestResource>(params: PutRequestParams) {
    return this.request<T>({ method: 'PUT', ...params });
  }

  /**
   * Performs a DELETE request on the given path.
   */
  public async delete<T extends AbstractRestResource = AbstractRestResource>(params: DeleteRequestParams) {
    return this.request<T>({ method: 'DELETE', ...params });
  }
  // #endregion
}
