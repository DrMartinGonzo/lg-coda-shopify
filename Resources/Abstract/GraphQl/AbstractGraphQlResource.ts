// #region Imports
import * as coda from '@codahq/packs-sdk';
import { Body } from '@shopify/shopify-api/rest/types';
import { TadaDocumentNode } from 'gql.tada';
import { ResultOf, VariablesOf } from '../../../utils/tada-utils';

import { BaseContext } from '../../../Clients/Client.types';
import { GraphQlClient, GraphQlRequestReturn } from '../../../Clients/GraphQlClient';
import { ShopifyGraphQlRequestCost } from '../../../Errors/GraphQlErrors';
import { GRAPHQL_DEFAULT_API_VERSION } from '../../../config';
import { CACHE_DEFAULT, GRAPHQL_NODES_LIMIT } from '../../../constants';
import { PageInfo } from '../../../types/admin.types';
import { graphQlGidToId } from '../../../utils/conversion-utils';
import { AbstractResource } from '../AbstractResource';
import { GraphQlResourceName } from '../../types/Resource.types';

// #endregion

// #region Types
export type GraphQlResourcePath = string;

export interface GraphQlApiData {
  id: string | null;
  [key: string]: any;
}

export interface FindAllResponse<T> {
  data: T[];
  headers: coda.FetchResponse['headers'];
  cost: ShopifyGraphQlRequestCost;
  // lastMaxEntriesPerRun: number;
  pageInfo?: PageInfo;
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

  protected static readonly graphQlName: GraphQlResourceName | undefined;
  protected static readonly defaultMaxEntriesPerRun: number = GRAPHQL_NODES_LIMIT;
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
  }: BaseFindArgs<NodeT>): Promise<FindAllResponse<T>> {
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
      // lastMaxEntriesPerRun: response.lastMaxEntriesPerRun,
    };
  }

  protected static async baseDelete<NodeT extends TadaDocumentNode>({
    context,
    ...requestArgs
  }: BaseDeleteArgs<NodeT>): Promise<ResultOf<NodeT> | null> {
    const response = await this.request<NodeT>({ context, ...requestArgs });
    return response?.body?.data ?? null;
  }

  protected static extractResourceDataFromRawData<NodeT extends TadaDocumentNode>(
    rawData: ResultOf<NodeT>
  ): Array<Body> {
    return this.paths
      .map((resourceName) => {
        // access nested data using dot notation
        const keys = resourceName.split('.');
        let data: Body;
        let maybeFound = rawData;
        for (let key of keys) {
          if (maybeFound.hasOwnProperty(key)) {
            maybeFound = maybeFound[key];
            data = maybeFound;
          } else {
            break;
          }
        }

        return data;
      })
      .filter(Boolean);
  }

  protected static createInstancesFromResponse<T extends AbstractGraphQlResource, NodeT extends TadaDocumentNode>(
    context: coda.ExecutionContext,
    rawData: ResultOf<NodeT>
  ): Array<T> {
    let instances: Array<T> = [];
    this.extractResourceDataFromRawData(rawData).forEach((data) => {
      if (data && Array.isArray(data)) {
        instances = instances.concat(
          data.reduce((acc: Array<T>, entry: Body) => acc.concat(this.createInstance<T>(context, entry)), [])
        );
      } else if (data) {
        instances.push(this.createInstance<T>(context, data));
      }
    });

    // this.paths.forEach((resourceName) => {
    //   // access nested data using dot notation
    //   const keys = resourceName.split('.');
    //   let data: Body;
    //   let foundData = rawData;
    //   for (let key of keys) {
    //     if (foundData.hasOwnProperty(key)) {
    //       foundData = foundData[key];
    //       data = foundData;
    //     } else {
    //       break;
    //     }
    //   }

    //   if (data && Array.isArray(data)) {
    //     instances = instances.concat(
    //       data.reduce((acc: Array<T>, entry: Body) => acc.concat(this.createInstance<T>(context, entry)), [])
    //     );
    //   } else if (data) {
    //     instances.push(this.createInstance<T>(context, data));
    //   }
    // });

    return instances;
  }

  /**
   * To be implemented by child class
   */
  public static async all(params: any): Promise<FindAllResponse<any>> {
    return;
  }

  public static async allDataLoop<T extends AbstractGraphQlResource>({ context, ...otherArgs }): Promise<Array<T>> {
    let items: Array<T> = [];
    let nextCursor: string;
    let run = true;

    while (run) {
      const response = await this.all({ context, cursor: nextCursor, ...otherArgs });
      const { pageInfo } = response;
      response.data;

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

    const body = staticResource.extractResourceDataFromRawData(response.body.data)[0];
    if (update && body) {
      this.setData(body);
    }
  }

  public abstract save({ update }: SaveArgs): Promise<void>;

  public async saveAndUpdate(): Promise<void> {
    await this.save({ update: true });
  }

  // public async delete(): Promise<void> {
  //   await this.resource<typeof AbstractGraphQlResource>().request({
  //     http_method: 'delete',
  //     operation: 'delete',
  //     context: this.context,
  //     urlIds: {},
  //     entity: this,
  //   });
  // }
}
