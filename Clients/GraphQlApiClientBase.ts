// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { VariablesOf } from '../utils/tada-utils';

import { BaseModelDataGraphQl } from '../models/graphql/AbstractModelGraphQl';
import { FileApiData, FileModelData } from '../models/graphql/FileModel';
import { InventoryItemApiData, InventoryItemModelData } from '../models/graphql/InventoryItemModel';
import { LocationApiData, LocationModelData } from '../models/graphql/LocationModel';
import { MetafieldDefinitionApiData } from '../models/graphql/MetafieldDefinitionModel';
import { MetafieldApiData } from '../models/graphql/MetafieldGraphQlModel';
import { MetaobjectDefinitionApiData } from '../models/graphql/MetaobjectDefinitionModel';
import { MetaobjectApiData, MetaobjectModelData } from '../models/graphql/MetaobjectModel';
import { OrderTransactionApiData, OrderTransactionModelData } from '../models/graphql/OrderTransactionModel';
import { ProductApidata, ProductModelData } from '../models/graphql/ProductModel';
import { TranslatableContentApiData, TranslatableContentModelData } from '../models/graphql/TranslatableContentModel';
import {
  RegisterTranslationApiData,
  TranslatableResourceApiData,
  TranslationApiData,
  TranslationModelData,
} from '../models/graphql/TranslationModel';
import { VariantApidata, VariantModelData } from '../models/graphql/VariantModel';

import { deleteFilesMutation, getFilesQuery, getSingleFileQuery, updateFilesMutation } from '../graphql/files-graphql';
import {
  buildInventoryItemsSearchQuery,
  getInventoryItemsQuery,
  updateInventoryItemMutation,
} from '../graphql/inventoryItems-graphql';
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
  getProductsQuery,
  getSingleProductQuery,
  updateProductMutation,
} from '../graphql/products-graphql';
import { throttleStatusQuery } from '../graphql/shop-graphql';
import {
  getSingleTranslationQuery,
  getTranslatableResourcesQuery,
  getTranslationsQuery,
  registerTranslationMutation,
  removeTranslationsMutation,
} from '../graphql/translations-graphql';

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
import { SupportedMetafieldOwnerType } from '../models/graphql/MetafieldGraphQlModel';
import { METAFIELD_TYPES } from '../Resources/Mixed/METAFIELD_TYPES';
import { GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from '../config';
import { CACHE_DEFAULT, CACHE_DISABLED, GRAPHQL_NODES_LIMIT, PREFIX_FAKE } from '../constants';
import {
  LocalizableContentType,
  MetafieldDefinitionValidationStatus,
  MetafieldOwnerType,
  MetafieldsSetInput,
  MetaobjectCapabilityDataInput,
  MetaobjectCreateInput,
  MetaobjectUpdateInput,
  Node,
  PageInfo,
  ProductInput,
  ProductVariantInput,
  TranslatableResourceType,
} from '../types/admin.types';
import { graphQlGidToResourceName } from '../utils/conversion-utils';
import { arrayUnique, dumpToConsole, excludeUndefinedObjectKeys, isNullish, logAdmin } from '../utils/helpers';
import { matchResourceNameToMetafieldOwnerType } from '../utils/metafields-utils';
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
  protected static readonly defaultLimit = GRAPHQL_NODES_LIMIT;

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

      const pageInfo = GraphQlApiClientBase.getPageInfo(response.body);
      // Always repay cost
      if (!isCodaCached(response) && response.body.extensions?.cost) {
        // TODO: maybe don't repay cost when we reached the end of a sync table ? Because points will be replenished will waiting for the eventual next sync to start
        // -> need to detect we are in a sync context too
        // if (!pageInfo || !pageInfo.hasNextPage) {
        await GraphQlApiClientBase.repayCost(response.body.extensions.cost);
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
interface SingleFileArgs extends BaseFindArgs {
  id: string;
  fields?: FileFieldsArgs;
}
export interface ListFilesArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  type?: string;
  fields?: FileFieldsArgs;
}

// TODO: recursively flatten connections

export class FileClient extends GraphQlApiClientBase implements IGraphQlCRUD {
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
        transformBodyResponse: (response: SingleFileResponse) => response?.node,
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

    return this.request<FileApiData[]>(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleFilesResponse) => response?.files.nodes,
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
          response?.fileUpdate.files.length ? response?.fileUpdate.files[0] : undefined,
      });
    }
  }

  async delete(fileIds: string[]) {
    return this.request({
      documentNode: deleteFilesMutation,
      variables: { fileIds } as VariablesOf<typeof deleteFilesMutation>,
    });
  }

  private formatUpdateInput(modelData: FileModelData) {
    const input: VariablesOf<typeof updateFilesMutation>['files'][number] = {
      id: modelData.id,
      filename: modelData.filename,
      alt: modelData.alt,
    };
    const filteredInput = excludeUndefinedObjectKeys(input) as typeof input;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }
}
// #endregion

// #region InventoryItemClient
interface MultipleInventoryItemsResponse {
  inventoryItems: { nodes: InventoryItemApiData[] };
}
interface InventoryItemUpdateResponse {
  inventoryItemUpdate: {
    inventoryItem: InventoryItemApiData;
  };
}
export interface ListInventoryItemsArgs extends BaseListArgs {
  cursor?: string;
  limit?: number;
  createdAtMin?: Date;
  createdAtMax?: Date;
  updatedAtMin?: Date;
  updatedAtMax?: Date;
  skus?: string[];
}

export class InventoryItemClient extends GraphQlApiClientBase implements IGraphQlCRUD {
  async list({
    createdAtMin,
    createdAtMax,
    updatedAtMin,
    updatedAtMax,
    skus,
    cursor,
    limit,
    options,
  }: ListInventoryItemsArgs) {
    const queryFilters = {
      created_at_min: createdAtMin,
      created_at_max: createdAtMax,
      updated_at_min: updatedAtMin,
      updated_at_max: updatedAtMax,
      skus,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (queryFilters[key] === undefined) delete queryFilters[key];
    });
    const searchQuery = buildInventoryItemsSearchQuery(queryFilters);

    const documentNode = getInventoryItemsQuery;
    const variables = {
      limit: limit ?? InventoryItemClient.defaultLimit,
      cursor,
      searchQuery,
    } as VariablesOf<typeof getInventoryItemsQuery>;

    return this.request<InventoryItemApiData[]>(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleInventoryItemsResponse) => response?.inventoryItems.nodes,
      })
    );
  }

  async update(modelData: InventoryItemModelData) {
    const input = this.formatUpdateInput(modelData);
    if (input) {
      const documentNode = updateInventoryItemMutation;
      const variables = {
        id: modelData.id,
        input,
      } as VariablesOf<typeof updateInventoryItemMutation>;
      return this.request({
        documentNode,
        variables,
        transformBodyResponse: (response: InventoryItemUpdateResponse) => response?.inventoryItemUpdate?.inventoryItem,
      });
    }
  }

  private formatUpdateInput(modelData: InventoryItemModelData) {
    const input: VariablesOf<typeof updateInventoryItemMutation>['input'] = {
      cost: modelData.unitCost?.amount,
      countryCodeOfOrigin: modelData.countryCodeOfOrigin,
      harmonizedSystemCode: modelData.harmonizedSystemCode,
      provinceCodeOfOrigin: modelData.provinceCodeOfOrigin,
      tracked: modelData.tracked,
      // countryHarmonizedSystemCodes
    };

    // /* Edge case for cost. Setting it to 0 should delete the value. */
    // if (input.cost === 0) {
    //   input.cost = null;
    // }

    const filteredInput = excludeUndefinedObjectKeys(input) as typeof input;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
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
interface SingleLocationArgs extends BaseFindArgs {
  id: string;
  fields?: LocationFieldsArgs;
}
export interface ListLocationsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  fields?: LocationFieldsArgs;
  metafieldKeys?: Array<string>;
}

export class LocationClient extends GraphQlApiClientBase implements IGraphQlCRUD {
  async single({ id, fields = {}, forceAllFields, options }: SingleLocationArgs) {
    const documentNode = getSingleLocationQuery;
    const variables = {
      id,

      // TODO: retrieve metafields ?
      includeMetafields: forceAllFields ?? fields?.metafields ?? true,
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
        transformBodyResponse: (response: SingleLocationResponse) => response?.location,
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
      countMetafields: metafieldKeys.length,
      metafieldKeys,
    } as VariablesOf<typeof getLocationsQuery>;

    return this.request<LocationApiData[]>(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleLocationsResponse) => response?.locations.nodes,
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
        transformBodyResponse: (response: LocationUpdateResponse) => response?.locationEdit?.location,
      });
    }
  }

  async activate(id: string) {
    return this.request({
      documentNode: activateLocationMutation,
      variables: { locationId: id } as VariablesOf<typeof activateLocationMutation>,
      transformBodyResponse: (response: LocationActivateResponse) => response?.locationActivate?.location,
    });
  }

  async deActivate(locationId: string, destinationLocationId?: string) {
    return this.request({
      documentNode: deactivateLocationMutation,
      variables: {
        locationId,
        destinationLocationId,
      } as VariablesOf<typeof deactivateLocationMutation>,
      transformBodyResponse: (response: LocationDeActivateResponse) => response?.locationDeactivate?.location,
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

// #region MetafieldClient
interface MetafieldOwnerNodeApidata extends Node {
  __typename: string;
  parentOwner: Node;
  metafields: { nodes: MetafieldApiData[] };
}

interface SingleMetafieldResponse {
  node: MetafieldApiData;
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
    metafields: (MetafieldApiData & {
      owner: Omit<MetafieldOwnerNodeApidata, 'metafields'>;
    })[];
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
  ownerGid: string;
}
interface ListMetafieldsByOwnerIdsArgs extends Omit<ListMetafieldsArgs, 'ownerType'> {
  ownerIds: string[];
}
export interface ListMetafieldsByOwnerTypeArgs extends Omit<ListMetafieldsArgs, 'ownerIds'> {
  ownerType: SupportedMetafieldOwnerType;
}

function transformMetafieldOwnerNode(ownerNode: MetafieldOwnerNodeApidata): MetafieldApiData[] {
  return (
    ownerNode?.metafields?.nodes
      .map((metafield) => includeOwnerInMetafieldData(metafield, ownerNode))
      .filter(Boolean) || []
  );
}
function transformMetafieldOwnerNodes(ownerNodes: MetafieldOwnerNodeApidata[]): MetafieldApiData[] {
  return (
    ownerNodes
      .map((node) => transformMetafieldOwnerNode(node))
      .flat()
      .filter(Boolean) || []
  );
}
function includeOwnerInMetafieldData(
  metafield: MetafieldApiData,
  ownerNode: Pick<MetafieldOwnerNodeApidata, 'id' | 'parentOwner'>
): MetafieldApiData {
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

  async listBySingleOwnerId({ metafieldKeys = [], ownerGid, options }: ListMetafieldsBySingleOwnerArgs) {
    const graphQlResourceName = graphQlGidToResourceName(ownerGid);
    //* Assume we query the Shop metafields when graphQlResourceName is undefined
    const ownerType = graphQlResourceName
      ? matchResourceNameToMetafieldOwnerType(graphQlResourceName)
      : MetafieldOwnerType.Shop;

    const isShopQuery = ownerType === MetafieldOwnerType.Shop;
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
        ownerGid: ownerGid,
        metafieldKeys,
      } as VariablesOf<typeof getSingleNodeMetafieldsByKeyQuery>;
    }
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: makeTransformSingleMetafieldsByKeyResponse(ownerType),
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
    return this.request<MetafieldApiData[]>(
      withCacheDefault({
        options,
        documentNode: getNodesMetafieldsByKeyQuery,
        variables: {
          limit: limit ?? MetafieldClient.defaultLimit,
          cursor,
          ids: ownerIds,
          metafieldKeys,
          countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
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
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
      ...otherArgs,
    } as VariablesOf<ReturnType<typeof getResourceMetafieldsByKeysQueryFromOwnerType>>;

    return this.request<MetafieldApiData[]>(
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
  async set(modelData: MetafieldApiData) {
    const input = this.formatMetafieldSetInput(modelData);
    if (input) {
      const documentNode = setMetafieldsMutation;
      const variables = { inputs: [input] } as VariablesOf<typeof setMetafieldsMutation>;

      return this.request<MetafieldApiData>({
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

  async create(modelData: MetafieldApiData) {
    return this.set(modelData);
  }

  async update(modelData: MetafieldApiData) {
    return this.set(modelData);
  }

  async delete(modelData: MetafieldApiData) {
    return this.request({
      documentNode: deleteMetafieldMutation,
      variables: { input: { id: modelData.id } } as VariablesOf<typeof deleteMetafieldMutation>,
    });
  }

  /**
   * Formate un objet MetafieldsSetInput pour GraphQL Admin API
   */
  private formatMetafieldSetInput(modelData: MetafieldApiData): MetafieldsSetInput | undefined {
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
// #endregion

// #region MetaobjectClient
  async delete(modelData: ProductModelData) {
    return this.request({
      documentNode: deleteMetaobjectMutation,
      variables: { id: modelData.id } as VariablesOf<typeof deleteMetaobjectMutation>,
    });
  }
// #endregion

// #region MetaobjectDefinitionClient
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

export class OrderTransactionClient extends GraphQlApiClientBase implements IGraphQlCRUD {
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

    return this.request<OrderTransactionApiData[]>(
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
        transformBodyResponse: (response: SingleProductResponse) => response?.product,
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
      countMetafields: metafieldKeys.length,
      includeOptions: forceAllFields ?? fields?.options ?? false,

      ...otherArgs,
    } as VariablesOf<typeof getProductsQuery>;

    return this.request<ProductApidata[]>(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: (response: MultipleProductsResponse) => response?.products.nodes,
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
        transformBodyResponse: (response: ProductCreateResponse) => response?.productCreate.product,
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
        transformBodyResponse: (response: ProductUpdateResponse) => response?.productUpdate.product,
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

// #region TranslationClient
interface SingleTranslationResponse {
  translatableResource: TranslatableResourceApiData;
}
interface MultipleTranslationsResponse {
  translatableResources: { nodes: TranslatableResourceApiData[] };
}
interface RegisterTranslationsResponse {
  translationsRegister: { translations: RegisterTranslationApiData[] };
}

interface SingleTranslationArgs extends BaseFindArgs {
  resourceGid: string;
  locale: string;
  key: string;
}
export interface ListTranslationsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  locale: string;
  resourceType: string;
}

function translatableResourceToTranslationModelData({
  translatableResource,
  translatableContent,
  translation,
  locale,
}: {
  translatableResource: Pick<TranslatableResourceApiData, 'resourceId'>;
  translatableContent: Pick<TranslatableContentApiData, 'digest' | 'type' | 'value'>;
  translation?: TranslationApiData;
  locale: string;
}) {
  const data: Partial<TranslationModelData> = {
    resourceGid: translatableResource.resourceId,
    locale,
    digest: translatableContent?.digest,
    originalValue: translatableContent?.value,
    type: translatableContent?.type as LocalizableContentType,
    isDeletedFlag: true,
  };
  if (translation) {
    data.key = translation.key;
    data.translatedValue = translation.value;
    data.outdated = translation.outdated;
    data.isDeletedFlag = false;
    data.updatedAt = translation?.updatedAt;
  }

  return data as TranslationModelData;
}

const makeTransformSingleTranslationResponse = (key: string, locale: string) =>
  function (response: SingleTranslationResponse) {
    const translatableResource = response?.translatableResource;
    const matchingTranslatableContent = translatableResource?.translatableContent.find((c) => c.key === key);
    const matchingTranslation = translatableResource?.translations.find((t) => t.key === key);
    return translatableResourceToTranslationModelData({
      translatableResource: translatableResource,
      translatableContent: matchingTranslatableContent,
      translation: matchingTranslation,
      locale,
    });
  };
const makeTransformMultipleTranslationsResponse = (locale: string) =>
  function (response: MultipleTranslationsResponse) {
    let data: TranslationModelData[] = [];

    if (response?.translatableResources?.nodes) {
      data = response.translatableResources.nodes.flatMap((translatableResource) => {
        return translatableResource.translations.map((translation) => {
          return translatableResourceToTranslationModelData({
            translatableResource: translatableResource,
            translatableContent: translatableResource.translatableContent.find((c) => c.key === translation.key),
            translation: translation,
            locale,
          });
        });
      });
    }

    return data;
  };
const makeTransformRegisterTranslationResponse = (modelData: TranslationModelData) =>
  function (response: RegisterTranslationsResponse) {
    const matchingTranslation = response?.translationsRegister.translations.find(
      (t) => t.key === modelData.key && t.locale === modelData.locale
    );
    return matchingTranslation;
  };

export class TranslationClient extends GraphQlApiClientBase implements IGraphQlCRUD {
  async single({ key, resourceGid, locale, options }: SingleTranslationArgs) {
    const documentNode = getSingleTranslationQuery;
    const variables = {
      id: resourceGid,
      locale,
    } as VariablesOf<typeof documentNode>;
    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: makeTransformSingleTranslationResponse(key, locale),
      })
    );
  }

  async list({ locale, resourceType, cursor, limit, options }: ListTranslationsArgs) {
    const documentNode = getTranslationsQuery;
    const variables = {
      limit: limit ?? TranslationClient.defaultLimit,
      cursor,
      locale,
      resourceType,
    } as VariablesOf<typeof getTranslationsQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: makeTransformMultipleTranslationsResponse(locale),
      })
    );
  }

  async digest(modelData: TranslationModelData) {
    const response = await this.single({
      key: modelData.key,
      resourceGid: modelData.resourceGid,
      locale: modelData.locale,
      options: {
        cacheTtlSecs: CACHE_DISABLED,
      },
    });
    return response?.body?.digest;
  }

  async delete({ key, locale, resourceGid }: Pick<TranslationModelData, 'resourceGid' | 'locale' | 'key'>) {
    return this.request({
      documentNode: removeTranslationsMutation,
      variables: {
        resourceId: resourceGid,
        locales: [locale],
        translationKeys: [key],
      } as VariablesOf<typeof removeTranslationsMutation>,
    });
  }

  async register(modelData: TranslationModelData) {
    // const input = this.formatUpdateInput(modelData);
    // if (input) {
    const documentNode = registerTranslationMutation;
    const variables = {
      resourceId: modelData.resourceGid,
      translations: [
        {
          key: modelData.key,
          value: modelData.translatedValue,
          translatableContentDigest: modelData.digest,
          locale: modelData.locale,
        },
      ],
    } as VariablesOf<typeof registerTranslationMutation>;
    return this.request({
      documentNode,
      variables,
      transformBodyResponse: makeTransformRegisterTranslationResponse(modelData),
    });
    // }
  }
}
// #endregion

// #region TranslatableContentClient
interface MultipleTranslatableContentsResponse {
  translatableResources: { nodes: Omit<TranslatableResourceApiData, 'translations'>[] };
}

export interface ListTranslatableContentsArgs extends BaseListArgs {
  limit?: number;
  cursor?: string;
  resourceType: TranslatableResourceType;
}

const makeTransformMultipleTranslatableContentsResponse = (resourceType: TranslatableResourceType) =>
  function (response: MultipleTranslatableContentsResponse) {
    let data: TranslatableContentModelData[] = [];

    if (response?.translatableResources?.nodes) {
      return response.translatableResources.nodes.flatMap((translatableResource) => {
        return translatableResource.translatableContent.map((translatableContent) => {
          return {
            resourceGid: translatableResource.resourceId,
            key: translatableContent.key,
            value: translatableContent.value,
            type: translatableContent?.type,
            resourceType,
          } as TranslatableContentModelData;
        });
      });
    }

    return data;
  };

export class TranslatableContentClient extends GraphQlApiClientBase implements IGraphQlCRUD {
  async list({ resourceType, cursor, limit, options }: ListTranslatableContentsArgs) {
    const documentNode = getTranslatableResourcesQuery;
    const variables = {
      limit: limit ?? TranslatableContentClient.defaultLimit,
      cursor,
      resourceType,
    } as VariablesOf<typeof getTranslatableResourcesQuery>;

    return this.request(
      withCacheDefault({
        options,
        documentNode,
        variables,
        transformBodyResponse: makeTransformMultipleTranslatableContentsResponse(resourceType),
      })
    );
  }
}
// #endregion
