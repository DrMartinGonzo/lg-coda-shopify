// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { VariablesOf } from '../utils/tada-utils';

import { InvalidValueError } from '../Errors/Errors';
import {
  GraphQLMaxCostExceededError,
  GraphQLThrottledError,
  ShopifyGraphQlError,
  ShopifyGraphQlErrorCode,
  ShopifyGraphQlMaxCostExceededError,
  ShopifyGraphQlRequestCost,
  ShopifyGraphQlThrottledError,
  ShopifyGraphQlUserError,
  ShopifyThrottledErrorCode,
} from '../Errors/GraphQlErrors';
import { SupportedMetafieldOwnerType } from '../Resources/GraphQl/MetafieldGraphQl';
import { GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from '../config';
import { CACHE_DEFAULT, CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../constants';
import {
  SupportedGraphQlMetafieldOperation,
  deleteMetafieldMutation,
  getMetafieldsByKeysGraphQlOperation,
  getNodesMetafieldsByKeyQuery,
  getResourceMetafieldsByKeysQueryFromOwnerType,
  getShopMetafieldsByKeysQuery,
  getSingleMetafieldQuery,
  getSingleNodeMetafieldsByKeyQuery,
  setMetafieldsMutation,
} from '../graphql/metafields-graphql';
import {
  ProductFilters,
  buildProductsSearchQuery,
  createProductMutation,
  deleteProductMutation,
  getProductsQuery,
  getSingleProductQuery,
  updateProductMutation,
} from '../graphql/products-graphql';
import { throttleStatusQuery } from '../graphql/shop-graphql';
import { BaseModelDataGraphQl } from '../models/graphql/AbstractModelGraphQl';
import { MetafieldApidata, MetafieldModelData } from '../models/graphql/MetafieldGraphQlModel';
import { ProductApidata, ProductModelData } from '../models/graphql/ProductModel';
import { MetafieldOwnerType, MetafieldsSetInput, Node, PageInfo, ProductInput } from '../types/admin.types';
import { arrayUnique, dumpToConsole, excludeUndefinedObjectKeys, isNullish, logAdmin } from '../utils/helpers';
import { FetchRequestOptions } from './Client.types';
import { getShopifyRequestHeaders, isCodaCached, wait } from './utils/client-utils';

// #endregion

// Synctable doesn't handle retries, only GraphQLClient for simplicity
// Le seul probleme serait de dépasser le seuil de temps d'execution pour un run
// de synctable avec les temps d'attentes pour repayer le cout graphql, mais
// comme la requete graphql est elle même rapide, ça devrait passer ?

// #region Types
export interface IGraphQlCRUD {
  single(params: any): Promise<GraphQlRequestReturn<any>>;
  list(params: any): Promise<GraphQlRequestReturn<any[]>>;
  create(modelData: BaseModelDataGraphQl): Promise<GraphQlRequestReturn<any>>;
  update(modelData: BaseModelDataGraphQl): Promise<GraphQlRequestReturn<any>>;
  delete(modelData: BaseModelDataGraphQl): Promise<GraphQlRequestReturn<any>>;
}

interface GraphQlData<T extends any> {
  data: T;
  errors: any;
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
}

type GraphQlResponse<T extends any> = coda.FetchResponse<GraphQlData<T>>;

export interface GraphQlRequestReturn<T extends any> {
  body: T;
  headers: coda.FetchResponse['headers'];
  status: coda.FetchResponse['status'];
  cost: ShopifyGraphQlRequestCost;
  pageInfo?: PageInfo;
}

type TranformResponseT<T extends any> = (response: any) => T;

interface GraphQlRequestParams<T extends any, NodeT extends TadaDocumentNode> {
  documentNode: NodeT;
  variables: VariablesOf<NodeT>;
  options?: FetchRequestOptions;
  transformBodyResponse?: TranformResponseT<T>;
}

interface GraphQlClientParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}

interface BaseFindArgs {
  options?: FetchRequestOptions;
  forceAllFields?: boolean;
}
interface BaseListArgs extends BaseFindArgs {
  limit?: number;
  cursor?: string;
}
// #endregion

function withCacheDefault<T>({ options, ...args }: { options: FetchRequestOptions } & T) {
  return {
    options: {
      ...options,
      cacheTtlSecs: options?.cacheTtlSecs ?? CACHE_DEFAULT,
    },
    ...args,
  } as T;
}

// #region GraphQlApiClientBase
export class GraphQlApiClientBase {
  private static RETRY_WAIT_TIME = 1000;
  private static MAX_RETRIES = GRAPHQL_RETRIES__MAX;
  private static MAX_LIMIT = GRAPHQL_NODES_LIMIT;

  private retries = 0;

  protected readonly context: coda.ExecutionContext;
  protected readonly apiVersion: string;

  public static createInstance<T extends GraphQlApiClientBase>(
    this: new (...args: any[]) => T,
    context: coda.ExecutionContext,
    apiVersion?: string
  ) {
    return new this({ context, apiVersion });
  }

  constructor({ context, apiVersion = GRAPHQL_DEFAULT_API_VERSION }: GraphQlClientParams) {
    this.context = context;
    this.apiVersion = apiVersion;
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
  private static async repayCost(cost: ShopifyGraphQlRequestCost, throttled?: boolean) {
    const { actualQueryCost, throttleStatus } = cost;
    const { restoreRate, maximumAvailable, currentlyAvailable } = throttleStatus;

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

  private static formatUserError(userError: ShopifyGraphQlUserError): string {
    return `${userError.code ? userError.code + ': ' : ''}${userError.message}`;
  }

  private static formatError(error: ShopifyGraphQlError): string {
    return error.message;
  }

  private static formatErrorMessages(messages: Array<string>): string {
    return arrayUnique(messages.map((msg) => `• ${msg}`)).join('\n\n');
  }

  private static getPageInfo<T extends any>(body: GraphQlData<T>): PageInfo | undefined {
    for (const key in body.data) {
      const prop: any = body.data[key];
      if ('pageInfo' in prop) {
        return prop.pageInfo;
      }
    }
  }

  private static findErrorByCode<CodeT extends ShopifyGraphQlErrorCode>(errors: ShopifyGraphQlError[], code: CodeT) {
    return errors.find((error) => 'extensions' in error && error.extensions?.code === code) as
      | (CodeT extends ShopifyThrottledErrorCode ? ShopifyGraphQlThrottledError : ShopifyGraphQlMaxCostExceededError)
      | undefined;
  }

  private static findUserErrors<T extends any>(body: GraphQlData<T>) {
    let err: Array<ShopifyGraphQlUserError> = [];
    if (body.data) {
      Object.keys(body.data).forEach((key) => {
        if (body.data[key]?.userErrors) {
          err = err.concat(body.data[key].userErrors);
        }
      });
    }
    return err;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get apiUrl() {
    return `${this.context.endpoint}/admin/api/${this.apiVersion}/graphql.json`;
  }

  private getFetchRequest<NodeT extends TadaDocumentNode>(
    documentNode: NodeT,
    variables: VariablesOf<NodeT>,
    options: FetchRequestOptions
  ): coda.FetchRequest {
    let cacheTtlSecs = 0;
    let forceCache = false;

    if (options?.cacheTtlSecs !== undefined) {
      cacheTtlSecs = options.cacheTtlSecs;
      forceCache = true;
    }

    logAdmin('');
    logAdmin('—————————— GRAPHQL REQUEST CONTENT ——————————');
    logAdmin(
      documentNode.definitions
        .map((def) => {
          if ('name' in def) return `kind: ${def.kind}: ${def.name?.value}`;
        })
        .filter(Boolean)
        .join('\n')
    );
    // logAdmin(printGql(documentNode));
    dumpToConsole(variables);
    dumpToConsole(options);
    logAdmin('—————————————————————————————————————————————');
    logAdmin('');

    return {
      method: 'POST',
      url: this.apiUrl,
      headers: getShopifyRequestHeaders(this.context),
      body: JSON.stringify({
        query: printGql(documentNode),
        variables,
      }),
      cacheTtlSecs,
      forceCache,
    };
  }

  private throwOnErrors<T extends any>(response: GraphQlResponse<T>) {
    const { errors, extensions } = response.body;
    const userErrors = GraphQlApiClientBase.findUserErrors<T>(response.body);

    if (userErrors.length) {
      throw new coda.UserVisibleError(
        GraphQlApiClientBase.formatErrorMessages(userErrors.map(GraphQlApiClientBase.formatUserError))
      );
    }

    // throw new GraphQLThrottledError(
    //   {} as any,
    //   {
    //     requestedQueryCost: 2000,
    //     actualQueryCost: 1000,
    //     throttleStatus: {
    //       maximumAvailable: 2000,
    //       currentlyAvailable: 500,
    //       restoreRate: 500,
    //     },
    //   } as any
    // );

    // if (true) {
    if (errors) {
      const testShopifyGraphQlError = {
        locations: [
          {
            line: 12,
            column: 12,
          },
        ],
        message: 'test ShopifyGraphQlError',
        path: ['ath path path'],
        extensions: {
          code: 'MAX_COST_EXCEEDED',
          typeName: 'bogus',
          fieldName: 'bogus',
          cost: 5000,
          maxCost: 2000,
        },
      };
      // errors = [testShopifyGraphQlError];

      const maxCostError = GraphQlApiClientBase.findErrorByCode(errors, 'MAX_COST_EXCEEDED');
      if (maxCostError) throw new GraphQLMaxCostExceededError(maxCostError);

      const throttledError = GraphQlApiClientBase.findErrorByCode(errors, 'THROTTLED');
      if (throttledError) throw new GraphQLThrottledError(throttledError, extensions.cost);

      throw new coda.UserVisibleError(
        'GraphQL request failed: ' +
          GraphQlApiClientBase.formatErrorMessages(errors.map(GraphQlApiClientBase.formatError))
      );
    }
  }

  private adjustLimitInVariables<VariablesT extends VariablesOf<TadaDocumentNode>>(
    maxCostError: GraphQLMaxCostExceededError,
    variables: VariablesT
  ): VariablesT {
    if (!('limit' in variables)) {
      throw new InvalidValueError('variables (has no limit) when trying to adjustLimitInVariables', variables);
    }
    const { maxCost, cost } = maxCostError;
    const diminishingFactor = 0.75;
    const reducedLimit = Math.min(
      GRAPHQL_NODES_LIMIT,
      Math.max(1, Math.floor((maxCost / cost) * variables.limit * diminishingFactor))
    );

    return {
      ...variables,
      limit: reducedLimit,
    };
  }

  private async handleRetryForThrottledError<T extends any, NodeT extends TadaDocumentNode = TadaDocumentNode>(
    throttledError: GraphQLThrottledError,
    response: GraphQlResponse<T>,
    params: GraphQlRequestParams<T, NodeT>
  ) {
    const isCachedResponse = isCodaCached(response);
    // const isSyncContext = !!this.context.sync; // pas fiable

    /* Repay cost for non cached responses */
    if (!isCachedResponse) {
      await GraphQlApiClientBase.repayCost(throttledError.cost, true);
    }

    /**
     * We are doing a normal request. Retry immediately
     *
     * We could also signal the end of the sync if we are in a SyncContext, but detecting this is unreliable from my tests.
     */
    this.retries++;
    return this.request<T>(params);
  }

  private async handleRetryForMaxCostExceededError<T extends any, NodeT extends TadaDocumentNode = TadaDocumentNode>(
    maxCosterror: GraphQLMaxCostExceededError,
    params: GraphQlRequestParams<T, NodeT>
  ): Promise<GraphQlRequestReturn<T>> {
    const adjustedVariables = this.adjustLimitInVariables(maxCosterror, params.variables);
    console.log(
      `⛔️ ${maxCosterror.message} maxCost is ${maxCosterror.maxCost} while cost is ${maxCosterror.cost}. Adjusting next query to run with ${adjustedVariables.limit} max entries.`
    );
    this.retries++;
    return this.request({ ...params, variables: adjustedVariables });
  }

  public async request<T extends any, NodeT extends TadaDocumentNode = TadaDocumentNode>({
    documentNode,
    variables,
    options,
    transformBodyResponse,
  }: GraphQlRequestParams<T, NodeT>): Promise<GraphQlRequestReturn<T>> {
    const { context } = this;
    let response: GraphQlResponse<T>;

    try {
      if (this.retries > 0) {
        logAdmin(`🔄 Retrying (count: ${this.retries})...`);
        if (this.retries > GraphQlApiClientBase.MAX_RETRIES) {
          throw new coda.UserVisibleError(
            `Max retries (${GraphQlApiClientBase.MAX_RETRIES}) of GraphQL requests exceeded.`
          );
        }
      }

      response = await context.fetcher.fetch<GraphQlData<T>>(this.getFetchRequest(documentNode, variables, options));
      // console.log('——————— isCodaCached', isCodaCached(response));
      this.throwOnErrors<T>(response);

      // Always repay cost
      if (!isCodaCached(response) && response.body.extensions?.cost) {
        await GraphQlApiClientBase.repayCost(response.body.extensions.cost);
      }

      const transformedBody = transformBodyResponse ? transformBodyResponse(response.body.data) : (response.body as T);
      return {
        ...response,
        // body: transformedBody,
        body: transformedBody
          ? Array.isArray(transformedBody)
            ? (transformedBody.filter(Boolean) as T)
            : transformedBody
          : undefined,
        pageInfo: GraphQlApiClientBase.getPageInfo(response.body),
        cost: response.body.extensions.cost,
      };
    } catch (error) {
      if (error instanceof GraphQLThrottledError) {
        return this.handleRetryForThrottledError<T, NodeT>(error, response, { documentNode, variables, options });
      }

      if (error instanceof GraphQLMaxCostExceededError && variables?.limit) {
        return this.handleRetryForMaxCostExceededError<T, NodeT>(error, { documentNode, variables, options });
      }

      throw error;
    }
  }

  public async checkThrottleStatus() {
    const response = await this.request(
      withCacheDefault({
        documentNode: throttleStatusQuery,
        variables: {},
        options: { cacheTtlSecs: CACHE_DISABLED },
        transformBodyResponse: transformSingleMetafieldResponse,
      })
    );
    return response.cost.throttleStatus;
  }
}
// #endregion

// #region MetafieldClient
interface MetafieldOwnerNodeApidata extends Node {
  __typename: string;
  parentOwner: Node;
  metafields: { nodes: MetafieldApidata[] };
}

interface SingleMetafieldResponse {
  node: MetafieldApidata;
}
interface SingleMetafieldByKeyResponse {
  node: MetafieldOwnerNodeApidata;
}

type MultipleMetafieldsByOwnerTypeResponse = Record<
  SupportedGraphQlMetafieldOperation[number],
  { nodes: MetafieldOwnerNodeApidata[] }
>;
interface MultipleShopMetafieldsResponse {
  shop: MetafieldOwnerNodeApidata;
}
interface MultipleMetafieldsByOwnerIdsResponse {
  nodes: MetafieldOwnerNodeApidata[];
}

interface SetMetafieldsResponse {
  metafieldsSet: {
    owner: Omit<MetafieldOwnerNodeApidata, 'metafields'>;
    metafields: MetafieldApidata[];
  };
}

interface SingleMetafieldArgs extends BaseFindArgs {
  id: string;
}

export interface ListMetafieldsArgs extends BaseListArgs {
  metafieldKeys?: string[];
  ownerType?: SupportedMetafieldOwnerType;
  ownerIds?: string[];
}
interface ListMetafieldsBySingleOwnerArgs extends BaseFindArgs {
  metafieldKeys: string[];
  ownerId: string;
}
interface ListMetafieldsByOwnerIdsArgs extends Omit<ListMetafieldsArgs, 'ownerType'> {
  ownerIds: string[];
}
export interface ListMetafieldsByOwnerTypeArgs extends Omit<ListMetafieldsArgs, 'ownerIds'> {
  ownerType: SupportedMetafieldOwnerType;
}

function transformMetafieldOwnerNode(ownerNode: MetafieldOwnerNodeApidata): MetafieldApidata[] {
  return (
    ownerNode?.metafields?.nodes
      .map((metafield) => includeOwnerInMetafieldData(metafield, ownerNode))
      .filter(Boolean) || []
  );
}
function transformMetafieldOwnerNodes(ownerNodes: MetafieldOwnerNodeApidata[]): MetafieldApidata[] {
  return (
    ownerNodes
      .map((node) => transformMetafieldOwnerNode(node))
      .flat()
      .filter(Boolean) || []
  );
}
function includeOwnerInMetafieldData(
  metafield: MetafieldApidata,
  ownerNode: Pick<MetafieldOwnerNodeApidata, 'id' | 'parentOwner'>
): MetafieldApidata {
  const data = { ...metafield };
  if (ownerNode) {
    data.parentNode = {
      id: ownerNode.id,
      parentOwner: ownerNode.parentOwner,
    };
  }
  return data;
}

const transformSingleMetafieldResponse = (response: SingleMetafieldResponse) => response?.node;

const makeTransformSingleMetafieldsByKeyResponse = (metafieldOwnerType: MetafieldOwnerType) =>
  function (response: SingleMetafieldByKeyResponse | MultipleShopMetafieldsResponse) {
    const node =
      metafieldOwnerType === MetafieldOwnerType.Shop
        ? (response as MultipleShopMetafieldsResponse)?.shop
        : (response as SingleMetafieldByKeyResponse)?.node;
    return transformMetafieldOwnerNode(node);
  };

const makeTransformListMetafieldsByOwnerTypeResponse = (metafieldOwnerType: MetafieldOwnerType) => {
  return function (response: MultipleMetafieldsByOwnerTypeResponse | MultipleShopMetafieldsResponse) {
    if (metafieldOwnerType === MetafieldOwnerType.Shop) {
      return transformMetafieldOwnerNode((response as MultipleShopMetafieldsResponse)?.shop);
    }

    const graphQlOperation = getMetafieldsByKeysGraphQlOperation(metafieldOwnerType);
    const nodes = (response as MultipleMetafieldsByOwnerTypeResponse)[graphQlOperation]?.nodes;
    return transformMetafieldOwnerNodes(nodes);
  };
};

const transformListMetafieldsByOwnerIdsResponse = (response: MultipleMetafieldsByOwnerIdsResponse) =>
  transformMetafieldOwnerNodes(response?.nodes);

const transformSetMetafieldResponse = (response: SetMetafieldsResponse) => {
  if (response?.metafieldsSet?.metafields && response.metafieldsSet.metafields.length === 1) {
    return includeOwnerInMetafieldData(response.metafieldsSet.metafields[0], response.metafieldsSet.owner);
  }
};

export class MetafieldClient extends GraphQlApiClientBase implements IGraphQlCRUD {
  async single({ id, options }: SingleMetafieldArgs) {
    const documentNode = getSingleMetafieldQuery;
    const variables = { id } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: transformSingleMetafieldResponse,
      })
    );
  }

  async listBySingleOwnerId({ metafieldKeys = [], ownerId, options }: ListMetafieldsBySingleOwnerArgs) {
    //* Assume we query the Shop metafields when ownerId is undefined
    const isShopQuery = ownerId === undefined;
    let documentNode: TadaDocumentNode;
    let variables: any;

    if (isShopQuery) {
      documentNode = getShopMetafieldsByKeysQuery;
      variables = {
        countMetafields: metafieldKeys.length,
        metafieldKeys,
      } as VariablesOf<typeof getShopMetafieldsByKeysQuery>;
    } else {
      documentNode = getSingleNodeMetafieldsByKeyQuery;
      variables = {
        countMetafields: metafieldKeys.length,
        ownerGid: ownerId,
        metafieldKeys,
      } as VariablesOf<typeof getSingleNodeMetafieldsByKeyQuery>;
    }
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: makeTransformSingleMetafieldsByKeyResponse,
      })
    );
  }

  async listByOwnerIds({
    metafieldKeys = [],
    ownerIds,
    cursor,
    limit,
    options,
    ...otherArgs
  }: ListMetafieldsByOwnerIdsArgs) {
    return this.request<MetafieldApidata[]>(
      withCacheDefault({
        options,
        documentNode: getNodesMetafieldsByKeyQuery,
        variables: {
          limit: limit ?? GRAPHQL_NODES_LIMIT,
          cursor,
          ids: ownerIds,
          metafieldKeys,
          countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
          ...otherArgs,
        } as VariablesOf<typeof getNodesMetafieldsByKeyQuery>,
        transformBodyResponse: transformListMetafieldsByOwnerIdsResponse,
      })
    );
  }

  async listByOwnerType({
    metafieldKeys = [],
    ownerType,
    cursor,
    limit,
    options,
    ...otherArgs
  }: ListMetafieldsByOwnerTypeArgs) {
    const documentNode = getResourceMetafieldsByKeysQueryFromOwnerType(ownerType);
    const variables = {
      limit: limit ?? GRAPHQL_NODES_LIMIT,
      cursor,
      metafieldKeys,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
      ...otherArgs,
    } as VariablesOf<ReturnType<typeof getResourceMetafieldsByKeysQueryFromOwnerType>>;

    return this.request<MetafieldApidata[]>(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: makeTransformListMetafieldsByOwnerTypeResponse(ownerType),
      })
    );
  }

  async list({ ownerType, ownerIds, ...args }: ListMetafieldsArgs) {
    if (!!ownerType && !!ownerIds) {
      throw new Error('ownerType and ownerIds cannot be used together');
    }

    if (ownerType) {
      return this.listByOwnerType({ ownerType, ...args });
    }

    if (ownerIds) {
      return this.listByOwnerIds({ ownerIds, ...args });
    }

    throw new Error('ownerType or ownerIds must be provided');
  }

  // Only support setting a single metafield for now
  async set(modelData: MetafieldModelData) {
    const input = this.formatMetafieldSetInput(modelData);
    if (input) {
      const documentNode = setMetafieldsMutation;
      const variables = { inputs: [input] } as VariablesOf<typeof setMetafieldsMutation>;

      return this.request<MetafieldApidata>({
        documentNode,
        variables,
        transformBodyResponse: transformSetMetafieldResponse,
      });
    }
  }

  async create(modelData: MetafieldModelData) {
    return this.set(modelData);
  }

  async update(modelData: MetafieldModelData) {
    return this.set(modelData);
  }

  async delete(modelData: MetafieldModelData) {
    return this.request({
      documentNode: deleteMetafieldMutation,
      variables: { input: { id: modelData.id } } as VariablesOf<typeof deleteMetafieldMutation>,
    });
  }

  /**
   * Formate un objet MetafieldsSetInput pour GraphQL Admin API
   */
  private formatMetafieldSetInput(modelData: MetafieldModelData): MetafieldsSetInput | undefined {
    let input: MetafieldsSetInput = {
      type: modelData.type,
      namespace: modelData.namespace,
      key: modelData.key,
      value: modelData.value,
      ownerId: modelData.parentNode?.id,
    };
    const filteredInput = excludeUndefinedObjectKeys(input) as MetafieldsSetInput;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
}
// #endregion

// #region ProductClient
interface SingleProductResponse {
  product: ProductApidata;
}
interface MultipleProductsResponse {
  products: { nodes: ProductApidata[] };
}
interface ProductCreateResponse {
  productCreate: {
    product: ProductApidata;
  };
}
interface ProductUpdateResponse {
  productUpdate: {
    product: ProductApidata;
  };
}

interface ProductFieldsArgs {
  metafields?: boolean;
  featuredImage?: boolean;
  images?: boolean;
  options?: boolean;
}
interface SingleProductArgs extends BaseFindArgs {
  id: string;
  fields?: ProductFieldsArgs;
}
export interface ListProductsArgs extends BaseListArgs, ProductFilters {
  ids?: string[];
  limit?: number;
  fields?: ProductFieldsArgs;
  metafieldKeys?: Array<string>;
}

const transformSingleProductResponse = (response: SingleProductResponse) => response?.product;
// TODO: recursively flatten connections
const transformMultipleProductsResponse = (response: MultipleProductsResponse) => response?.products.nodes;
const transformCreateProductsResponse = (response: ProductCreateResponse) => response?.productCreate.product;
const transformUpdateProductsResponse = (response: ProductUpdateResponse) => response?.productUpdate.product;

export class ProductClient extends GraphQlApiClientBase implements IGraphQlCRUD {
  async single({ id, fields = {}, forceAllFields, options }: SingleProductArgs) {
    const documentNode = getSingleProductQuery;
    const variables = {
      id,

      // TODO: retrieve metafields ?
      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      countMetafields: 0,
      metafieldKeys: [],
      includeFeaturedImage: forceAllFields ?? fields?.featuredImage ?? true,
      includeImages: forceAllFields ?? fields?.images ?? true,
      includeOptions: forceAllFields ?? fields?.options ?? true,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: transformSingleProductResponse,
      })
    );
  }

  async list({
    fields = {},
    forceAllFields,
    metafieldKeys = [],
    search,

    // filters
    gift_card,
    ids,
    title,
    vendors,
    product_types,
    status,
    created_at_min,
    created_at_max,
    updated_at_max,
    updated_at_min,
    published_status,
    tags,

    cursor,
    limit,
    options,
    ...otherArgs
  }: ListProductsArgs) {
    const queryFilters: ProductFilters = {
      created_at_min,
      created_at_max,
      updated_at_min,
      updated_at_max,

      gift_card,
      published_status,
      title,
      status,
      vendors,
      product_types,
      ids,
      tags,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (isNullish(queryFilters[key])) delete queryFilters[key];
    });
    const searchQuery = buildProductsSearchQuery(queryFilters);

    const documentNode = getProductsQuery;
    const variables = {
      limit: limit ?? GRAPHQL_NODES_LIMIT,
      cursor,
      searchQuery,
      includeFeaturedImage: forceAllFields ?? fields?.featuredImage ?? false,
      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      includeImages: forceAllFields ?? fields?.images ?? false,
      metafieldKeys,
      countMetafields: metafieldKeys.length,
      includeOptions: forceAllFields ?? fields?.options ?? false,

      ...otherArgs,
    } as VariablesOf<typeof getProductsQuery>;

    return this.request<ProductApidata[]>(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: transformMultipleProductsResponse,
      })
    );
  }

  async create(modelData: ProductModelData) {
    const input = this.formatCreateInput(modelData);
    if (input) {
      const documentNode = createProductMutation;
      const variables = {
        productInput: input ?? {},
        includeFeaturedImage: true,
        includeOptions: true,
        metafieldKeys: [],
        includeMetafields: false,
        countMetafields: 0,
        includeImages: true,
      } as VariablesOf<typeof createProductMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: transformCreateProductsResponse,
      });
    }
  }

  async update(modelData: ProductModelData) {
    const input = this.formatUpdateInput(modelData);
    if (input) {
      const documentNode = updateProductMutation;
      const variables = {
        productInput: input ?? {},
        includeFeaturedImage: true,
        includeOptions: true,
        metafieldKeys: [],
        includeMetafields: false,
        countMetafields: 0,
        includeImages: true,
      } as VariablesOf<typeof updateProductMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: transformUpdateProductsResponse,
      });
    }
  }

  async delete(modelData: ProductModelData) {
    return this.request({
      documentNode: deleteProductMutation,
      variables: { id: modelData.id } as VariablesOf<typeof deleteProductMutation>,
    });
  }

  private formatBaseInput(modelData: ProductModelData): ProductInput | undefined {
    let input: ProductInput = {
      descriptionHtml: modelData.descriptionHtml,
      giftCard: modelData.isGiftCard,
      handle: modelData.handle,
      productType: modelData.productType,
      status: modelData.status as any,
      tags: modelData.tags,
      templateSuffix: modelData.templateSuffix,
      title: modelData.title,
      vendor: modelData.vendor,
    };
    const filteredInput = excludeUndefinedObjectKeys(input);

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  private formatCreateInput(modelData: ProductModelData): ProductInput | undefined {
    const input = {
      ...(this.formatBaseInput(modelData) ?? {}),
      productOptions: modelData.options,
      metafields: modelData.metafields.length
        ? modelData.metafields.map((metafield) => {
            const { key, namespace, type, value } = metafield.data;
            return { key, namespace, type, value };
          })
        : undefined,
    };
    const filteredInput = excludeUndefinedObjectKeys(input);
    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  // TODO: should we handle metafields here ?
  // ! NON !! Parceque c'est vraiment pas pratique quand on doit choisir si on update/delete/create un metafield !!!
  private formatUpdateInput(modelData: ProductModelData): ProductInput | undefined {
    const input = {
      ...(this.formatBaseInput(modelData) ?? {}),
      id: modelData.id,
    };
    return input;
  }
}
// #endregion
