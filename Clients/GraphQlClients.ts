// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import {
  ResultOf,
  VariablesOf,
  getKindAndOperationNames,
  graphQlGidToResourceName,
} from '../graphql/utils/graphql-utils';

import { BaseModelDataGraphQl } from '../models/graphql/AbstractModelGraphQl';
import { FileApiData, FileModelData } from '../models/graphql/FileModel';
import { LocationApiData, LocationModelData } from '../models/graphql/LocationModel';
import { MetafieldDefinitionApiData, MetafieldDefinitionModelData } from '../models/graphql/MetafieldDefinitionModel';
import {
  MetafieldApiData,
  MetafieldModelData,
  MetafieldWithDefinitionApiData,
  MetafieldWithDefinitionWithOwnerApiData,
  SupportedMetafieldOwnerName,
} from '../models/graphql/MetafieldGraphQlModel';
import {
  MetaobjectDefinitionApiData,
  MetaobjectDefinitionModelData,
} from '../models/graphql/MetaobjectDefinitionModel';
import { MetaobjectApiData, MetaobjectModelData } from '../models/graphql/MetaobjectModel';
import { OrderTransactionApiData, OrderTransactionModelData } from '../models/graphql/OrderTransactionModel';
import { ProductApidata, ProductModelData } from '../models/graphql/ProductModel';
import {
  RegisterTranslationApiData,
  TranslatableContentApiData,
  TranslatableResourceApiData,
  TranslationApiData,
  TranslationModelData,
} from '../models/graphql/TranslationModel';
import { VariantApidata, VariantModelData } from '../models/graphql/VariantModel';

import { deleteFilesMutation, getFilesQuery, getSingleFileQuery, updateFilesMutation } from '../graphql/files-graphql';
import {
  activateLocationMutation,
  deactivateLocationMutation,
  editLocationMutation,
  getLocationsQuery,
  getSingleLocationQuery,
} from '../graphql/locations-graphql';
import {
  getMetafieldDefinitionsQuery,
  getSingleMetafieldDefinitionQuery,
} from '../graphql/metafieldDefinitions-graphql';
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
  getMetaobjectDefinitionsQuery,
  getSingleMetaObjectDefinitionQuery,
  getSingleMetaobjectDefinitionByTypeQuery,
} from '../graphql/metaobjectDefinition-graphql';
import {
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  getMetaObjectsWithFieldsQuery,
  getSingleMetaObjectWithFieldsQuery,
  updateMetaObjectMutation,
} from '../graphql/metaobjects-graphql';
import { buildOrderTransactionsSearchQuery, getOrderTransactionsQuery } from '../graphql/orderTransactions-graphql';
import {
  ProductVariantFilters,
  buildProductVariantsSearchQuery,
  createProductVariantMutation,
  deleteProductVariantMutation,
  getProductVariantsQuery,
  getSingleProductVariantQuery,
  updateProductVariantMutation,
} from '../graphql/productVariants-graphql';
import {
  ProductFilters,
  buildProductsSearchQuery,
  createProductMutation,
  deleteProductMutation,
  getProductTypesQuery,
  getProductsQuery,
  getSingleProductQuery,
  updateProductMutation,
} from '../graphql/products-graphql';
import { throttleStatusQuery } from '../graphql/shop-graphql';
import {
  getAvailableLocalesQuery,
  getSingleTranslationQuery,
  getTranslatableContentKeys,
  getTranslationsQuery,
  registerTranslationMutation,
  removeTranslationsMutation,
  shopLocaleFieldsFragment,
} from '../graphql/translations-graphql';

import { InvalidValueError, UnsupportedClientOperation } from '../Errors/Errors';
import {
  GraphQLMaxCostExceededError,
  GraphQLThrottledError,
  ShopifyGraphQlError,
  ShopifyGraphQlErrorCode,
  ShopifyGraphQlMaxCostExceededError,
  ShopifyGraphQlRequestCost,
  ShopifyGraphQlThrottleStatus,
  ShopifyGraphQlThrottledError,
  ShopifyGraphQlUserError,
  ShopifyThrottledErrorCode,
} from '../Errors/GraphQlErrors';
import { GRAPHQL_BUDGET__MAX, GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from '../config';
import { CACHE_DISABLED } from '../constants/cacheDurations-constants';
import {
  DEFAULT_LEDGER_DOC_URI,
  DEFAULT_REFERENCE_DOC_URI,
  MoveReasonType,
  POSSIBLE_QUANTITY_NAMES,
  QuantityNameType,
} from '../constants/inventoryLevels-constants';
import { METAFIELD_TYPES } from '../constants/metafields-constants';
import { RestResourcesSingular } from '../constants/resourceNames-constants';
import { PREFIX_FAKE } from '../constants/strings-constants';
import { collectionTypeQuery, collectionTypesQuery } from '../graphql/collections-graphql';
import {
  adjustInventoryLevelQuantities,
  getInventoryLevelsAtLocation,
  getSingleInventoryLevelByInventoryItemQuery,
  getSingleInventoryLevelQuery,
  moveInventoryLevelQuantities,
  setInventoryLevelQuantities,
} from '../graphql/inventoryLevels-graphql';
import { getMarketsQuery } from '../graphql/markets-graphql';
import { InventoryLevelGraphQlApiData, InventoryLevelGraphQlModelData } from '../models/graphql/InventoryLevelModel';
import { MarketApidata, MarketModelData } from '../models/graphql/MarketModel';
import { SupportedMetafieldOwnerType } from '../models/graphql/MetafieldGraphQlModel';
import { graphQlOwnerNameToOwnerType } from '../models/utils/metafields-utils';
import {
  MetafieldDefinitionValidationStatus,
  MetafieldOwnerType,
  MetafieldsSetInput,
  MetaobjectCapabilityDataInput,
  MetaobjectCreateInput,
  MetaobjectUpdateInput,
  PageInfo,
  ProductInput,
  ProductVariantInput,
} from '../types/admin.types';
import { arrayUnique, dumpToConsole, excludeUndefinedObjectKeys, isNullish, logAdmin } from '../utils/helpers';
import { FetchRequestOptions } from './Client.types';
import { getShopifyRequestHeaders, isCodaCached, wait, withCacheDefault, withCacheMax } from './utils/client-utils';

// #endregion

export const GRAPHQL_NODES_LIMIT = 250;
export const GRAPHQL_DEFAULT_RESTORE_RATE = 100;
const GRAPHQL_MAX_REQUEST_METAFIELDS = 250;

// Synctable doesn't handle retries, only GraphQLClient for simplicity
// Le seul probleme serait de dépasser le seuil de temps d'execution pour un run
// de synctable avec les temps d'attentes pour repayer le cout graphql, mais
// comme la requete graphql est elle même rapide, ça devrait passer ?

// #region Types
export interface GraphQlData<T extends any> {
  data: T;
  errors?: any;
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
}

interface GraphQlResponse<T extends any> extends coda.FetchResponse<GraphQlData<T>> {}

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

interface GraphQlClientConstructorParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}

export interface BaseFindArgs {
  forceAllFields?: boolean;
  options?: FetchRequestOptions;
}
interface BaseSingleArgs extends BaseFindArgs {
  id: string;
}
interface BaseListArgs extends BaseFindArgs {
  limit?: number;
  cursor?: string;
}
// #endregion

// #region GraphQlFetcher
export class GraphQlFetcher {
  private static RETRY_WAIT_TIME = 1000;
  private static MAX_RETRIES = GRAPHQL_RETRIES__MAX;
  protected static readonly defaultLimit: number = GRAPHQL_NODES_LIMIT;

  private retries = 0;

  protected readonly context: coda.ExecutionContext;
  protected readonly apiVersion: string;

  public static createInstance<T extends GraphQlFetcher>(
    this: new (...args: any[]) => T,
    context: coda.ExecutionContext,
    apiVersion?: string
  ) {
    return new this({ context, apiVersion });
  }

  constructor({ context, apiVersion = GRAPHQL_DEFAULT_API_VERSION }: GraphQlClientConstructorParams) {
    this.context = context;
    this.apiVersion = apiVersion;
  }

  public static calcGraphQlMaxLimit({
    lastCost,
    lastLimit,
    throttleStatus,
  }: {
    lastCost: Omit<ShopifyGraphQlRequestCost, 'throttleStatus' | 'actualQueryCost'> | undefined;
    lastLimit: number | undefined;
    throttleStatus: ShopifyGraphQlThrottleStatus;
  }) {
    if (!lastLimit || !lastCost) {
      console.error(`calcSyncTableMaxLimit: No lastLimit or lastCost in prevContinuation`);
    }
    const costOneEntry = lastCost.requestedQueryCost / lastLimit;
    const maxCost = Math.min(GRAPHQL_BUDGET__MAX, throttleStatus.currentlyAvailable);
    const maxLimit = Math.floor(maxCost / costOneEntry);
    return Math.min(GRAPHQL_NODES_LIMIT, maxLimit);
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
      if (prop && 'pageInfo' in prop) {
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

  private get apiUrl() {
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
    logAdmin(getKindAndOperationNames(documentNode).join('\n'));
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
    const userErrors = GraphQlFetcher.findUserErrors<T>(response.body);

    if (userErrors.length) {
      throw new coda.UserVisibleError(
        GraphQlFetcher.formatErrorMessages(userErrors.map(GraphQlFetcher.formatUserError))
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

      const maxCostError = GraphQlFetcher.findErrorByCode(errors, 'MAX_COST_EXCEEDED');
      if (maxCostError) throw new GraphQLMaxCostExceededError(maxCostError);

      const throttledError = GraphQlFetcher.findErrorByCode(errors, 'THROTTLED');
      if (throttledError) throw new GraphQLThrottledError(throttledError, extensions.cost);

      throw new coda.UserVisibleError(
        'GraphQL request failed: ' + GraphQlFetcher.formatErrorMessages(errors.map(GraphQlFetcher.formatError))
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
    params: Required<GraphQlRequestParams<T, NodeT>>
  ) {
    const isCachedResponse = isCodaCached(response);
    // const isSyncContext = !!this.context.sync; // pas fiable

    /* Repay cost for non cached responses */
    if (!isCachedResponse) {
      await GraphQlFetcher.repayCost(throttledError.cost, true);
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
    params: Required<GraphQlRequestParams<T, NodeT>>
  ): Promise<GraphQlRequestReturn<T>> {
    const adjustedVariables = this.adjustLimitInVariables(maxCosterror, params.variables);
    console.log(
      `⛔️ ${maxCosterror.message} maxCost is ${maxCosterror.maxCost} while cost is ${maxCosterror.cost}. Adjusting next query to run with ${adjustedVariables.limit} max entries.`
    );
    this.retries++;
    return this.request({ ...params, variables: adjustedVariables });
  }

  /**====================================================================================================================
   *    Public API
   *===================================================================================================================== */
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
        if (this.retries > GraphQlFetcher.MAX_RETRIES) {
          throw new coda.UserVisibleError(`Max retries (${GraphQlFetcher.MAX_RETRIES}) of GraphQL requests exceeded.`);
        }
      }

      response = await context.fetcher.fetch<GraphQlData<T>>(this.getFetchRequest(documentNode, variables, options));
      // console.log('——————— isCodaCached', isCodaCached(response));
      this.throwOnErrors<T>(response);

      const pageInfo = GraphQlFetcher.getPageInfo(response.body);
      // Always repay cost
      if (!isCodaCached(response) && response.body.extensions?.cost) {
        // TODO: maybe don't repay cost when we reached the end of a sync table ? Because points will be replenished wile waiting for the eventual next sync to start
        // -> need to detect we are in a sync context too
        // if (!pageInfo || !pageInfo.hasNextPage) {
        await GraphQlFetcher.repayCost(response.body.extensions.cost);
        // }
      }

      const transformedBody = transformBodyResponse
        ? transformBodyResponse(response.body.data)
        : (response.body.data as T);
      return {
        ...response,
        // body: transformedBody,
        body: transformedBody
          ? Array.isArray(transformedBody)
            ? (transformedBody.filter(Boolean) as T)
            : transformedBody
          : undefined,
        pageInfo,
        cost: response.body.extensions.cost,
      };
    } catch (error) {
      if (error instanceof GraphQLThrottledError) {
        return this.handleRetryForThrottledError<T, NodeT>(error, response, {
          documentNode,
          variables,
          options,
          transformBodyResponse,
        });
      }

      if (error instanceof GraphQLMaxCostExceededError && variables?.limit) {
        return this.handleRetryForMaxCostExceededError<T, NodeT>(error, {
          documentNode,
          variables,
          options,
          transformBodyResponse,
        });
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
      })
    );
    return response.cost.throttleStatus;
  }
}
// #endregion

// #region AbstractGraphQlClient
export abstract class AbstractGraphQlClient<ModelData extends BaseModelDataGraphQl> {
  protected static readonly defaultLimit: number = GRAPHQL_NODES_LIMIT;
  protected readonly fetcher: GraphQlFetcher;

  public static createInstance<T extends AbstractGraphQlClient<any>>(
    this: new (...args: any[]) => T,
    context: coda.ExecutionContext,
    apiVersion?: string
  ) {
    return new this({ context, apiVersion });
  }

  constructor(params: GraphQlClientConstructorParams) {
    this.fetcher = new GraphQlFetcher(params);
  }

  get defaultLimit() {
    return (this.constructor as typeof AbstractGraphQlClient).defaultLimit;
  }

  public async request<T extends any, NodeT extends TadaDocumentNode = TadaDocumentNode>(
    params: GraphQlRequestParams<T, NodeT>
  ) {
    return this.fetcher.request(params);
  }

  /**====================================================================================================================
   *    Public API
   *===================================================================================================================== */
  async single(params: BaseSingleArgs): Promise<GraphQlRequestReturn<ModelData>> {
    throw new UnsupportedClientOperation('single');
  }
  async list(params: BaseListArgs): Promise<GraphQlRequestReturn<ModelData[]>> {
    throw new UnsupportedClientOperation('list', this.constructor.name);
  }
  /**
   * Permet de lister toutes les ressources en suivant la pagination,
   * sans passer par une Sync Table
   */
  async listAllLoop({ options, limit, ...otherArgs }: BaseListArgs & { [key: string]: any }) {
    let items: ModelData[] = [];
    let nextCursor: string;
    let response: GraphQlRequestReturn<ModelData[]>;

    while (true) {
      response = await this.list({
        cursor: nextCursor,
        limit,
        options,
        ...otherArgs,
      });
      const { pageInfo } = response;

      items = [...items, ...response.body];
      nextCursor = pageInfo?.hasNextPage ? pageInfo.endCursor : undefined;
      if (nextCursor === undefined) break;
    }

    return items;
  }
  async create(modelData: ModelData): Promise<GraphQlRequestReturn<ModelData>> {
    throw new UnsupportedClientOperation('create', this.constructor.name);
  }
  async update(modelData: ModelData): Promise<GraphQlRequestReturn<ModelData>> {
    throw new UnsupportedClientOperation('update', this.constructor.name);
  }
  async delete(modelData: ModelData): Promise<GraphQlRequestReturn<any>> {
    throw new UnsupportedClientOperation('delete', this.constructor.name);
  }
}
// #endregion

// #region CollectionClient
interface SingleCollectionTypeResponse {
  collection: {
    isSmartCollection?: {
      appliedDisjunctively: boolean;
    };
  };
}
interface MultipleCollectionTypesResponse {
  nodes: {
    id: string;
    __typename: string;
    isSmartCollection?: {
      appliedDisjunctively: boolean;
    };
  }[];
}

interface SingleCollectionTypeArgs extends BaseSingleArgs {}
interface MultipleCollectionTypeArgs extends BaseFindArgs {
  ids: string[];
}

export class CollectionClient extends AbstractGraphQlClient<any> {
  async collectionType({ id, options }: SingleCollectionTypeArgs) {
    const documentNode = collectionTypeQuery;
    const variables = {
      collectionGid: id,
    } as VariablesOf<typeof documentNode>;
    const response = await this.request(
      withCacheMax({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: SingleCollectionTypeResponse) =>
          response.collection.isSmartCollection
            ? RestResourcesSingular.SmartCollection
            : RestResourcesSingular.CustomCollection,
      })
    );
    return response.body;
  }

  async collectionTypes({ ids, options }: MultipleCollectionTypeArgs) {
    const documentNode = collectionTypesQuery;
    const variables = {
      ids,
    } as VariablesOf<typeof documentNode>;
    const response = await this.request(
      withCacheMax({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleCollectionTypesResponse) =>
          response?.nodes
            .map((node) => {
              if (node.__typename === 'Collection') {
                return {
                  id: node.id,
                  type: node.isSmartCollection
                    ? RestResourcesSingular.SmartCollection
                    : RestResourcesSingular.CustomCollection,
                };
              }
            })
            .filter(Boolean),
      })
    );

    return response.body;
  }
}
// #endregion

// #region FileClient
interface SingleFileResponse {
  node: FileApiData;
}
interface MultipleFilesResponse {
  files: { nodes: FileApiData[] };
}
interface FileUpdateResponse {
  fileUpdate: {
    files: FileApiData[];
  };
}

interface FileFieldsArgs {
  alt?: boolean;
  createdAt?: boolean;
  duration?: boolean;
  fileSize?: boolean;
  height?: boolean;
  mimeType?: boolean;
  preview?: boolean;
  updatedAt?: boolean;
  url?: boolean;
  width?: boolean;
}
interface SingleFileArgs extends BaseSingleArgs {
  fields?: FileFieldsArgs;
}
export interface ListFilesArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  type?: string;
  fields?: FileFieldsArgs;
}

export class FileClient extends AbstractGraphQlClient<FileModelData> {
  async single({ id, fields = {}, forceAllFields, options }: SingleFileArgs) {
    const documentNode = getSingleFileQuery;
    const variables = {
      id,

      includeAlt: forceAllFields ?? fields?.alt ?? true,
      includeCreatedAt: forceAllFields ?? fields?.createdAt ?? true,
      includeDuration: forceAllFields ?? fields?.duration ?? true,
      includeFileSize: forceAllFields ?? fields?.fileSize ?? true,
      includeHeight: forceAllFields ?? fields?.height ?? true,
      includeMimeType: forceAllFields ?? fields?.mimeType ?? true,
      includePreview: forceAllFields ?? fields?.preview ?? true,
      includeUpdatedAt: forceAllFields ?? fields?.updatedAt ?? true,
      includeUrl: forceAllFields ?? fields?.url ?? true,
      includeWidth: forceAllFields ?? fields?.width ?? true,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: SingleFileResponse) => response?.node as FileModelData,
      })
    );
  }

  async list({ fields = {}, forceAllFields, type, cursor, limit, options }: ListFilesArgs) {
    let searchQuery = 'status:READY';
    if (type && type !== '') {
      searchQuery += ` AND media_type:${type}`;
    }

    const documentNode = getFilesQuery;
    const variables = {
      limit: limit ?? FileClient.defaultLimit,
      cursor,
      searchQuery,

      includeAlt: forceAllFields ?? fields?.alt ?? true,
      includeCreatedAt: forceAllFields ?? fields?.createdAt ?? true,
      includeDuration: forceAllFields ?? fields?.duration ?? true,
      includeFileSize: forceAllFields ?? fields?.fileSize ?? true,
      includeHeight: forceAllFields ?? fields?.height ?? true,
      includeMimeType: forceAllFields ?? fields?.mimeType ?? true,
      includePreview: forceAllFields ?? fields?.preview ?? true,
      includeUpdatedAt: forceAllFields ?? fields?.updatedAt ?? true,
      includeUrl: forceAllFields ?? fields?.url ?? true,
      includeWidth: forceAllFields ?? fields?.width ?? true,
    } as VariablesOf<typeof getFilesQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleFilesResponse) => response?.files.nodes as FileModelData[],
      })
    );
  }

  async update(modelData: FileModelData) {
    const input = this.formatUpdateInput(modelData);
    if (input) {
      const documentNode = updateFilesMutation;
      const variables = {
        files: [input],
        includeAlt: true,
        includeCreatedAt: true,
        includeDuration: true,
        includeFileSize: true,
        includeHeight: true,
        includeMimeType: true,
        includePreview: true,
        includeUpdatedAt: true,
        includeUrl: true,
        includeWidth: true,
      } as VariablesOf<typeof updateFilesMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: FileUpdateResponse) =>
          response?.fileUpdate.files.length ? (response?.fileUpdate.files[0] as FileModelData) : undefined,
      });
    }
  }

  async delete(modelData: Pick<FileModelData, 'id'>) {
    return this.request({
      documentNode: deleteFilesMutation,
      variables: { fileIds: [modelData.id] } as VariablesOf<typeof deleteFilesMutation>,
    });
  }

  private formatUpdateInput(modelData: FileModelData) {
    const input: VariablesOf<typeof updateFilesMutation>['files'][number] = {
      id: modelData.id,
      filename: modelData.filename,
      alt: modelData.alt ?? '',
    };
    const filteredInput = excludeUndefinedObjectKeys(input) as typeof input;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
}
// #endregion

// #region InventoryLevelClient
interface SingleInventoryLevelResponse extends ResultOf<typeof getSingleInventoryLevelQuery> {}
interface SingleInventoryLevelByInventoryItemResponse
  extends ResultOf<typeof getSingleInventoryLevelByInventoryItemQuery> {}

interface MultipleInventoryLevelsResponse {
  location: { inventoryLevels: { nodes: InventoryLevelGraphQlApiData[] } };
}

interface InventorySetQuantitiesResponse extends ResultOf<typeof setInventoryLevelQuantities> {}
interface InventoryAdjustQuantitiesResponse extends ResultOf<typeof adjustInventoryLevelQuantities> {}
interface InventoryMoveQuantitiesResponse extends ResultOf<typeof moveInventoryLevelQuantities> {}

export interface InventoryLevelFieldsArgs {
  inventory_item?: boolean;
  variant?: boolean;
}
interface SingleInventoryLevelArgs extends Omit<BaseSingleArgs, 'id'> {
  id?: string;
  quantitiesNames?: QuantityNameType[];
  inventoryItemId?: string;
  locationId?: string;
}

export interface ListInventoryLevelsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  locationId: string;
  fields?: InventoryLevelFieldsArgs;
  quantitiesNames?: QuantityNameType[];
}

interface MoveInventoryLevelsFromTo {
  locationId: string;
  name: QuantityNameType;
  ledgerDocumentUri?: string;
}
export interface SetInventoryLevelsArgs {
  id?: string;
  inventoryItemId?: string;
  locationId?: string;
  reason: MoveReasonType;
  quantities: InventoryLevelGraphQlModelData['quantities'];
  referenceDocumentUri: string;
}
export interface AdjustInventoryLevelsArgs {
  id?: string;
  inventoryItemId?: string;
  locationId?: string;
  reason: MoveReasonType;
  delta: number;
  quantityName: QuantityNameType;
  referenceDocumentUri: string;
  ledgerDocumentUri: string;
}
export interface MoveInventoryLevelsArgs {
  inventoryItemId: string;
  reason: MoveReasonType;
  quantity: number;
  referenceDocumentUri: string;
  from: MoveInventoryLevelsFromTo;
  to: MoveInventoryLevelsFromTo;
}

export class InventoryLevelClient extends AbstractGraphQlClient<InventoryLevelGraphQlModelData> {
  async single({ id, inventoryItemId, locationId, quantitiesNames = [], options }: SingleInventoryLevelArgs) {
    if (id) {
      const documentNode = getSingleInventoryLevelQuery;
      const variables = {
        id,
        quantitiesNames,
        includeInventoryItem: true,
        includeLocation: true,
        includeVariant: true,
      } as VariablesOf<typeof documentNode>;
      return this.request(
        withCacheDefault({
          options,
          documentNode,
          variables,
          transformBodyResponse: (response: SingleInventoryLevelResponse) => {
            const { location, ...node } = response?.inventoryLevel;
            return {
              locationId: location?.id,
              ...node,
            } as InventoryLevelGraphQlModelData;
          },
        })
      );
    } else if (inventoryItemId && locationId) {
      const documentNode = getSingleInventoryLevelByInventoryItemQuery;
      const variables = {
        inventoryItemId,
        locationId,
        quantitiesNames,
        includeInventoryItem: true,
        includeLocation: true,
        includeVariant: true,
      } as VariablesOf<typeof documentNode>;
      return this.request(
        withCacheDefault({
          options,
          documentNode,
          variables,
          transformBodyResponse: (response: SingleInventoryLevelByInventoryItemResponse) => {
            const { location, ...node } = response?.inventoryItem?.inventoryLevel;
            return {
              locationId: location?.id,
              ...node,
            } as InventoryLevelGraphQlModelData;
          },
        })
      );
    }

    throw new Error('id or inventoryItemId and locationId must be provided');
  }
  async singleLatestData({
    id,
    inventoryItemId,
    locationId,
  }: Pick<SingleInventoryLevelArgs, 'id' | 'inventoryItemId' | 'locationId'>) {
    return this.single({
      id,
      inventoryItemId,
      locationId,
      quantitiesNames: POSSIBLE_QUANTITY_NAMES,
      options: { cacheTtlSecs: CACHE_DISABLED },
    });
  }

  async list({
    fields = {},
    locationId,
    quantitiesNames = [],
    forceAllFields,
    cursor,
    limit,
    options,
  }: ListInventoryLevelsArgs) {
    let searchQuery = '';

    const documentNode = getInventoryLevelsAtLocation;
    const variables = {
      limit: limit ?? InventoryLevelClient.defaultLimit,
      cursor,
      quantitiesNames,
      includeInventoryItem: forceAllFields ?? fields?.inventory_item ?? false,
      includeVariant: forceAllFields ?? fields?.variant ?? true,
      includeLocation: false,
      locationId,
    } as VariablesOf<typeof getInventoryLevelsAtLocation>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleInventoryLevelsResponse) => {
          return response?.location?.inventoryLevels?.nodes.map((n) => {
            return {
              locationId,
              ...n,
            } as InventoryLevelGraphQlModelData;
          });
        },
      })
    );
  }

  async set({
    reason = 'correction',
    id,
    inventoryItemId,
    locationId,
    quantities,
    referenceDocumentUri,
  }: SetInventoryLevelsArgs) {
    if (quantities.length > 1) {
      throw new coda.UserVisibleError('Can only set one inventory level quantity at a time');
    }

    const latestData = (
      await this.singleLatestData({
        id,
        inventoryItemId,
        locationId,
      })
    ).body;
    const latestQuantities = latestData.quantities;
    const updatedQuantity = quantities[0];

    const documentNode = setInventoryLevelQuantities;
    const variables = {
      input: {
        name: updatedQuantity.name,
        reason,
        referenceDocumentUri: referenceDocumentUri ?? DEFAULT_REFERENCE_DOC_URI,
        quantities: [
          {
            inventoryItemId: latestData.item.id,
            locationId: latestData.locationId,
            quantity: updatedQuantity.quantity,
            compareQuantity: latestQuantities.find((q) => q.name === updatedQuantity.name).quantity,
          },
        ],
      },
    } as VariablesOf<typeof documentNode>;

    // No race condition here, since we have compareQuantity set, we can be confident in the delta result
    return this.request({
      documentNode,
      variables,
      transformBodyResponse: (response: InventorySetQuantitiesResponse) => {
        const data = { ...latestData };
        const changes = response?.inventorySetQuantities?.inventoryAdjustmentGroup?.changes ?? [];

        // no changes
        if (changes.length === 0) return data;

        data.quantities = changes.map((c) => {
          return {
            name: c.name,
            quantity: latestQuantities.find((q) => q.name === c.name).quantity + c.delta,
          };
        });
        return data;
      },
    });
  }

  async adjust({
    reason = 'correction',
    id,
    inventoryItemId,
    locationId,
    delta,
    quantityName,
    referenceDocumentUri,
    ledgerDocumentUri,
  }: AdjustInventoryLevelsArgs) {
    const latestData = (
      await this.singleLatestData({
        id,
        inventoryItemId,
        locationId,
      })
    ).body;
    const latestQuantities = latestData.quantities;

    const documentNode = adjustInventoryLevelQuantities;
    const variables = {
      input: {
        name: quantityName,
        reason,
        referenceDocumentUri: referenceDocumentUri ?? DEFAULT_REFERENCE_DOC_URI,
        changes: [
          {
            delta,
            inventoryItemId,
            locationId,
            ledgerDocumentUri: ledgerDocumentUri ?? DEFAULT_LEDGER_DOC_URI,
          },
        ],
      },
    } as VariablesOf<typeof documentNode>;

    if (quantityName === 'available') {
      delete variables.input.changes[0].ledgerDocumentUri;
    }

    // FIXME
    // TODO: Beware race condition ! There could be a mutation after the query and before the mutation !!
    // we could query inventoryAdjustmentGroup node after the mutation but there is an unknown delay before the inventory adjustment is taken into account.
    return this.request({
      documentNode,
      variables,
      transformBodyResponse: (response: InventoryAdjustQuantitiesResponse) => {
        const data = { ...latestData };
        const changes = response?.inventoryAdjustQuantities?.inventoryAdjustmentGroup?.changes ?? [];

        // no changes
        if (changes.length === 0) return data;

        data.quantities = changes.map((c) => {
          return {
            name: c.name,
            quantity: latestQuantities.find((q) => q.name === c.name).quantity + c.delta,
          };
        });
        return data;
      },
    });
  }

  async move({
    inventoryItemId,
    reason = 'correction',
    quantity,
    from,
    to,
    referenceDocumentUri,
  }: MoveInventoryLevelsArgs) {
    const latestData = (await this.singleLatestData({ inventoryItemId, locationId: from.locationId })).body;

    function processFromToArgs(fromToArg: MoveInventoryLevelsFromTo) {
      const { ledgerDocumentUri, ...rest } = fromToArg;
      let processed: MoveInventoryLevelsFromTo = rest;
      if (fromToArg.name !== 'available') {
        processed.ledgerDocumentUri = fromToArg.ledgerDocumentUri ?? DEFAULT_LEDGER_DOC_URI;
      }
      return processed;
    }

    const fromArgs = processFromToArgs(from);
    const toArgs = processFromToArgs(to);

    const documentNode = moveInventoryLevelQuantities;
    const variables = {
      input: {
        reason,
        referenceDocumentUri: referenceDocumentUri ?? DEFAULT_REFERENCE_DOC_URI,
        changes: [
          {
            inventoryItemId,
            quantity,
            from: fromArgs,
            to: toArgs,
          },
        ],
      },
    } as VariablesOf<typeof documentNode>;

    // FIXME
    // TODO: Beware race condition ! There could be a mutation after the query and before the mutation !!
    // we could query inventoryAdjustmentGroup node after the mutation but there is an unknown delay before the inventory adjustment is taken into account.
    return this.request({
      documentNode,
      variables,
      transformBodyResponse: (response: InventoryMoveQuantitiesResponse) => {
        const data = { ...latestData };
        const changes = response?.inventoryMoveQuantities?.inventoryAdjustmentGroup?.changes ?? [];

        // no changes
        if (changes.length === 0) return data;

        data.quantities = changes.map((c) => {
          return {
            name: c.name,
            quantity: latestData.quantities.find((q) => q.name === c.name).quantity + c.delta,
          };
        });
        return data;
      },
    });
  }
}
// #endregion

// #region LocationClient
interface SingleLocationResponse {
  location: LocationApiData;
}
interface MultipleLocationsResponse {
  locations: { nodes: LocationApiData[] };
}
interface LocationUpdateResponse {
  locationEdit: {
    location: LocationApiData;
  };
}
interface LocationActivateResponse {
  locationActivate: {
    location: LocationApiData;
  };
}
interface LocationDeActivateResponse {
  locationDeactivate: {
    location: LocationApiData;
  };
}

export interface LocationFieldsArgs {
  metafields?: boolean;
  fulfillment_service?: boolean;
  local_pickup_settings?: boolean;
}
interface SingleLocationArgs extends BaseSingleArgs {
  fields?: LocationFieldsArgs;
}
export interface ListLocationsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  fields?: LocationFieldsArgs;
  metafieldKeys?: Array<string>;
}

export class LocationClient extends AbstractGraphQlClient<LocationModelData> {
  async single({ id, fields = {}, forceAllFields, options }: SingleLocationArgs) {
    const documentNode = getSingleLocationQuery;
    const variables = {
      id,

      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      includeFulfillmentService: forceAllFields ?? fields?.fulfillment_service ?? true,
      includeLocalPickupSettings: forceAllFields ?? fields?.local_pickup_settings ?? true,
      countMetafields: 0,
      metafieldKeys: [],
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: SingleLocationResponse) => response?.location as unknown as LocationModelData,
      })
    );
  }

  async list({ fields = {}, metafieldKeys = [], forceAllFields, cursor, limit, options }: ListLocationsArgs) {
    let searchQuery = '';

    const documentNode = getLocationsQuery;
    const variables = {
      limit: limit ?? LocationClient.defaultLimit,
      cursor,
      searchQuery,

      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      includeFulfillmentService: forceAllFields ?? fields?.fulfillment_service ?? true,
      includeLocalPickupSettings: forceAllFields ?? fields?.local_pickup_settings ?? true,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
      metafieldKeys,
    } as VariablesOf<typeof getLocationsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleLocationsResponse) =>
          response?.locations.nodes as unknown as LocationModelData[],
      })
    );
  }

  async update(modelData: LocationModelData) {
    const input = this.formatUpdateInput(modelData);
    if (input) {
      const documentNode = editLocationMutation;
      const variables = {
        id: modelData.id,
        input,

        includeMetafields: false,
        includeLocalPickupSettings: false,
        includeFulfillmentService: false,
      } as VariablesOf<typeof editLocationMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: LocationUpdateResponse) =>
          response?.locationEdit?.location as unknown as LocationModelData,
      });
    }
  }

  async activate(id: string) {
    return this.request({
      documentNode: activateLocationMutation,
      variables: { locationId: id } as VariablesOf<typeof activateLocationMutation>,
      transformBodyResponse: (response: LocationActivateResponse) =>
        response?.locationActivate?.location as unknown as LocationModelData,
    });
  }

  async deActivate(locationId: string, destinationLocationId?: string) {
    return this.request({
      documentNode: deactivateLocationMutation,
      variables: {
        locationId,
        destinationLocationId,
      } as VariablesOf<typeof deactivateLocationMutation>,
      transformBodyResponse: (response: LocationDeActivateResponse) =>
        response?.locationDeactivate?.location as unknown as LocationModelData,
    });
  }

  private formatUpdateInput(modelData: LocationModelData) {
    const input: VariablesOf<typeof editLocationMutation>['input'] = {
      name: modelData.name,
      address: modelData.address as VariablesOf<typeof editLocationMutation>['input']['address'],
    };
    const filteredInput = excludeUndefinedObjectKeys({
      ...input,
      address: input.address ? excludeUndefinedObjectKeys(input.address) : undefined,
    });

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
}
// #endregion

// #region MarketClient
interface SingleMarketResponse {
  market: MarketApidata;
}
interface MultipleMarketsResponse {
  markets: { nodes: MarketApidata[] };
}

interface SingleMarketArgs extends BaseSingleArgs {}

export interface ListMarketsArgs extends BaseListArgs {}

export class MarketClient extends AbstractGraphQlClient<MarketModelData> {
  async list({ forceAllFields, cursor, limit, options }: ListMarketsArgs) {
    const documentNode = getMarketsQuery;
    const variables = {
      limit: limit ?? ProductClient.defaultLimit,
      cursor,
    } as VariablesOf<typeof getMarketsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleMarketsResponse) =>
          response?.markets.nodes as unknown as MarketModelData[],
      })
    );
  }
}
// #endregion

// #region MetafieldClient
interface MetafieldOwnerNodeApidata {
  __typename: string;
  id: string;
  parentOwner?: {
    id: string;
  };
}

interface MetafieldOwnerNodeWithMetafieldsApidata extends MetafieldOwnerNodeApidata {
  metafields: { nodes: MetafieldWithDefinitionApiData[] };
}

interface SingleMetafieldResponse {
  node: MetafieldWithDefinitionWithOwnerApiData;
}
export interface SingleMetafieldByKeyResponse {
  node: MetafieldOwnerNodeWithMetafieldsApidata;
}

type MultipleMetafieldsByOwnerTypeResponse = Record<
  SupportedGraphQlMetafieldOperation[number],
  { nodes: MetafieldOwnerNodeWithMetafieldsApidata[] }
>;
interface MultipleShopMetafieldsResponse {
  shop: MetafieldOwnerNodeWithMetafieldsApidata;
}
interface MultipleMetafieldsByOwnerIdsResponse {
  nodes: MetafieldOwnerNodeWithMetafieldsApidata[];
}

interface SetMetafieldsResponse {
  metafieldsSet: {
    metafields: MetafieldWithDefinitionWithOwnerApiData[];
  };
}

interface SingleMetafieldArgs extends BaseSingleArgs {}

export interface ListMetafieldsArgs extends BaseListArgs {
  metafieldKeys?: string[];
  ownerType?: SupportedMetafieldOwnerType;
  ownerIds?: string[];
}
interface ListMetafieldsBySingleOwnerArgs extends Omit<BaseSingleArgs, 'id'> {
  metafieldKeys: string[];
  ownerGid: string;
}
interface ListMetafieldsByOwnerIdsArgs extends Omit<ListMetafieldsArgs, 'ownerType'> {
  ownerIds: string[];
}
export interface ListMetafieldsByOwnerTypeArgs extends Omit<ListMetafieldsArgs, 'ownerIds'> {
  ownerType: SupportedMetafieldOwnerType;
}

function transformMetafieldOwnerNode(ownerNode: MetafieldOwnerNodeWithMetafieldsApidata) {
  return (
    ownerNode?.metafields?.nodes
      .map((metafield) => includeOwnerInMetafieldData(metafield, ownerNode))
      .filter(Boolean) || []
  );
}
function transformMetafieldOwnerNodes(ownerNodes: MetafieldOwnerNodeWithMetafieldsApidata[]) {
  return (
    ownerNodes
      .map((node) => transformMetafieldOwnerNode(node))
      .flat()
      .filter(Boolean) || []
  );
}

function includeOwnerInMetafieldData(
  metafield: Omit<MetafieldApiData, 'owner'>,
  ownerNode: Partial<Pick<MetafieldOwnerNodeWithMetafieldsApidata, 'id' | 'parentOwner' | '__typename'>>
): MetafieldModelData {
  const data = { ...metafield } as MetafieldModelData;
  if (ownerNode) {
    data.parentNode = {
      id: ownerNode.id,
      parentOwner: ownerNode.parentOwner,
    };
  }
  return data;
}

export class MetafieldClient extends AbstractGraphQlClient<MetafieldModelData> {
  async single({ id, options }: SingleMetafieldArgs) {
    const documentNode = getSingleMetafieldQuery;
    const variables = { id } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: SingleMetafieldResponse) =>
          includeOwnerInMetafieldData(response.node, response.node.owner as MetafieldOwnerNodeWithMetafieldsApidata),
      })
    );
  }

  async listBySingleOwnerId({ metafieldKeys = [], ownerGid, options }: ListMetafieldsBySingleOwnerArgs) {
    const graphQlResourceName = graphQlGidToResourceName(ownerGid);
    //* Assume we query the Shop metafields when graphQlResourceName is undefined
    const ownerType = graphQlResourceName
      ? graphQlOwnerNameToOwnerType(graphQlResourceName as SupportedMetafieldOwnerName)
      : MetafieldOwnerType.Shop;

    const isShopQuery = ownerType === MetafieldOwnerType.Shop;
    let documentNode: TadaDocumentNode;
    let variables: any;

    if (isShopQuery) {
      documentNode = getShopMetafieldsByKeysQuery;
      variables = {
        countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
        metafieldKeys,
      } as VariablesOf<typeof getShopMetafieldsByKeysQuery>;
    } else {
      documentNode = getSingleNodeMetafieldsByKeyQuery;
      variables = {
        countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
        ownerGid: ownerGid,
        metafieldKeys,
      } as VariablesOf<typeof getSingleNodeMetafieldsByKeyQuery>;
    }
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: function (response: SingleMetafieldByKeyResponse | MultipleShopMetafieldsResponse) {
          const node =
            ownerType === MetafieldOwnerType.Shop
              ? (response as MultipleShopMetafieldsResponse)?.shop
              : (response as SingleMetafieldByKeyResponse)?.node;
          return transformMetafieldOwnerNode(node);
        },
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
    return this.request(
      withCacheDefault({
        options,
        documentNode: getNodesMetafieldsByKeyQuery,
        variables: {
          limit: limit ?? MetafieldClient.defaultLimit,
          cursor,
          ids: ownerIds,
          metafieldKeys,
          countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
          ...otherArgs,
        } as VariablesOf<typeof getNodesMetafieldsByKeyQuery>,
        transformBodyResponse: (response: MultipleMetafieldsByOwnerIdsResponse) =>
          transformMetafieldOwnerNodes(response?.nodes),
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
      limit: limit ?? MetafieldClient.defaultLimit,
      cursor,
      metafieldKeys,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
      ...otherArgs,
    } as VariablesOf<ReturnType<typeof getResourceMetafieldsByKeysQueryFromOwnerType>>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: function (
          response: MultipleMetafieldsByOwnerTypeResponse | MultipleShopMetafieldsResponse
        ) {
          if (ownerType === MetafieldOwnerType.Shop) {
            return transformMetafieldOwnerNode((response as MultipleShopMetafieldsResponse)?.shop);
          }

          const graphQlOperation = getMetafieldsByKeysGraphQlOperation(ownerType);
          const nodes = (response as MultipleMetafieldsByOwnerTypeResponse)[graphQlOperation]?.nodes;
          return transformMetafieldOwnerNodes(nodes);
        },
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

      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: SetMetafieldsResponse) => {
          if (response?.metafieldsSet?.metafields && response.metafieldsSet.metafields.length === 1) {
            return includeOwnerInMetafieldData(
              response.metafieldsSet.metafields[0],
              response.metafieldsSet.metafields[0].owner
            );
          }
        },
      });
    }
  }

  async create(modelData: MetafieldModelData) {
    return this.set(modelData);
  }

  async update(modelData: MetafieldModelData) {
    return this.set(modelData);
  }

  async delete(modelData: Pick<MetafieldModelData, 'id'>) {
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

// #region MetafieldDefinitionClient
interface SingleMetafieldDefinitionData {
  metafieldDefinition: MetafieldDefinitionApiData;
}
interface MultipleMetafieldDefinitionsData {
  metafieldDefinitions: { nodes: MetafieldDefinitionApiData[] };
}

interface SingleMetafieldDefinitionArgs extends BaseSingleArgs {}
export interface ListMetafieldDefinitionsArgs extends Omit<BaseListArgs, 'forceAllFields'> {
  ownerType: MetafieldOwnerType;
  limit?: number;
  cursor?: string;
}
interface ListMetafieldDefinitionsForOwnerArgs extends BaseListArgs {
  ownerType: MetafieldOwnerType;
  includeFakeExtraDefinitions?: boolean;
}

interface FakeMetafieldDefinition extends Omit<MetafieldDefinitionModelData, 'ownerType'> {}

function wrapFakeMetafieldDefinition(
  fake: FakeMetafieldDefinition,
  ownerType: MetafieldOwnerType
): MetafieldDefinitionModelData {
  return {
    ...fake,
    // @ts-expect-error
    ownerType,
  };
}

const FAKE_METADEFINITION__SEO_DESCRIPTION: FakeMetafieldDefinition = {
  id: `${PREFIX_FAKE}SEO_DESCRIPTION_ID`,
  name: 'SEO Description',
  namespace: 'global',
  key: 'description_tag',
  type: {
    name: METAFIELD_TYPES.single_line_text_field,
  },
  description: 'The meta description.',
  validations: [],
  metafieldsCount: 0,
  pinnedPosition: 1000,
  validationStatus: MetafieldDefinitionValidationStatus.AllValid,
  visibleToStorefrontApi: true,
};

const FAKE_METADEFINITION__SEO_TITLE: FakeMetafieldDefinition = {
  id: `${PREFIX_FAKE}SEO_TITLE_ID`,
  name: 'SEO Title',
  namespace: 'global',
  key: 'title_tag',
  type: {
    name: METAFIELD_TYPES.single_line_text_field,
  },
  description: 'The meta title.',
  validations: [],
  metafieldsCount: 0,
  pinnedPosition: 1001,
  validationStatus: MetafieldDefinitionValidationStatus.AllValid,
  visibleToStorefrontApi: true,
};

export class MetafieldDefinitionClient extends AbstractGraphQlClient<MetafieldDefinitionModelData> {
  protected static readonly defaultLimit = 50;

  async single({ id, options }: SingleMetafieldDefinitionArgs) {
    const documentNode = getSingleMetafieldDefinitionQuery;
    const variables = { id } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (data: SingleMetafieldDefinitionData) =>
          data?.metafieldDefinition as MetafieldDefinitionModelData,
      })
    );
  }

  async list({ ownerType = null, cursor, limit, options }: ListMetafieldDefinitionsArgs) {
    const documentNode = getMetafieldDefinitionsQuery;
    const variables = {
      limit: limit ?? MetafieldDefinitionClient.defaultLimit,
      cursor,
      ownerType,
    } as VariablesOf<typeof getMetafieldDefinitionsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (data: MultipleMetafieldDefinitionsData) =>
          data?.metafieldDefinitions.nodes as unknown as MetafieldDefinitionModelData[],
      })
    );
  }

  async listForOwner({
    ownerType = null,
    includeFakeExtraDefinitions = true,
    options,
  }: ListMetafieldDefinitionsForOwnerArgs) {
    let data = await this.listAllLoop({
      ownerType: ownerType,
      limit: 200,
      options,
    });

    /* Add 'Fake' metafield definitions for SEO metafields */
    if (includeFakeExtraDefinitions && this.shouldIncludeFakeExtraDefinitions(ownerType)) {
      data = [
        ...data,
        wrapFakeMetafieldDefinition(FAKE_METADEFINITION__SEO_DESCRIPTION, ownerType),
        wrapFakeMetafieldDefinition(FAKE_METADEFINITION__SEO_TITLE, ownerType),
      ];
    }
    return data;
  }

  private shouldIncludeFakeExtraDefinitions(ownerType: MetafieldOwnerType) {
    return [
      MetafieldOwnerType.Article,
      MetafieldOwnerType.Blog,
      MetafieldOwnerType.Collection,
      MetafieldOwnerType.Page,
      MetafieldOwnerType.Product,
    ].includes(ownerType);
  }
}
// #endregion

// #region MetaobjectClient
interface SingleMetaobjectResponse {
  metaobject: MetaobjectApiData;
}
interface MultipleMetaobjectsResponse {
  metaobjects: { nodes: MetaobjectApiData[] };
}
interface MetaobjectCreateResponse {
  metaobjectCreate: {
    metaobject: MetaobjectApiData;
  };
}
interface MetaobjectUpdateResponse {
  metaobjectUpdate: {
    metaobject: MetaobjectApiData;
  };
}

export interface MetaobjectFieldsArgs {
  capabilities?: boolean;
  definition?: boolean;
  fieldDefinitions?: boolean;
}
interface SingleMetaobjectArgs extends BaseSingleArgs {
  fields?: MetaobjectFieldsArgs;
  metafieldKeys?: string[];
}
export interface ListMetaobjectsArgs extends BaseListArgs {
  type: string;
  limit?: number;
  cursor?: string;
  fields?: MetaobjectFieldsArgs;
}

export class MetaobjectClient extends AbstractGraphQlClient<MetaobjectModelData> {
  protected static readonly defaultLimit = 50;

  async single({ id, fields = {}, forceAllFields, options }: SingleMetaobjectArgs) {
    const documentNode = getSingleMetaObjectWithFieldsQuery;
    const variables = {
      id,
      includeCapabilities: forceAllFields ?? fields?.capabilities ?? false,
      includeDefinition: forceAllFields ?? fields?.definition ?? false,
      includeFieldDefinitions: forceAllFields ?? fields?.fieldDefinitions ?? false,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: SingleMetaobjectResponse) => response?.metaobject as MetaobjectModelData,
      })
    );
  }

  async list({ fields = {}, type, forceAllFields, cursor, limit, options }: ListMetaobjectsArgs) {
    let searchQuery = '';

    const documentNode = getMetaObjectsWithFieldsQuery;
    const variables = {
      limit: limit ?? MetaobjectClient.defaultLimit,
      cursor,
      searchQuery,

      type,
      includeCapabilities: forceAllFields ?? fields?.capabilities ?? true,
      includeDefinition: forceAllFields ?? fields?.definition ?? true,
      includeFieldDefinitions: forceAllFields ?? fields?.fieldDefinitions ?? true,
    } as VariablesOf<typeof getMetaObjectsWithFieldsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleMetaobjectsResponse) =>
          response?.metaobjects.nodes as MetaobjectModelData[],
      })
    );
  }

  async create(modelData: MetaobjectModelData) {
    const input = this.formatCreateInput(modelData);
    if (input) {
      const documentNode = createMetaobjectMutation;
      const variables = {
        metaobject: input,
      } as VariablesOf<typeof createMetaobjectMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: MetaobjectCreateResponse) =>
          response?.metaobjectCreate?.metaobject as MetaobjectModelData,
      });
    }
  }

  async update(modelData: MetaobjectModelData) {
    const input = this.formatUpdateInput(modelData);
    if (input) {
      const documentNode = updateMetaObjectMutation;
      const variables = {
        id: modelData.id,
        metaobject: input,
        includeDefinition: false,
        includeCapabilities: input.hasOwnProperty('capabilities'),
        includeFieldDefinitions: false,
      } as VariablesOf<typeof updateMetaObjectMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: MetaobjectUpdateResponse) =>
          response?.metaobjectUpdate?.metaobject as MetaobjectModelData,
      });
    }
  }

  async delete(modelData: Pick<MetaobjectModelData, 'id'>) {
    return this.request({
      documentNode: deleteMetaobjectMutation,
      variables: { id: modelData.id } as VariablesOf<typeof deleteMetaobjectMutation>,
    });
  }

  private formatCreateInput(modelData: MetaobjectModelData) {
    let input = this.formatUpdateInput(modelData) as MetaobjectCreateInput;
    if (input) {
      input.type = modelData.type;
    }
    const filteredInput = excludeUndefinedObjectKeys(input) as typeof input;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
  private formatUpdateInput(modelData: MetaobjectModelData) {
    const input: MetaobjectUpdateInput = {
      capabilities: modelData.capabilities as MetaobjectCapabilityDataInput,
      handle: modelData.handle,
      fields: modelData.fields.map((f) => ({ key: f.key, value: f.value })),
    };
    const filteredInput = excludeUndefinedObjectKeys({
      ...input,
      fields: input.fields.map((f) => excludeUndefinedObjectKeys(f)),
    }) as MetaobjectUpdateInput;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
}
// #endregion

// #region MetaobjectDefinitionClient
interface SingleMetaobjectDefinitionData {
  metaobjectDefinition: MetaobjectDefinitionApiData;
}
interface SingleMetaobjectDefinitionByTypeData {
  metaobjectDefinitionByType: MetaobjectDefinitionApiData;
}
interface MultipleMetaobjectDefinitionsData {
  metaobjectDefinitions: { nodes: MetaobjectDefinitionApiData[] };
}

interface MetaobjectDefinitionFieldsArgs {
  capabilities?: boolean;
  fieldDefinitions?: boolean;
}
interface SingleMetaobjectDefinitionArgs extends BaseSingleArgs {
  fields?: MetaobjectDefinitionFieldsArgs;
}
interface SingleMetaobjectByTypeDefinitionArgs extends Omit<BaseSingleArgs, 'id'> {
  type: string;
  fields?: MetaobjectDefinitionFieldsArgs;
}
interface ListMetaobjectDefinitionsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  fields?: MetaobjectDefinitionFieldsArgs;
}

export class MetaobjectDefinitionClient extends AbstractGraphQlClient<MetaobjectDefinitionModelData> {
  protected static readonly defaultLimit = 50;

  async single({ id, fields = {}, forceAllFields, options }: SingleMetaobjectDefinitionArgs) {
    const documentNode = getSingleMetaObjectDefinitionQuery;
    const variables = {
      id,
      includeCapabilities: forceAllFields ?? fields?.capabilities ?? false,
      includeFieldDefinitions: forceAllFields ?? fields?.fieldDefinitions ?? false,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (data: SingleMetaobjectDefinitionData) =>
          data?.metaobjectDefinition as MetaobjectDefinitionModelData,
      })
    );
  }

  async singleByType({ type, fields = {}, forceAllFields, options }: SingleMetaobjectByTypeDefinitionArgs) {
    const documentNode = getSingleMetaobjectDefinitionByTypeQuery;
    const variables = {
      type,
      includeCapabilities: forceAllFields ?? fields?.capabilities ?? false,
      includeFieldDefinitions: forceAllFields ?? fields?.fieldDefinitions ?? false,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (data: SingleMetaobjectDefinitionByTypeData) =>
          data?.metaobjectDefinitionByType as MetaobjectDefinitionModelData,
      })
    );
  }

  async list({ fields = {}, forceAllFields, cursor, limit, options }: ListMetaobjectDefinitionsArgs) {
    const documentNode = getMetaobjectDefinitionsQuery;
    const variables = {
      limit: limit ?? MetaobjectDefinitionClient.defaultLimit,
      cursor,
      includeCapabilities: forceAllFields ?? fields?.capabilities ?? false,
      includeFieldDefinitions: forceAllFields ?? fields?.fieldDefinitions ?? false,
    } as VariablesOf<typeof getMetaobjectDefinitionsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (data: MultipleMetaobjectDefinitionsData) =>
          data?.metaobjectDefinitions.nodes as MetaobjectDefinitionModelData[],
      })
    );
  }
}
// #endregion

// #region OrderTransactionClient
// type MultipleOrderTransactionsResponse = ResultOf<typeof getOrderTransactionsQuery>;
interface MultipleOrderTransactionsResponse {
  orders: {
    nodes: {
      id: string;
      name: string;
      transactions: OrderTransactionApiData[];
    }[];
  };
}
interface OrderTransactionFieldsArgs {
  amount?: boolean;
  icon?: boolean;
  parentTransaction?: boolean;
  paymentDetails?: boolean;
  receiptJson?: boolean;
  totalUnsettled?: boolean;
  transactionCurrency?: boolean;
}
export interface ListOrderTransactionsArgs extends BaseListArgs {
  cursor?: string;
  limit?: number;
  fields?: OrderTransactionFieldsArgs;
  gateways?: string[];
  orderFinancialStatus?: string;
  orderFulfillmentStatus?: string;
  orderStatus?: string;
  orderCreatedAtMin?: Date;
  orderCreatedAtMax?: Date;
  orderUpdatedAtMin?: Date;
  orderUpdatedAtMax?: Date;
  orderProcessedAtMin?: Date;
  orderProcessedAtMax?: Date;
}

export class OrderTransactionClient extends AbstractGraphQlClient<OrderTransactionModelData> {
  protected static readonly defaultLimit = 50;

  async list({
    fields = {},
    gateways,
    orderCreatedAtMax,
    orderCreatedAtMin,
    orderFinancialStatus,
    orderFulfillmentStatus,
    orderProcessedAtMax,
    orderProcessedAtMin,
    orderStatus,
    orderUpdatedAtMax,
    orderUpdatedAtMin,
    forceAllFields,
    cursor,
    limit,
    options,
  }: ListOrderTransactionsArgs) {
    const queryFilters = {
      gateways,
      financial_status: orderFinancialStatus,
      fulfillment_status: orderFulfillmentStatus,
      status: orderStatus,
      created_at_min: orderCreatedAtMin,
      created_at_max: orderCreatedAtMax,
      updated_at_min: orderUpdatedAtMin,
      updated_at_max: orderUpdatedAtMax,
      processed_at_min: orderProcessedAtMin,
      processed_at_max: orderProcessedAtMax,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (queryFilters[key] === undefined) delete queryFilters[key];
    });
    const searchQuery = buildOrderTransactionsSearchQuery(queryFilters);

    const documentNode = getOrderTransactionsQuery;
    const variables = {
      limit: limit ?? OrderTransactionClient.defaultLimit,
      cursor,
      searchQuery,

      includeAmount: forceAllFields ?? fields?.amount ?? true,
      includeIcon: forceAllFields ?? fields?.icon ?? true,
      includeParentTransaction: forceAllFields ?? fields?.parentTransaction ?? true,
      includePaymentDetails: forceAllFields ?? fields?.paymentDetails ?? true,
      includeReceiptJson: forceAllFields ?? fields?.receiptJson ?? true,
      includeTotalUnsettled: forceAllFields ?? fields?.totalUnsettled ?? true,
      includeTransactionCurrency: forceAllFields ?? fields?.transactionCurrency ?? true,
    } as VariablesOf<typeof getOrderTransactionsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleOrderTransactionsResponse): OrderTransactionModelData[] => {
          return response?.orders?.nodes.flatMap((order) =>
            order.transactions.map((transaction) => ({
              ...transaction,
              parentOrder: { id: order.id, name: order.name },
            }))
          );
        },
      })
    );
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
interface ProductTypesResponse {
  shop: {
    name: string;
    productTypes: {
      edges: {
        node: string;
      }[];
    };
  };
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
interface SingleProductArgs extends BaseSingleArgs {
  fields?: ProductFieldsArgs;
}
export interface ListProductsArgs extends BaseListArgs, ProductFilters {
  ids?: string[];
  limit?: number;
  fields?: ProductFieldsArgs;
  metafieldKeys?: Array<string>;
}

export class ProductClient extends AbstractGraphQlClient<ProductModelData> {
  async single({ id, fields = {}, forceAllFields, options }: SingleProductArgs) {
    const documentNode = getSingleProductQuery;
    const variables = {
      id,

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
        transformBodyResponse: (response: SingleProductResponse) => response?.product as unknown as ProductModelData,
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
      limit: limit ?? ProductClient.defaultLimit,
      cursor,
      searchQuery,
      includeFeaturedImage: forceAllFields ?? fields?.featuredImage ?? false,
      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      includeImages: forceAllFields ?? fields?.images ?? false,
      metafieldKeys,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
      includeOptions: forceAllFields ?? fields?.options ?? false,

      ...otherArgs,
    } as VariablesOf<typeof getProductsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleProductsResponse) =>
          response?.products.nodes as unknown as ProductModelData[],
      })
    );
  }

  async productTypes({ options }: BaseFindArgs) {
    const response = await this.request(
      withCacheDefault({
        options,
        documentNode: getProductTypesQuery,
        variables: {},
        transformBodyResponse: (response: ProductTypesResponse) =>
          response?.shop?.productTypes?.edges ? response.shop.productTypes.edges.map((edge) => edge.node) : [],
      })
    );
    return response.body;
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
        transformBodyResponse: (response: ProductCreateResponse) =>
          response?.productCreate.product as unknown as ProductModelData,
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
        transformBodyResponse: (response: ProductUpdateResponse) =>
          response?.productUpdate.product as unknown as ProductModelData,
      });
    }
  }

  async delete(modelData: Pick<ProductModelData, 'id'>) {
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

  // Est-ce qu'il faudrait gérer les metafields ici ?
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

// #region TranslationClient
interface ShopLocaleApiData extends ResultOf<typeof shopLocaleFieldsFragment> {}

interface ShopLocalesResponse {
  shopLocales: ShopLocaleApiData[];
}
interface SingleTranslationResponse {
  translatableResource: TranslatableResourceApiData;
}
interface MultipleTranslationsResponse {
  translatableResources: { nodes: TranslatableResourceApiData[] };
}
interface RegisterTranslationsResponse {
  translationsRegister: { translations: RegisterTranslationApiData[] };
}

interface TranslationFieldsArgs {
  market?: boolean;
}
interface SingleTranslationArgs extends BaseSingleArgs {
  locale: string;
  marketId?: string;
  key: string;
  fields?: TranslationFieldsArgs;
}
export interface ListTranslationsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  locale: string;
  marketId?: string;
  resourceType: string;
  fields?: TranslationFieldsArgs;
  onlyTranslated?: Boolean;
  keys?: string[];
}
export interface ListTranslationsKeysArgs extends BaseListArgs {
  resourceType: string;
}

function translatableContentToTranslationModelData({
  resourceGid,
  translatableContent,
  translations,
  locale,
  marketId,
}: {
  resourceGid: string;
  translatableContent: Pick<TranslatableContentApiData, 'digest' | 'type' | 'value' | 'key'>;
  translations: TranslationApiData[];
  locale: string;
  marketId: string;
}) {
  const matchingTranslation = translations.find((t) => t.key === translatableContent.key);
  const data: Partial<TranslationModelData> = {
    resourceGid,
    key: translatableContent.key,
    locale,
    marketId,
    digest: translatableContent.digest,
    type: translatableContent.type,
    originalValue: translatableContent.value,
    translatedValue: matchingTranslation?.value,
    outdated: matchingTranslation?.outdated,
    updatedAt: matchingTranslation?.updatedAt,
  };

  return data as TranslationModelData;
}

export class TranslationClient extends AbstractGraphQlClient<TranslationModelData> {
  async locales({ options }: BaseFindArgs) {
    const documentNode = getAvailableLocalesQuery;
    const variables = {} as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: function (response: ShopLocalesResponse) {
          return response?.shopLocales;
        },
      })
    );
  }

  async single({ key, fields = {}, forceAllFields, id, locale, marketId, options }: SingleTranslationArgs) {
    const documentNode = getSingleTranslationQuery;
    const variables = {
      id,
      locale,
      includeMarket: marketId !== undefined ? fields?.market ?? true : false,
      marketId,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: function (response: SingleTranslationResponse) {
          const translatableResource = response?.translatableResource;
          const matchingTranslatableContent = translatableResource?.translatableContent.find((c) => c.key === key);
          return translatableContentToTranslationModelData({
            resourceGid: translatableResource?.resourceId,
            locale,
            marketId,
            translatableContent: matchingTranslatableContent,
            translations: translatableResource?.translations,
          });
        },
      })
    );
  }

  async list({
    locale,
    fields = {},
    forceAllFields,
    marketId,
    onlyTranslated,
    keys = [],
    resourceType,
    cursor,
    limit,
    options,
  }: ListTranslationsArgs) {
    const documentNode = getTranslationsQuery;
    const variables = {
      limit: limit ?? TranslationClient.defaultLimit,
      cursor,
      locale,
      resourceType,
      includeMarket: marketId !== undefined ? fields?.market ?? true : false,
      marketId,
    } as VariablesOf<typeof getTranslationsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: function (response: MultipleTranslationsResponse) {
          let data: TranslationModelData[] = [];

          if (response?.translatableResources?.nodes) {
            data = response.translatableResources.nodes.flatMap((translatableResource) => {
              return translatableResource.translatableContent.map((translatableContent) => {
                return translatableContentToTranslationModelData({
                  locale,
                  marketId,
                  translatableContent,
                  resourceGid: translatableResource.resourceId,
                  translations: translatableResource.translations,
                });
              });
            });
          }

          return data.filter(
            (translation) =>
              (onlyTranslated === true ? !isNullish(translation.translatedValue) : true) &&
              (keys?.length ? keys.includes(translation.key) : true) &&
              // handle translation is not supported for market translations
              (marketId ? translation.key !== 'handle' : true)
          );
        },
      })
    );
  }

  async listKeys({ resourceType, options }: ListTranslationsKeysArgs) {
    const documentNode = getTranslatableContentKeys;
    const variables = { resourceType } as VariablesOf<typeof getTranslatableContentKeys>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: function (response: MultipleTranslationsResponse) {
          let keys: string[] = [];

          if (response?.translatableResources?.nodes) {
            keys = arrayUnique(
              response.translatableResources.nodes.flatMap((translatableResource) => {
                return translatableResource.translatableContent.map((translatableContent) => translatableContent.key);
              })
            );
          }

          return keys;
        },
      })
    );
  }

  async digest(modelData: TranslationModelData) {
    const response = await this.single({
      key: modelData.key,
      id: modelData.resourceGid,
      locale: modelData.locale,
      options: {
        cacheTtlSecs: CACHE_DISABLED,
      },
    });
    return response?.body?.digest;
  }

  async delete({
    key,
    locale,
    resourceGid,
    marketId,
  }: Pick<TranslationModelData, 'resourceGid' | 'locale' | 'key' | 'marketId'>) {
    return this.request({
      documentNode: removeTranslationsMutation,
      variables: {
        resourceId: resourceGid,
        locales: [locale],
        translationKeys: [key],
        marketIds: marketId ? [marketId] : undefined,
      } as VariablesOf<typeof removeTranslationsMutation>,
    });
  }

  async register(modelData: TranslationModelData) {
    // const input = this.formatUpdateInput(modelData);
    // if (input) {
    const documentNode = registerTranslationMutation;
    const variables = {
      resourceId: modelData.resourceGid,
      includeMarket: modelData.marketId !== undefined,
      translations: [
        {
          key: modelData.key,
          value: modelData.translatedValue,
          translatableContentDigest: modelData.digest,
          locale: modelData.locale,
          marketId: modelData.marketId,
        },
      ],
    } as VariablesOf<typeof registerTranslationMutation>;
    return this.request({
      documentNode,
      variables,
      transformBodyResponse: function (response: RegisterTranslationsResponse) {
        // merge with existing data
        return translatableContentToTranslationModelData({
          resourceGid: modelData.resourceGid,
          locale: modelData.locale,
          marketId: modelData.marketId,
          translatableContent: {
            digest: modelData.digest,
            type: modelData.type,
            value: modelData.originalValue,
            key: modelData.key,
          },
          translations: response?.translationsRegister.translations,
        });
      },
    });
  }
}
// #endregion

// #region VariantClient
interface SingleVariantResponse {
  productVariant: VariantApidata;
}
interface MultipleVariantsResponse {
  productVariants: { nodes: VariantApidata[] };
}
interface VariantCreateResponse {
  productVariantCreate: {
    productVariant: VariantApidata;
  };
}
interface VariantUpdateResponse {
  productVariantUpdate: {
    productVariant: VariantApidata;
  };
}

export interface VariantFieldsArgs {
  image?: boolean;
  inventoryItem?: boolean;
  metafields?: boolean;
  options?: boolean;
  product?: boolean;
  weight?: boolean;
  cost?: boolean;
}
interface SingleVariantArgs extends BaseSingleArgs {
  fields?: VariantFieldsArgs;
}
export interface ListVariantsArgs extends BaseListArgs, ProductVariantFilters {
  limit?: number;
  fields?: VariantFieldsArgs;
  metafieldKeys?: string[];
}

export class VariantClient extends AbstractGraphQlClient<VariantModelData> {
  async single({ id, fields = {}, forceAllFields, options }: SingleVariantArgs) {
    const documentNode = getSingleProductVariantQuery;
    const variables = {
      id,

      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      countMetafields: 0,
      metafieldKeys: [],
      includeCost: forceAllFields ?? fields?.cost ?? true,
      includeInventoryItem: forceAllFields ?? fields?.inventoryItem ?? true,
      includeProduct: forceAllFields ?? fields?.product ?? true,
      includeImage: forceAllFields ?? fields?.image ?? true,
      includeOptions: forceAllFields ?? fields?.options ?? true,
      includeWeight: forceAllFields ?? fields?.weight ?? true,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: SingleVariantResponse) =>
          response?.productVariant as unknown as VariantModelData,
      })
    );
  }

  async list({
    fields = {},
    forceAllFields,
    metafieldKeys = [],
    created_at_max,
    created_at_min,
    inventory_quantity_max,
    inventory_quantity_min,
    product_ids,
    product_publication_status,
    product_status,
    product_types,
    search,
    skus,
    updated_at_max,
    updated_at_min,
    vendors,

    cursor,
    limit,
    options,
  }: ListVariantsArgs) {
    const queryFilters: ProductVariantFilters = {
      created_at_min,
      created_at_max,
      updated_at_min,
      updated_at_max,
      inventory_quantity_max,
      inventory_quantity_min,
      product_ids,
      product_publication_status,
      product_status,
      product_types,
      skus,
      vendors,
      // optionsFilter,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (isNullish(queryFilters[key])) delete queryFilters[key];
    });
    const searchQuery = buildProductVariantsSearchQuery(queryFilters);
    const documentNode = getProductVariantsQuery;
    const variables = {
      limit: limit ?? VariantClient.defaultLimit,
      cursor,
      searchQuery,
      includeImage: forceAllFields ?? fields?.image ?? false,
      includeInventoryItem: forceAllFields ?? fields?.inventoryItem ?? false,
      includeMetafields: forceAllFields ?? fields?.metafields ?? false,
      includeCost: forceAllFields ?? fields?.cost ?? false,
      includeOptions: forceAllFields ?? fields?.options ?? false,
      includeProduct: forceAllFields ?? fields?.product ?? false,
      includeWeight: forceAllFields ?? fields?.weight ?? false,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_MAX_REQUEST_METAFIELDS,
      metafieldKeys,
    } as VariablesOf<typeof getProductVariantsQuery>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleVariantsResponse) =>
          response?.productVariants.nodes as unknown as VariantModelData[],
      })
    );
  }

  async create(modelData: VariantModelData) {
    const input = this.formatCreateInput(modelData);
    if (input) {
      const documentNode = createProductVariantMutation;
      const variables = {
        input: input ?? {},
        includeCost: true,
        includeImage: true,
        includeInventoryItem: true,
        includeMetafields: true,
        includeOptions: true,
        includeProduct: true,
        includeWeight: true,
        countMetafields: 0,
        metafieldKeys: [],
      } as VariablesOf<typeof createProductVariantMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: VariantCreateResponse) =>
          response?.productVariantCreate.productVariant as unknown as VariantModelData,
      });
    }
  }

  async update(modelData: VariantModelData) {
    const input = this.formatUpdateInput(modelData);
    if (input) {
      const documentNode = updateProductVariantMutation;
      const variables = {
        input: input ?? {},
        includeCost: true,
        includeImage: true,
        includeInventoryItem: true,
        includeMetafields: true,
        includeOptions: true,
        includeProduct: true,
        includeWeight: true,
        countMetafields: 0,
        metafieldKeys: [],
      } as VariablesOf<typeof updateProductVariantMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: VariantUpdateResponse) =>
          response?.productVariantUpdate.productVariant as unknown as VariantModelData,
      });
    }
  }

  async delete(data: Pick<VariantModelData, 'id'>) {
    return this.request({
      documentNode: deleteProductVariantMutation,
      variables: { id: data.id } as VariablesOf<typeof deleteProductVariantMutation>,
    });
  }

  private formatBaseInput(modelData: VariantModelData): ProductVariantInput | undefined {
    let input: ProductVariantInput = {
      barcode: modelData.barcode,
      compareAtPrice: modelData.compareAtPrice,
      inventoryPolicy: modelData.inventoryPolicy as any,
      position: modelData.position,
      price: modelData.price,
      taxable: modelData.taxable,
      taxCode: modelData.taxCode,
    };
    if (modelData.selectedOptions && modelData.selectedOptions.length) {
      input.options = modelData.selectedOptions.map((option) => option.value);
    }
    if (modelData.inventoryItem) {
      const { measurement, countryCodeOfOrigin, unitCost, ...inventoryItem } = modelData.inventoryItem;
      input.inventoryItem = excludeUndefinedObjectKeys({
        ...inventoryItem,
        countryCodeOfOrigin: countryCodeOfOrigin as ProductVariantInput['inventoryItem']['countryCodeOfOrigin'],
        measurement: measurement as ProductVariantInput['inventoryItem']['measurement'],
        cost: unitCost?.amount,
      });
    }

    const filteredInput = excludeUndefinedObjectKeys(input);

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
  private formatCreateInput(modelData: VariantModelData): ProductVariantInput | undefined {
    const input = {
      ...(this.formatBaseInput(modelData) ?? {}),
      productId: modelData.product?.id,
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

  private formatUpdateInput(modelData: VariantModelData): ProductVariantInput | undefined {
    const input = {
      ...(this.formatBaseInput(modelData) ?? {}),
      id: modelData.id,
    };
    const filteredInput = excludeUndefinedObjectKeys(input);
    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
}
// #endregion
