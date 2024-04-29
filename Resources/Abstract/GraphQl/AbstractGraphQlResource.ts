// #region Imports
import * as coda from '@codahq/packs-sdk';
import { Body } from '@shopify/shopify-api';
import { TadaDocumentNode } from 'gql.tada';
import { ResultOf, VariablesOf } from '../../../utils/tada-utils';

import { GraphQlClient, GraphQlRequestReturn } from '../../../Clients/GraphQlClient';
import { ShopifyGraphQlRequestCost } from '../../../Errors/GraphQlErrors';
import { SyncTableManagerGraphQl } from '../../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import {
  MakeSyncGraphQlFunctionArgs,
  SyncGraphQlFunction,
} from '../../../SyncTableManager/types/SyncTableManager.types';
import { GRAPHQL_DEFAULT_API_VERSION } from '../../../config';
import { CACHE_DEFAULT, GRAPHQL_NODES_LIMIT } from '../../../constants';
import { metafieldFieldsFragment } from '../../../graphql/metafields-graphql';
import { Node } from '../../../graphql/types/graphql.types.';
import { PageInfo as PageInfoGraphQl } from '../../../types/admin.types';
import { graphQlGidToId } from '../../../utils/conversion-utils';
import { flattenConnection } from '../../../utils/helpers';
import { FragmentOf } from '../../../utils/tada-utils';
import { Metafield } from '../../Rest/Metafield';
import { BaseContext } from '../../types/Resource.types';
import { GraphQlResourceName } from '../../types/SupportedResource';
import { AbstractResource, FindAllResponseBase } from '../AbstractResource';

// #endregion

// #region Types
export type GraphQlResourcePath = string;

interface GraphQlApiData {
  id: string | null;
  [key: string]: any;
}
export interface GraphQlApiDataWithMetafields extends GraphQlApiData {
  metafields: { nodes: Array<FragmentOf<typeof metafieldFieldsFragment>> };
  restMetafieldInstances?: Array<Metafield>;
}
export interface GraphQlApiDataWithParentNode extends GraphQlApiData {
  parentNode: Node;
}

export interface FindAllGraphQlResponse<T> extends FindAllResponseBase<T> {
  cost: ShopifyGraphQlRequestCost;
  pageInfo?: PageInfoGraphQl;
}

interface BaseArgs<NodeT extends TadaDocumentNode> {
  documentNode: NodeT;
  variables: VariablesOf<NodeT>;
}

interface BaseFindArgs<NodeT extends TadaDocumentNode = TadaDocumentNode> extends BaseArgs<NodeT>, BaseContext {}

interface BaseDeleteArgs<NodeT extends TadaDocumentNode> extends BaseArgs<NodeT>, BaseContext {}

interface RequestArgs<NodeT extends TadaDocumentNode> extends BaseArgs<NodeT>, BaseContext {}

export interface SaveArgs {
  update?: boolean;
}
export interface BaseSaveArgs<NodeT extends TadaDocumentNode> extends SaveArgs, BaseArgs<NodeT> {}
// #endregion

export abstract class AbstractGraphQlResource extends AbstractResource {
  protected static Client = GraphQlClient;
  protected static apiVersion = GRAPHQL_DEFAULT_API_VERSION;
  protected static readonly defaultLimit: number = GRAPHQL_NODES_LIMIT;

  protected static readonly graphQlName: GraphQlResourceName | undefined;
  /** These paths should not includes nodes or edges keys, except for the root one */
  protected static readonly paths: Array<GraphQlResourcePath> = [];

  protected static async request<NodeT extends TadaDocumentNode = TadaDocumentNode>({
    context,
    ...requestArgs
  }: RequestArgs<NodeT>): Promise<GraphQlRequestReturn<NodeT>> {
    const client = new this.Client({ context, apiVersion: this.apiVersion });
    return client.request<NodeT>(requestArgs);
  }

  protected static async baseFind<T extends AbstractGraphQlResource, NodeT extends TadaDocumentNode>({
    context,
    options = {},
    ...requestArgs
  }: BaseFindArgs<NodeT>): Promise<FindAllGraphQlResponse<T>> {
    const response = await this.request({
      context,
      options: {
        ...options,
        cacheTtlSecs: options?.cacheTtlSecs ?? CACHE_DEFAULT,
      },
      ...requestArgs,
    });

    return {
      data: this.createInstancesFromResponse<T, NodeT>(context, response.body.data),
      headers: response.headers,
      pageInfo: response.pageInfo,
      cost: response.cost,
    };
  }

  protected static async baseDelete<NodeT extends TadaDocumentNode>({
    context,
    ...requestArgs
  }: BaseDeleteArgs<NodeT>): Promise<ResultOf<NodeT> | null> {
    const response = await this.request<NodeT>({ context, ...requestArgs });
    return response?.body?.data ?? null;
  }

  /**
   * To be implemented by child class
   */
  public static async all(params: any): Promise<FindAllGraphQlResponse<any>> {
    return;
  }

  public static async allDataLoop<T extends AbstractGraphQlResource>({ context, ...otherArgs }): Promise<Array<T>> {
    let items: Array<T> = [];
    let nextCursor: string;
    let run = true;

    while (run) {
      const response = await this.all({ context, cursor: nextCursor, ...otherArgs });
      const { pageInfo } = response;

      items = items.concat(response.data as unknown as T);
      if (pageInfo?.hasNextPage) {
        nextCursor = pageInfo.endCursor;
      } else {
        nextCursor = undefined;
      }

      if (nextCursor === undefined) run = false;
    }

    return items;
  }

  /**
   * Generate a sync function to be used by SyncTableManager.
   */
  protected static makeSyncTableManagerSyncFunction(
    params: MakeSyncGraphQlFunctionArgs<AbstractGraphQlResource, any>
  ): SyncGraphQlFunction<AbstractGraphQlResource> {
    return ({ cursor = null, limit }) => this.all({ cursor, limit, ...params });
  }

  /**
   * Get the appropriate SyncTableManager for this resource
   */
  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableManagerGraphQl<AbstractGraphQlResource>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerGraphQl<AbstractGraphQlResource>({ schema, codaSyncParams, context });
  }

  protected static extractDataFromAllPossiblePaths<NodeT extends TadaDocumentNode>(
    rawData: ResultOf<NodeT>
  ): Array<any> {
    return this.paths.map((path) => this.extractDataAtPath(path, rawData)).filter(Boolean);
  }

  protected static extractDataAtPath<NodeT extends TadaDocumentNode>(currentPath: string, rawData: ResultOf<NodeT>) {
    const parts = currentPath.split('.');
    let data: Body;
    let pointer = rawData as any;

    function extract(part: string, parentNode: any): any | any[] {
      const rootNode = parentNode === rawData;
      if (parentNode && parentNode.hasOwnProperty(part)) {
        const isConnection = 'nodes' in parentNode[part] || 'edges' in parentNode[part];
        if (isConnection) {
          return flattenConnection(parentNode[part]).map((data: any) => (rootNode ? data : { ...data, parentNode }));
        }

        return rootNode
          ? parentNode[part]
          : Array.isArray(parentNode[part])
          ? parentNode[part].map((node: any) => ({
              ...node,
              parentNode,
            }))
          : {
              ...parentNode[part],
              parentNode,
            };
      }
    }

    for (let part of parts) {
      if (Array.isArray(pointer)) {
        pointer = pointer.map((node) => extract(part, node));
      } else {
        pointer = extract(part, pointer);
      }

      data = pointer;
    }

    return data ? (Array.isArray(data) ? data.flat().filter(Boolean) : data) : undefined;
  }

  protected static createInstancesFromResponse<T extends AbstractGraphQlResource, NodeT extends TadaDocumentNode>(
    context: coda.ExecutionContext,
    rawData: ResultOf<NodeT>
  ): Array<T> {
    let instances: Array<T> = [];
    this.extractDataFromAllPossiblePaths(rawData).forEach((data) => {
      if (data && Array.isArray(data)) {
        instances = instances.concat(
          data.reduce((acc: Array<T>, entry: Body) => acc.concat(this.createInstance<T>(context, entry)), [])
        );
      } else if (data) {
        instances.push(this.createInstance<T>(context, data));
      }
    });

    return instances;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get graphQlGid(): string {
    return this.apiData.id;
  }
  get restId(): number {
    return graphQlGidToId(this.apiData.id);
  }

  public request<NodeT extends TadaDocumentNode = TadaDocumentNode>(args: RequestArgs<NodeT>) {
    return this.resource<typeof AbstractGraphQlResource>().request<NodeT>(args);
  }

  protected async _baseSave<NodeT extends TadaDocumentNode>({
    update = false,
    documentNode,
    variables,
  }: BaseSaveArgs<NodeT>): Promise<void> {
    const staticResource = this.resource<typeof AbstractGraphQlResource>();
    const response = await this.request<NodeT>({
      context: this.context,
      documentNode: documentNode,
      variables: variables,
    });

    const body = staticResource.extractDataFromAllPossiblePaths(response.body.data)[0];
    /**
     * Some mutations can udate multipe resources in one go,
     * but we are only interested in a single update here
     */
    const singleBody = Array.isArray(body) ? body[0] : body;
    if (update && singleBody) {
      this.setData(singleBody);
    }
  }
}
