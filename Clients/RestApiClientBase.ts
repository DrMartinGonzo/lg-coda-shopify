// #region Imports
import * as coda from '@codahq/packs-sdk';
import { PageInfo, PageInfoParams, ParamSet } from '@shopify/shopify-api';
import UrlParse from 'url-parse';

import { InvalidValueVisibleError } from '../Errors/Errors';
import { SupportedMetafieldOwnerResource } from '../Resources/Rest/Metafield';
import { REST_DEFAULT_API_VERSION } from '../config';
import { OPTIONS_PUBLISHED_STATUS } from '../constants';

import { RestResourcesSingular, singularToPlural } from '../Resources/types/SupportedResource';
import { COMMENTABLE_OPTIONS } from '../schemas/syncTable/BlogSchema';
import { isNullish, isNullishOrEmpty, splitAndTrimValues } from '../utils/helpers';
import { FetchRequestOptions, SearchParams } from './Client.types';
import { getShopifyRequestHeaders } from './utils/client-utils';

import { BaseModelDataRest } from '../models/rest/AbstractModelRest';
import { ArticleApiData, ArticleModelData } from '../models/rest/ArticleModel';
import { AssetApiData, AssetModelData } from '../models/rest/AssetModel';
import { BlogApiData, BlogModelData } from '../models/rest/BlogModel';
import { CollectApiData, CollectModelData } from '../models/rest/CollectModel';
import { CustomerApiData, CustomerModelData } from '../models/rest/CustomerModel';
import { MetafieldApiData, MetafieldModelData } from '../models/rest/MetafieldModel';
import { PageApiData, PageModelData } from '../models/rest/PageModel';
import { ThemeApiData, ThemeModelData } from '../models/rest/ThemeModel';
// #endregion

// #region Types
interface BaseFindArgs {
  fields?: string;
  options?: FetchRequestOptions;
}

export interface RestRequestReturn<ResT extends any> extends coda.FetchResponse<ResT> {
  pageInfo?: PageInfo;
}

type TranformResponseT<T extends any = any> = (response: any) => T;

interface BaseRequestParams {
  /** The path to the resource, relative to the API version root. */
  path: string;
  /** The maximum number of times the request can be made if it fails with a throttling or server error. */
  tries?: number;
  /** The name of the request, for display purpose. */
  name?: string;
  /** Query parameters to be sent with the request. */
  query?: SearchParams;

  options?: FetchRequestOptions;

  transformBodyResponse?: TranformResponseT;
}
interface GetRequestParams extends BaseRequestParams {}
interface PostRequestParams extends BaseRequestParams {
  body: Record<string, any>;
}
interface PutRequestParams extends PostRequestParams {}
interface DeleteRequestParams extends BaseRequestParams {}

type RequestParams = {
  method: coda.FetchMethodType;
} & Partial<GetRequestParams & PostRequestParams & PutRequestParams & DeleteRequestParams>;

interface RestClientParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}
// #endregion

// #region RestApiClientBase
export abstract class RestApiClientBase {
  private static LINK_HEADER_REGEXP = /<([^<]+)>; rel="([^"]+)"/;
  private static DEFAULT_LIMIT = '250';
  private static RETRY_WAIT_TIME = 1000;

  static readonly DEPRECATION_ALERT_DELAY = 300000;

  protected readonly context: coda.ExecutionContext;
  protected readonly apiVersion: string;

  public static createInstance<T extends RestApiClientBase>(
    this: new (...args: any[]) => T,
    context: coda.ExecutionContext,
    apiVersion?: string
  ) {
    return new this({ context, apiVersion });
  }

  constructor({ context, apiVersion = REST_DEFAULT_API_VERSION }: RestClientParams) {
    this.context = context;
    this.apiVersion = apiVersion;
  }

  private cleanQueryParams = (params: ParamSet = {}) => {
    const cleanParams: ParamSet = {};
    for (const key in params) {
      if (!isNullish(params[key])) {
        cleanParams[key] = params[key];
      }
    }
    return cleanParams;
  };
  protected validateParams(params: any) {
    return true;
  }

  private parsePageInfoLinks(link: string, query: SearchParams) {
    const pageInfo: PageInfo = {
      limit: query?.limit ? query?.limit.toString() : RestApiClientBase.DEFAULT_LIMIT,
    };

    const links = link.split(', ');
    for (const link of links) {
      const parsedLink = link.match(RestApiClientBase.LINK_HEADER_REGEXP);
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

  private buildRequestParams(newPageUrl: string): PageInfoParams {
    const pattern = `^/admin/api/[^/]+/(.*).json$`;

    const url = new UrlParse(newPageUrl, true);
    const path = url.pathname.replace(new RegExp(pattern), '$1');
    return {
      path,
      query: url.query,
    };
  }

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

  private async request<T extends any>({
    method,
    path,
    options,
    query = {},
    body,
    tries,
    name,
    transformBodyResponse,
  }: RequestParams) {
    const cleanedQueryParams = this.cleanQueryParams(query);
    this.validateParams(cleanedQueryParams);
    const url = coda.withQueryParams(this.apiUrlFormatter(path), cleanedQueryParams);

    const fetcherOptions: coda.FetchRequest = {
      method,
      url,
      headers: getShopifyRequestHeaders(this.context),
    };
    if (['POST', 'PUT'].includes(method) && body) {
      fetcherOptions.body = JSON.stringify(body);
    }
    // Use default Coda cacheTtlSecs value or set a custom one if present
    if (options?.cacheTtlSecs !== undefined) {
      fetcherOptions.cacheTtlSecs = options.cacheTtlSecs;
    }

    try {
      const response: RestRequestReturn<T> = await this.context.fetcher.fetch<T>(fetcherOptions);
      if (transformBodyResponse) {
        response.body = transformBodyResponse(response.body);
      }

      const link = response.headers.link as string | undefined;
      if (link !== undefined) {
        response.pageInfo = this.parsePageInfoLinks(link, query);
      }

      return response;
    } catch (error) {
      if (method === 'DELETE') {
        console.error(`Not found at path : '${path}'. Possibly already deleted.`);
      } else {
        throw new coda.UserVisibleError(`${name} error. ${error}`);
      }
    }
  }

  protected async baseGet<T extends any = {}>(params: GetRequestParams) {
    return this.request<T>({ method: 'GET', ...params });
  }
  protected async basePost<T extends any = {}>(params: PostRequestParams) {
    return this.request<T>({ method: 'POST', ...params });
  }
  protected async basePut<T extends any = {}>(params: PutRequestParams) {
    return this.request<T>({ method: 'PUT', ...params });
  }
  protected async baseDelete<T extends any = {}>(params: DeleteRequestParams) {
    return this.request<T>({ method: 'DELETE', ...params });
  }
}
// #endregion

// #region CrudClient
export interface IRestCRUD {
  single(params: any): Promise<RestRequestReturn<any>>;
  list(params: any): Promise<RestRequestReturn<any[]>>;
  create(modelData: BaseModelDataRest): Promise<RestRequestReturn<any>>;
  update(modelData: BaseModelDataRest): Promise<RestRequestReturn<any>>;
  delete(modelData: BaseModelDataRest): Promise<RestRequestReturn<any>>;
}

// TODO Rename and integrate directly into RestApiClientBase
abstract class CrudClient<
    SingleArgs extends BaseFindArgs & { id: number },
    ListArgs extends BaseFindArgs,
    ApiData,
    ModelData extends BaseModelDataRest
  >
  extends RestApiClientBase
  implements IRestCRUD
{
  private singular: string;
  private plural: string;

  constructor({
    singular,
    plural,
    context,
    apiVersion = REST_DEFAULT_API_VERSION,
  }: RestClientParams & {
    singular: string;
    plural: string;
  }) {
    super({ context, apiVersion });
    this.singular = singular;
    this.plural = plural;
  }

  protected transformSingleResponse(response: { [key in typeof this.singular]: ApiData }) {
    return response[this.singular];
  }
  protected transformListResponse(response: { [key in typeof this.plural]: ApiData }) {
    return response[this.plural];
  }

  async single({ id, fields = null, options }: SingleArgs) {
    return super.baseGet<ApiData>({
      path: `${this.plural}/${id}.json`,
      query: { fields },
      options,
      name: `single ${this.singular}`,
      transformBodyResponse: this.transformSingleResponse.bind(this),
    });
  }

  async list({ options, ...otherArgs }: ListArgs) {
    return super.baseGet<ApiData[]>({
      path: `${this.plural}.json`,
      query: { ...otherArgs },
      options,
      name: `list ${this.plural}`,
      transformBodyResponse: this.transformListResponse.bind(this),
    });
  }

  async create(modelData: ModelData) {
    return super.basePost<ApiData>({
      path: `${this.plural}.json`,
      body: { blog: modelData },
      name: `create ${this.singular}`,
      transformBodyResponse: this.transformSingleResponse.bind(this),
    });
  }

  async update(modelData: ModelData) {
    const { id, ...d } = modelData;
    return super.basePut<ApiData>({
      path: `${this.plural}/${id}.json`,
      body: { blog: d },
      name: `update ${this.singular}`,
      transformBodyResponse: this.transformSingleResponse.bind(this),
    });
  }

  async delete(modelData: ModelData) {
    return super.baseDelete<{}>({
      path: `${this.plural}/${modelData.id}.json`,
      name: `delete ${this.singular}`,
    });
  }
}
// #endregion

// #region ArticleClient
interface SingleArticleArgs extends BaseFindArgs {
  id: number;
}
export interface ListArticlesArgs extends BaseFindArgs {
  [key: string]: unknown;
  blog_id?: number | null;
  limit?: number;
  since_id?: number;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  published_at_min?: Date;
  published_at_max?: Date;
  published_status?: string;
  handle?: string;
  tags?: string[];
  author?: string;
}

export class ArticleClient extends CrudClient<SingleArticleArgs, ListArticlesArgs, ArticleApiData, ArticleModelData> {
  constructor(params: RestClientParams) {
    super({ singular: 'article', plural: 'articles', ...params });
  }

  async create(modelData: ArticleModelData) {
    const { blog_id, ...d } = modelData;
    return super.basePost<ArticleApiData>({
      path: `blogs/${blog_id}/articles.json`,
      body: { article: d },
      name: 'create article',
      transformBodyResponse: this.transformSingleResponse.bind(this),
    });
  }

  protected validateParams(params: ListArticlesArgs) {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((s) => s.value);
    if (!isNullishOrEmpty(params.published_status) && !validPublishedStatuses.includes(params.published_status)) {
      throw new InvalidValueVisibleError('published_status: ' + params.published_status);
    }
    return true;
  }
}
// #endregion

// #region BlogClient
interface SingleBlogArgs extends BaseFindArgs {
  id: number;
}
export interface ListBlogsArgs extends BaseFindArgs {
  [key: string]: unknown;
  commentable?: string;
  limit?: unknown;
  since_id?: unknown;
  handle?: unknown;
  fields?: string;
}

export class BlogClient extends CrudClient<SingleBlogArgs, ListBlogsArgs, BlogApiData, BlogModelData> {
  constructor(params: RestClientParams) {
    super({ singular: 'blog', plural: 'blogs', ...params });
  }

  protected validateParams(params: ListBlogsArgs) {
    const validCommentableOptions = COMMENTABLE_OPTIONS.map((option) => option.value);
    if (!isNullishOrEmpty(params.commentable) && !validCommentableOptions.includes(params.commentable)) {
      throw new InvalidValueVisibleError('commentable: ' + params.commentable);
    }
    return true;
  }
}
// #endregion

// #region CollectClient
interface SingleCollectArgs extends BaseFindArgs {
  id: number;
}
export interface ListCollectsArgs extends BaseFindArgs {
  [key: string]: unknown;
  limit?: unknown;
  since_id?: unknown;
  fields?: string;
}

export class CollectClient extends CrudClient<SingleCollectArgs, ListCollectsArgs, CollectApiData, CollectModelData> {
  constructor(params: RestClientParams) {
    super({ singular: 'collect', plural: 'collects', ...params });
  }
}
// #endregion

// #region CustomerClient
interface SingleCustomerArgs extends BaseFindArgs {
  id: number;
}
export interface ListCustomersArgs extends BaseFindArgs {
  ids?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  limit?: unknown;
  tags?: string[];
}

export class CustomerClient extends CrudClient<
  SingleCustomerArgs,
  ListCustomersArgs,
  CustomerApiData,
  CustomerModelData
> {
  constructor(params: RestClientParams) {
    super({ singular: 'customer', plural: 'customers', ...params });
  }

  async list({ tags: filterTags = [], options, ...otherArgs }: ListCustomersArgs) {
    const response = await super.list({ options, ...otherArgs });

    // TODO: implement using search endpoint
    return {
      ...response,
      body: response.body.filter((data) => {
        let passCustomerTags = true;
        if (filterTags.length) {
          const customerTags = splitAndTrimValues(data?.tags ?? '');
          passCustomerTags = customerTags.length && customerTags.some((t) => filterTags.includes(t));
        }
        return passCustomerTags;
      }),
    } as typeof response;
  }
}
// #endregion

// #region AssetClient
interface ListAssetsArgs extends BaseFindArgs {
  theme_id?: number | string | null;
  asset?: { [key: string]: unknown } | null;
}

export class AssetClient extends CrudClient<any, ListAssetsArgs, AssetApiData, AssetModelData> {
  constructor(params: RestClientParams) {
    super({ singular: 'asset', plural: 'assets', ...params });
  }
  // async list({ options, ...otherArgs }: ListAssetsArgs) {
  //   return super.baseGet<AssetApiData[]>({
  //     path: 'assets.json',
  //     query: { ...otherArgs },
  //     options,
  //     name: 'list assets',
  //     transformBodyResponse: transformListAssetsResponse,
  //   });
  // }
}
// #endregion

// #region MetafieldClient
interface SingleMetafieldResponse {
  metafield: MetafieldApiData;
}
interface MultipleMetafieldsResponse {
  metafields: MetafieldApiData[];
}
interface SingleMetafieldArgs extends BaseFindArgs {
  id: number;
}
interface ListMetafieldsByKeysArgs extends BaseFindArgs {
  metafieldKeys: Array<string>;
  owner_id: number;
  owner_resource: SupportedMetafieldOwnerResource;
}
interface ListMetafieldsArgs extends BaseFindArgs {
  [key: string]: unknown;
  limit?: unknown;
  owner_id: number | null;
  owner_resource: SupportedMetafieldOwnerResource | null;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  namespace?: unknown;
  key?: unknown;
  type?: unknown;
  fields?: string | null;
}

const transformSingleMetafieldResponse = (response: SingleMetafieldResponse) => response.metafield;
const transformListMetafieldsResponse = (response: MultipleMetafieldsResponse) => response.metafields;

export class MetafieldClient extends CrudClient<
  SingleMetafieldArgs,
  ListMetafieldsArgs,
  MetafieldApiData,
  MetafieldModelData
> {
  constructor(params: RestClientParams) {
    super({ singular: 'metafield', plural: 'metafields', ...params });
  }

  async listByKeys({ metafieldKeys = [], owner_id, owner_resource, ...otherArgs }: ListMetafieldsByKeysArgs) {
    const response = await this.list({ owner_id, owner_resource, ...otherArgs });
    if (metafieldKeys.length) {
      return {
        ...response,
        // TODO: implement get full key function
        body: response.body.filter((metafield) => metafieldKeys.includes(`${metafield.namespace}.${metafield.key}`)),
      };
    }

    return response;
  }

  async list({ owner_id = null, owner_resource = null, options = {}, ...otherArgs }: ListMetafieldsArgs) {
    return super.baseGet<MetafieldApiData[]>({
      path: 'metafields.json',
      query: {
        ['metafield[owner_id]']: owner_id,
        ['metafield[owner_resource]']: owner_resource,
        ...otherArgs,
      },
      options,
      name: 'list metafields',
      transformBodyResponse: transformListMetafieldsResponse,
    });
  }

  async create(modelData: MetafieldModelData) {
    return super.basePost<MetafieldApiData>({
      path: this.getPostPath(modelData),
      body: { metafield: modelData },
      name: 'create metafield',
      transformBodyResponse: transformSingleMetafieldResponse,
    });
  }
  getPostPath(modelData: MetafieldModelData) {
    return modelData.owner_resource !== RestResourcesSingular.Shop
      ? `${singularToPlural(modelData.owner_resource)}/${modelData.owner_id}/metafields.json`
      : 'metafields.json';
  }

  async update(modelData: MetafieldModelData) {
    const { id, ...d } = modelData;
    return super.basePut<MetafieldApiData>({
      path: this.getPutPath(modelData),
      body: { metafield: d },
      name: 'update metafield',
      transformBodyResponse: transformSingleMetafieldResponse,
    });
  }
  getPutPath(modelData: MetafieldModelData) {
    return this.getPostPath(modelData).split('.json')[0] + `/${modelData.id}.json`;
  }
}
// #endregion

// #region PageClient
interface SinglePageArgs extends BaseFindArgs {
  id: number;
}
export interface ListPagesArgs extends BaseFindArgs {
  [key: string]: unknown;
  limit?: unknown;
  since_id?: unknown;
  title?: unknown;
  handle?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  published_status?: string;
}

export class PageClient extends CrudClient<SinglePageArgs, ListPagesArgs, PageApiData, PageModelData> {
  constructor(params: RestClientParams) {
    super({ singular: 'page', plural: 'pages', ...params });
  }

  protected validateParams(params: ListPagesArgs) {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((s) => s.value);
    if (!isNullishOrEmpty(params.published_status) && !validPublishedStatuses.includes(params.published_status)) {
      throw new InvalidValueVisibleError('published_status: ' + params.published_status);
    }
    return true;
  }
}
// #endregion

// #region ThemeClient
interface SingleThemeArgs extends BaseFindArgs {
  id: number;
}
interface ListThemesArgs extends BaseFindArgs {}

export class ThemeClient extends CrudClient<SingleThemeArgs, ListThemesArgs, ThemeApiData, ThemeModelData> {
  constructor(params: RestClientParams) {
    super({ singular: 'theme', plural: 'themes', ...params });
  }

  async active(listArgs: ListThemesArgs): Promise<RestRequestReturn<ThemeApiData>> {
    const response = await this.list(listArgs);
    return { ...response, body: response.body.find((theme) => theme.role === 'main') };
  }
}
// #endregion
