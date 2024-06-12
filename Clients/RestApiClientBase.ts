// #region Imports
import * as coda from '@codahq/packs-sdk';
import { PageInfo, PageInfoParams, ParamSet } from '@shopify/shopify-api';
import UrlParse from 'url-parse';

import { BaseApiDataRest } from '../models/rest/AbstractModelRest';
import { ArticleApiData } from '../models/rest/ArticleModel';
import { AssetApiData } from '../models/rest/AssetModel';
import { BlogApiData } from '../models/rest/BlogModel';
import { CollectApiData } from '../models/rest/CollectModel';
import { CustomCollectionApiData } from '../models/rest/CustomCollectionModel';
import { CustomerApiData } from '../models/rest/CustomerModel';
import { DraftOrderApiData } from '../models/rest/DraftOrderModel';
import { InventoryLevelApiData } from '../models/rest/InventoryLevelModel';
import { MetafieldApiData } from '../models/rest/MetafieldModel';
import { OrderLineItemApiData } from '../models/rest/OrderLineItemModel';
import { OrderApiData } from '../models/rest/OrderModel';
import { PageApiData } from '../models/rest/PageModel';
import { RedirectApiData } from '../models/rest/RedirectModel';
import { SmartCollectionApiData } from '../models/rest/SmartCollectionModel';
import { ThemeApiData } from '../models/rest/ThemeModel';

import { RestResourcesSingular, singularToPlural } from '../Resources/types/SupportedResource';
import { DEFAULT_CURRENCY_CODE, REST_DEFAULT_API_VERSION } from '../config';
import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES, NOT_IMPLEMENTED, REST_DEFAULT_LIMIT } from '../constants';
import { SupportedMetafieldOwnerResource } from '../models/rest/MetafieldModel';
import { ShopApiData } from '../models/rest/ShopModel';
import { AbstractSyncedRestResources } from '../sync/rest/AbstractSyncedRestResources';
import { CurrencyCode } from '../types/admin.types';
import { isDefinedEmpty, removeNullishPropsFromObject, splitAndTrimValues } from '../utils/helpers';
import { FetchRequestOptions, SearchParams } from './Client.types';
import { getShopifyRequestHeaders } from './utils/client-utils';

// #endregion

// #region Types
interface BaseFindArgs {
  fields?: string;
  options?: FetchRequestOptions;
}
interface BaseSingleArgs extends BaseFindArgs {
  id: number;
}
interface BaseListArgs extends BaseFindArgs {
  limit?: number;
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

  transformResponseBody?: TranformResponseT;
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

// #region RestFetcher
class RestFetcher {
  private static LINK_HEADER_REGEXP = /<([^<]+)>; rel="([^"]+)"/;
  private static DEFAULT_LIMIT = '250';
  private static RETRY_WAIT_TIME = 1000;

  static readonly DEPRECATION_ALERT_DELAY = 300000;

  protected readonly context: coda.ExecutionContext;
  protected readonly apiVersion: string;

  constructor({ context, apiVersion = REST_DEFAULT_API_VERSION }: RestClientParams) {
    this.context = context;
    this.apiVersion = apiVersion;
  }

  private cleanQueryParams = (params: ParamSet = {}) => {
    return removeNullishPropsFromObject(params);
  };

  private parsePageInfoLinks(link: string, query: SearchParams) {
    const pageInfo: PageInfo = {
      limit: query?.limit ? query?.limit.toString() : RestFetcher.DEFAULT_LIMIT,
    };

    const links = link.split(', ');
    for (const link of links) {
      const parsedLink = link.match(RestFetcher.LINK_HEADER_REGEXP);
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
    transformResponseBody,
  }: RequestParams) {
    const cleanedQueryParams = this.cleanQueryParams(query);
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
      const link = response.headers.link as string | undefined;

      if (link !== undefined) {
        response.pageInfo = this.parsePageInfoLinks(link, query);
      }
      if (transformResponseBody) {
        response.body = transformResponseBody(response.body);
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

  public async get<T extends any = {}>(params: GetRequestParams) {
    return this.request<T>({ method: 'GET', ...params });
  }
  public async post<T extends any = {}>(params: PostRequestParams) {
    return this.request<T>({ method: 'POST', ...params });
  }
  public async put<T extends any = {}>(params: PutRequestParams) {
    return this.request<T>({ method: 'PUT', ...params });
  }
  public async delete<T extends any = {}>(params: DeleteRequestParams) {
    return this.request<T>({ method: 'DELETE', ...params });
  }
}
// #endregion

// #region AbstractRestClient
export interface IRestClient {
  defaultLimit: number;

  single(params: any): Promise<RestRequestReturn<any>>;
  list(params: any): Promise<RestRequestReturn<any[]>>;
  create(modelData: any): Promise<RestRequestReturn<any>>;
  update(modelData: any): Promise<RestRequestReturn<any>>;
  delete(modelData: any): Promise<RestRequestReturn<any>>;
}

abstract class AbstractRestClient<
  SingleArgs extends BaseSingleArgs,
  ListArgs extends BaseListArgs,
  ApiData extends BaseApiDataRest
> implements IRestClient
{
  protected singular: string;
  protected plural: string;
  protected readonly fetcher: RestFetcher;
  protected static readonly defaultLimit = REST_DEFAULT_LIMIT;

  public static createInstance<T extends AbstractRestClient<any, any, any>>(
    this: new (...args: any[]) => T,
    context: coda.ExecutionContext,
    apiVersion?: string
  ) {
    return new this({ context, apiVersion });
  }

  constructor({
    singular,
    plural,
    context,
    apiVersion = REST_DEFAULT_API_VERSION,
  }: RestClientParams & {
    singular: string;
    plural: string;
  }) {
    this.singular = singular;
    this.plural = plural;
    this.fetcher = new RestFetcher({ context, apiVersion });
  }

  protected transformResponseBodySingle(body: { [key in typeof this.singular]: ApiData }) {
    return body[this.singular];
  }
  protected transformResponseBodyList(body: { [key in typeof this.plural]: ApiData }) {
    return body[this.plural];
  }

  get defaultLimit() {
    return (this.constructor as typeof AbstractRestClient).defaultLimit;
  }

  async single({ id, fields = null, options }: SingleArgs) {
    return this.fetcher.get<ApiData>({
      path: `${this.plural}/${id}.json`,
      query: { fields },
      options,
      name: `single ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  async list({ limit, options, ...otherArgs }: ListArgs) {
    return this.fetcher.get<ApiData[]>({
      path: `${this.plural}.json`,
      query: { limit: limit ?? this.defaultLimit, ...otherArgs },
      options,
      name: `list ${this.plural}`,
      transformResponseBody: this.transformResponseBodyList.bind(this),
    });
  }

  /**
   * Permet de lister toutes les ressources en suivant la pagination,
   * sans passer par une Sync Table
   */
  async listAllLoop({ options, limit, ...otherArgs }: ListArgs) {
    let items: ApiData[] = [];
    let nextPageQuery: any = {};
    let response: RestRequestReturn<ApiData[]>;
    let params: any;

    while (true) {
      /** See comment in {@link AbstractSyncedRestResources.getListParams} */
      params = {
        limit,
        ...('page_info' in nextPageQuery ? nextPageQuery : otherArgs),
      };
      response = await this.list({
        ...params,
        options,
      });

      items = [...items, ...response.body];
      nextPageQuery = response.pageInfo?.nextPage?.query ?? {};
      if (Object.keys(nextPageQuery).length === 0) break;
    }

    return items;
  }

  async create(data: ApiData) {
    if (isDefinedEmpty(data)) return;
    return this.fetcher.post<ApiData>({
      path: `${this.plural}.json`,
      body: { [this.singular]: data },
      name: `create ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  async update(data: ApiData) {
    const { id, ...d } = data;
    if (isDefinedEmpty(d)) return;
    return this.fetcher.put<ApiData>({
      path: `${this.plural}/${id}.json`,
      body: { [this.singular]: d },
      name: `update ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  async delete(data: Pick<ApiData, 'id'>) {
    return this.fetcher.delete<{}>({
      path: `${this.plural}/${data.id}.json`,
      name: `delete ${this.singular}`,
    });
  }
}
// #endregion

// #region ArticleClient
export interface ListArticlesArgs extends BaseListArgs {
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

export class ArticleClient extends AbstractRestClient<BaseSingleArgs, ListArticlesArgs, ArticleApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'article', plural: 'articles', ...params });
  }

  async create(data: ArticleApiData) {
    const { blog_id, ...d } = data;
    // TODO: need a check on request level. Problem : the main key
    if (isDefinedEmpty(d)) return;
    return this.fetcher.post<ArticleApiData>({
      path: `blogs/${blog_id}/articles.json`,
      body: { [this.singular]: d },
      name: 'create article',
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }
}
// #endregion

// #region AssetClient
interface ListAssetsArgs extends BaseListArgs {
  theme_id?: number | string | null;
  asset?: { [key: string]: unknown } | null;
}

export class AssetClient extends AbstractRestClient<any, ListAssetsArgs, AssetApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'asset', plural: 'assets', ...params });
  }
}
// #endregion

// #region BlogClient
export interface ListBlogsArgs extends BaseListArgs {
  commentable?: string;
  limit?: number;
  since_id?: unknown;
  handle?: unknown;
  fields?: string;
}

export class BlogClient extends AbstractRestClient<BaseSingleArgs, ListBlogsArgs, BlogApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'blog', plural: 'blogs', ...params });
  }
}
// #endregion

// #region CollectClient
export interface ListCollectsArgs extends BaseListArgs {
  limit?: number;
  since_id?: number;
  collection_id?: number;
  product_id?: number;
  fields?: string;
}

export class CollectClient extends AbstractRestClient<BaseSingleArgs, ListCollectsArgs, CollectApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'collect', plural: 'collects', ...params });
  }
}
// #endregion

// #region CustomCollectionClient
export interface ListCustomCollectionsArgs extends BaseListArgs {
  limit?: number;
  ids?: unknown;
  since_id?: unknown;
  title?: unknown;
  product_id?: unknown;
  handle?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  published_status?: string;
  fields?: string;
}

export class CustomCollectionClient extends AbstractRestClient<
  BaseSingleArgs,
  ListCustomCollectionsArgs,
  CustomCollectionApiData
> {
  constructor(params: RestClientParams) {
    super({ singular: 'custom_collection', plural: 'custom_collections', ...params });
  }
}
// #endregion

// #region CustomerClient
export interface ListCustomersArgs extends BaseListArgs {
  ids?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  limit?: number;
  tags?: string[];
}

/*
interface OrdersCustomersArgs extends BaseContext {
  [key: string]: unknown;
  id: number | string;
  status?: unknown;
}
interface SearchCustomersArgs extends BaseContext {
  [key: string]: unknown;
  order?: unknown;
  query?: unknown;
  limit?: unknown;
  fields?: unknown;
  returnFullResponse?: boolean;
}
interface CustomerAccountActivationUrlArgs extends BaseContext {
  [key: string]: unknown;
  body?: { [key: string]: unknown } | null;
}
interface CustomersSendInviteArgs extends BaseContext {
  [key: string]: unknown;
  body?: { [key: string]: unknown } | null;
}
*/

export class CustomerClient extends AbstractRestClient<BaseSingleArgs, ListCustomersArgs, CustomerApiData> {
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

  /*
  async orders({ context, options, id, status = null, ...otherArgs }: OrdersArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'get',
      operation: 'orders',
      context,
      urlIds: { id: id },
      params: { status, ...otherArgs },
      body: {},
      entity: null,
      options,
    });

    return response ? response.body : null;
  }
  */

  /*
  async search({
    context,
    order = null,
    query = null,
    limit = null,
    fields = null,
    returnFullResponse = false,
    options,
    ...otherArgs
  }: SearchArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'get',
      operation: 'search',
      context,
      urlIds: {},
      params: { order, query, limit, fields, ...otherArgs },
      body: {},
      entity: null,
      options,
    });

    return returnFullResponse ? response : response?.body;
  }
  */

  /*
  async account_activation_url({
    options,
    body = null,
    ...otherArgs
  }: AccountActivationUrlArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'post',
      operation: 'account_activation_url',
      context: this.context,
      urlIds: { id: this.id },
      params: { ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }
  */

  /*
  async send_invite({ options, body = null, ...otherArgs }: SendInviteArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'post',
      operation: 'send_invite',
      context: this.context,
      urlIds: { id: this.id },
      params: { ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }
  */
}
// #endregion

// #region DraftOrderClient
export interface ListDraftOrdersArgs extends BaseListArgs {
  fields?: string;
  limit?: number;
  since_id?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  ids?: unknown;
  status?: unknown;
}

export interface CompleteDraftOrderArgs {
  id: number;
  payment_gateway_id?: unknown;
  payment_pending?: unknown;
}

export interface SendDraftOrderInvoiceArgs {
  id: number;
  /** The email address that will populate the to field of the email. */
  to?: string;
  /** The email address that will populate the from field of the email. */
  from?: string;
  /** The list of email addresses to include in the bcc field of the email. Emails must be associated with staff accounts on the shop. */
  bcc?: string[];
  /** The email subject. */
  subject?: string;
  /** The custom message displayed in the email. */
  custom_message?: string;
}

export class DraftOrderClient extends AbstractRestClient<BaseSingleArgs, ListDraftOrdersArgs, DraftOrderApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'draft_order', plural: 'draft_orders', ...params });
  }

  async complete({ id, payment_gateway_id = null, payment_pending = null }: CompleteDraftOrderArgs) {
    return this.fetcher.put<DraftOrderApiData>({
      path: `${this.plural}.json/${id}/complete.json`,
      body: {
        payment_gateway_id,
        payment_pending,
      },
      name: `complete ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  async send_invoice({ id, bcc, custom_message, from, subject, to }: SendDraftOrderInvoiceArgs) {
    return this.fetcher.post<DraftOrderApiData>({
      path: `${this.plural}.json/${id}/send_invoice.json`,
      body: {
        draft_order_invoice: removeNullishPropsFromObject({ to, from, bcc, subject, custom_message }),
      },
      name: `send ${this.singular} invoice`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }
}
// #endregion

// #region InventoryLevelClient
export interface ListInventoryLevelsArgs extends BaseListArgs {
  inventory_item_ids?: unknown;
  location_ids?: unknown;
  limit?: number;
  updated_at_min?: unknown;
}
interface AdjustInventoryLevelArgs {
  inventory_item_id?: number;
  location_id?: number;
  available_adjustment?: number;
}
interface SetInventoryLevelArgs {
  inventory_item_id?: number;
  location_id?: number;
  available?: number;
  disconnect_if_necessary?: boolean;
}
interface ConnectInventoryLevelArgs {
  inventory_item_id?: unknown;
  location_id?: unknown;
  relocate_if_necessary?: unknown;
  body?: { [key: string]: unknown } | null;
}

export class InventoryLevelClient extends AbstractRestClient<
  BaseSingleArgs,
  ListInventoryLevelsArgs,
  InventoryLevelApiData
> {
  constructor(params: RestClientParams) {
    super({ singular: 'inventory_level', plural: 'inventory_levels', ...params });
  }

  async delete(data: Pick<InventoryLevelApiData, 'id' | 'inventory_item_id' | 'location_id'>) {
    return this.fetcher.delete<{}>({
      path: `${this.plural}.json`,
      query: {
        inventory_item_id: data.inventory_item_id,
        location_id: data.location_id,
      },
      name: `delete ${this.singular}`,
    });
  }

  public async adjust(
    data: Pick<InventoryLevelApiData, 'inventory_item_id' | 'location_id'>,
    available_adjustment: number = null
  ) {
    return this.fetcher.post<OrderApiData>({
      path: `${this.plural}/adjust.json`,
      body: {
        inventory_item_id: data.inventory_item_id,
        location_id: data.location_id,
        available_adjustment,
      },
      name: `adjust ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  public async set(
    data: Pick<InventoryLevelApiData, 'inventory_item_id' | 'location_id' | 'available'>,
    disconnect_if_necessary: boolean = null
  ) {
    return this.fetcher.post<OrderApiData>({
      path: `${this.plural}/set.json`,
      body: {
        inventory_item_id: data.inventory_item_id,
        location_id: data.location_id,
        available: data.available,
        disconnect_if_necessary,
      },
      name: `set ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  /*
  public async connect({
    inventory_item_id = null,
    location_id = null,
    relocate_if_necessary = null,
    body = null,
    ...otherArgs
  }: ConnectInventoryLevelArgs): Promise<unknown> {
    const response = await this.request<InventoryLevel>({
      http_method: 'post',
      operation: 'connect',
      context: this.context,
      urlIds: {},
      params: {
        inventory_item_id: inventory_item_id,
        location_id: location_id,
        relocate_if_necessary: relocate_if_necessary,
        ...otherArgs,
      },
      body: body,
      entity: this,
    });

    return response ? response.body : null;
  }
  */
}
// #endregion

// #region MetafieldClient
interface ListMetafieldsByKeysArgs extends BaseListArgs {
  metafieldKeys: Array<string>;
  owner_id: number;
  owner_resource: SupportedMetafieldOwnerResource;
}
interface ListMetafieldsArgs extends BaseListArgs {
  limit?: number;
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

export class MetafieldClient extends AbstractRestClient<BaseSingleArgs, ListMetafieldsArgs, MetafieldApiData> {
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
    return this.fetcher.get<MetafieldApiData[]>({
      path: 'metafields.json',
      query: {
        ['metafield[owner_id]']: owner_id,
        ['metafield[owner_resource]']: owner_resource,
        ...otherArgs,
      },
      options,
      name: 'list metafields',
      transformResponseBody: this.transformResponseBodyList.bind(this),
    });
  }

  async create(data: MetafieldApiData) {
    if (isDefinedEmpty(data)) return;
    return this.fetcher.post<MetafieldApiData>({
      path: this.getPostPath(data),
      body: { [this.singular]: data },
      name: 'create metafield',
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }
  getPostPath(data: MetafieldApiData) {
    return data.owner_resource !== RestResourcesSingular.Shop
      ? `${singularToPlural(data.owner_resource)}/${data.owner_id}/metafields.json`
      : 'metafields.json';
  }

  async update(data: MetafieldApiData) {
    const { id, ...d } = data;
    if (isDefinedEmpty(d)) return;
    return this.fetcher.put<MetafieldApiData>({
      path: this.getPutPath(data),
      body: { [this.singular]: d },
      name: 'update metafield',
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }
  getPutPath(data: MetafieldApiData) {
    return this.getPostPath(data).split('.json')[0] + `/${data.id}.json`;
  }
}
// #endregion

// #region OrderClient
export interface ListOrdersArgs extends BaseListArgs {
  ids?: unknown;
  limit?: number;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  processed_at_min?: unknown;
  processed_at_max?: unknown;
  attribution_app_id?: unknown;
  status?: unknown;
  financial_status?: unknown;
  fulfillment_status?: unknown;
  fields?: string;
  customerTags?: string[];
  orderTags?: string[];
}
export interface CancelOrderArgs {
  id: number;
  amount: string;
  currency: string;
  /** @deprecated */
  restock: boolean;
  reason: 'customer' | 'inventory' | 'fraud' | 'declined' | 'other';
  email: boolean;
  refund: {
    note: string;
    notify: boolean;
    shipping: { full_refund: boolean; amount: string };
    refund_line_items: {
      line_item_id: number;
      quantity: number;
      restock_type: 'no_restock' | 'cancel' | 'return';
      location_id: number;
    }[];

    /** @deprecated */
    restock: boolean;
    transactions: [
      {
        parent_id: number;
        amount: string;
        kind: 'authorization' | 'capture' | 'sale' | 'void' | 'refund';
        gateway: string;
      }
    ];
  };
}

export class OrderClient extends AbstractRestClient<BaseSingleArgs, ListOrdersArgs, OrderApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'order', plural: 'orders', ...params });
  }

  async list({
    orderTags: filterOrderTags = [],
    customerTags: filterCustomerTags = [],
    options,
    ...otherArgs
  }: ListOrdersArgs) {
    const response = await super.list({ options, ...otherArgs });

    return {
      ...response,
      body: response.body.filter((data) => {
        let passCustomerTags = true;
        let passOrderTags = true;
        if (filterCustomerTags.length) {
          const customerTags = splitAndTrimValues(data?.customer?.tags ?? '');
          passCustomerTags = customerTags.length && customerTags.some((t) => filterCustomerTags.includes(t));
        }
        if (filterOrderTags.length) {
          const orderTags = splitAndTrimValues(data?.tags ?? '');
          passOrderTags = orderTags.length && orderTags.some((t) => filterOrderTags.includes(t));
        }
        return passCustomerTags && passOrderTags;
      }),
    };
  }

  async cancel({
    id,
    amount = null,
    currency = null,
    restock = null,
    reason = null,
    email = null,
    refund = null,
  }: CancelOrderArgs): Promise<RestRequestReturn<OrderApiData>> {
    return this.fetcher.post<OrderApiData>({
      path: `${this.plural}.json/${id}/cancel.json`,
      body: {
        amount,
        currency,
        email,
        reason,
        refund,
        restock,
      },
      name: `cancel ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  async close(id: number): Promise<RestRequestReturn<OrderApiData>> {
    return this.fetcher.post<OrderApiData>({
      path: `${this.plural}.json/${id}/close.json`,
      body: {},
      name: `close ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }

  async open(id: number): Promise<RestRequestReturn<OrderApiData>> {
    return this.fetcher.post<OrderApiData>({
      path: `${this.plural}.json/${id}/open.json`,
      body: {},
      name: `re-open ${this.singular}`,
      transformResponseBody: this.transformResponseBodySingle.bind(this),
    });
  }
}
// #endregion

// #region OrderLineItemClient
export class OrderLineItemClient extends AbstractRestClient<BaseSingleArgs, ListOrdersArgs, OrderLineItemApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'order', plural: 'orders', ...params });
  }

  async single(): Promise<RestRequestReturn<OrderLineItemApiData>> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async delete(): Promise<RestRequestReturn<OrderLineItemApiData>> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async create(): Promise<RestRequestReturn<OrderLineItemApiData>> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async update(): Promise<RestRequestReturn<OrderLineItemApiData>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async list({ options, ...otherArgs }: ListOrdersArgs) {
    const response = (await super.list({
      options,
      fields: ['id', 'name', 'line_items'].join(','),
      ...otherArgs,
    })) as unknown as RestRequestReturn<OrderApiData[]>;

    return {
      ...response,
      body: response.body.flatMap((orderData) => {
        return orderData.line_items.map((data) => {
          return {
            order_id: orderData.id,
            order_name: orderData.name,
            ...data,
          } as OrderLineItemApiData;
        });
      }),
    };
  }
}
// #endregion

// #region PageClient
export interface ListPagesArgs extends BaseListArgs {
  limit?: number;
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

export class PageClient extends AbstractRestClient<BaseSingleArgs, ListPagesArgs, PageApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'page', plural: 'pages', ...params });
  }
}
// #endregion

// #region RedirectClient
export interface ListRedirectsArgs extends BaseListArgs {
  limit?: number;
  since_id?: unknown;
  path?: unknown;
  target?: unknown;
}

export class RedirectClient extends AbstractRestClient<BaseSingleArgs, ListRedirectsArgs, RedirectApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'redirect', plural: 'redirects', ...params });
  }
}
// #endregion

// #region ShopClient
export interface ListShopsArgs extends BaseListArgs {}

export class ShopClient extends AbstractRestClient<BaseSingleArgs, ListShopsArgs, ShopApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'shop', plural: 'shop', ...params });
  }

  async current(params: BaseFindArgs) {
    const response = await this.list(params);
    return {
      ...response,
      body: response.body[0],
    };
  }

  async list(params: ListShopsArgs) {
    const singleResponse = (await super.list(params)) as unknown as RestRequestReturn<ShopApiData>;
    return {
      ...singleResponse,
      body: [singleResponse?.body],
    };
  }

  async activeCurrency(): Promise<CurrencyCode> {
    const response = await this.current({
      fields: 'currency',
      options: { cacheTtlSecs: CACHE_TEN_MINUTES },
    });
    let currencyCode = DEFAULT_CURRENCY_CODE;
    if (response?.body?.currency) {
      const { currency } = response.body;
      if (CODA_SUPPORTED_CURRENCIES.includes(currency as any)) {
        currencyCode = currency as CurrencyCode;
      } else {
        console.error(`Shop currency ${currency} not supported. Falling back to ${currencyCode}.`);
      }
    }
    return currencyCode;
  }
}
// #endregion

// #region SmartCollectionClient
interface ListSmartCollectionsArgs extends BaseListArgs {
  limit?: number;
  ids?: unknown;
  since_id?: unknown;
  title?: unknown;
  product_id?: unknown;
  handle?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  published_status?: string;
  fields?: string;
}

type CollectionSortOrderT =
  | 'alpha-asc'
  | 'alpha-des'
  | 'best-selling'
  | 'created'
  | 'created-desc'
  | 'manual'
  | 'price-asc'
  | 'price-desc';

export interface OrderSmartCollectionArgs {
  id: number;
  products: number[];
  sort_order: CollectionSortOrderT;
}

export class SmartCollectionClient extends AbstractRestClient<
  BaseSingleArgs,
  ListSmartCollectionsArgs,
  SmartCollectionApiData
> {
  constructor(params: RestClientParams) {
    super({ singular: 'smart_collection', plural: 'smart_collections', ...params });
  }

  public async order({ id, products = null, sort_order = null }: OrderSmartCollectionArgs) {
    return this.fetcher.put<SmartCollectionApiData>({
      path: `${this.plural}/${id}/order.json`,
      body: { products, sort_order },
    });
  }
}
// #endregion

// #region ThemeClient
interface ListThemesArgs extends BaseListArgs {}

export class ThemeClient extends AbstractRestClient<BaseSingleArgs, ListThemesArgs, ThemeApiData> {
  constructor(params: RestClientParams) {
    super({ singular: 'theme', plural: 'themes', ...params });
  }

  async active(listArgs: ListThemesArgs): Promise<RestRequestReturn<ThemeApiData>> {
    const response = await this.list(listArgs);
    return { ...response, body: response.body.find((theme) => theme.role === 'main') };
  }
}
// #endregion
