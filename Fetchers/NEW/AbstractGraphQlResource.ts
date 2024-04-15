// #region Imports
import * as coda from '@codahq/packs-sdk';
import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';
import { Body } from '@shopify/shopify-api/rest/types';
import { TadaDocumentNode } from 'gql.tada';
import { FragmentOf, ResultOf, VariablesOf } from '../../utils/graphql';

import { GRAPHQL_DEFAULT_API_VERSION } from '../../config/config';
import { CACHE_DEFAULT, GRAPHQL_NODES_LIMIT } from '../../constants';
import { graphQlGidToId } from '../../helpers-graphql';
import { GraphQlResourceName } from '../../resources/ShopifyResource.types';
import { metafieldFieldsFragment } from '../../resources/metafields/metafields-graphql';
import { BaseRow } from '../../schemas/CodaRows.types';
import { PageInfo } from '../../types/admin.types';
import { arrayUnique, getObjectSchemaEffectiveKey, transformToArraySchema } from '../../utils/helpers';
import { SyncTableSyncResult, SyncTableUpdateResult } from '../SyncTable/SyncTable.types';
import { BaseContext, ResourceDisplayName } from './AbstractResource';
import {
  BaseConstructorSyncedArgs,
  CodaSyncParams,
  FromRow,
  GetSchemaArgs,
  SyncTableDefinition,
} from './AbstractResource_Synced';
import { ShopifyGraphQlRequestCost } from './GraphQLError';
import { GraphQlClientNEW, GraphQlRequestReturn } from './GraphQlClientNEW';
import { Metafield } from './Resources/Metafield';
import { SyncTableGraphQlNew } from './SyncTableGraphQlNew';
// import { RestResourceError } from '@shopify/shopify-api';

// #endregion

// #region Types
export type GraphQlResourcePath = string;

interface BaseConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: Body | null;
}

export interface GraphQlApiData {
  id: string | null;
  [key: string]: any;
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

export interface FindAllResponse<T = AbstractGraphQlResource> {
  data: T[];
  headers: coda.FetchResponse['headers'];
  cost: ShopifyGraphQlRequestCost;
  // lastMaxEntriesPerRun: number;
  pageInfo?: PageInfo;
}

export type MakeSyncFunctionArgsGraphQl<
  BaseT extends AbstractGraphQlResource = AbstractGraphQlResource,
  SyncTableDefT extends SyncTableDefinition = never,
  SyncTableManagerT extends SyncTableGraphQlNew<BaseT> = SyncTableGraphQlNew<BaseT>
> = {
  context: coda.SyncExecutionContext;
  codaSyncParams: CodaSyncParams<SyncTableDefT>;
  syncTableManager?: SyncTableManagerT;
};

export type SyncTableManagerSyncFunction = ({
  cursor,
  maxEntriesPerRun,
}: {
  cursor: string;
  maxEntriesPerRun?: number;
}) => Promise<FindAllResponse<AbstractGraphQlResource>>;
// #endregion

export abstract class AbstractGraphQlResource {
  static readonly displayName: ResourceDisplayName;

  protected static Client = GraphQlClientNEW;
  protected static apiVersion = GRAPHQL_DEFAULT_API_VERSION;

  protected static primaryKey = 'id';
  protected static graphQlName: GraphQlResourceName | undefined;
  protected static defaultMaxEntriesPerRun: number = GRAPHQL_NODES_LIMIT;
  protected static paths: Array<GraphQlResourcePath> = [];

  protected static readOnlyAttributes: string[] = [];

  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  protected context: coda.ExecutionContext;

  public apiData: any;

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

  protected static async request<NodeT extends TadaDocumentNode = TadaDocumentNode>({
    context,
    ...requestArgs
  }: RequestArgs<NodeT>): Promise<GraphQlRequestReturn<NodeT>> {
    const client = new this.Client({ context, apiVersion: this.apiVersion });
    return client.request<NodeT>(requestArgs);
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

  protected static createInstance<T extends AbstractGraphQlResource = AbstractGraphQlResource>(
    context: coda.ExecutionContext,
    data: Body,
    prevInstance?: T
  ): T {
    const instance: T = prevInstance ? prevInstance : new (this as any)({ context });

    if (data) {
      instance.setData(data);
    }

    return instance;
  }

  /**
   * To be implemented by child class
   */
  public static async all(params: any): Promise<FindAllResponse<AbstractGraphQlResource>> {
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
  constructor({ context, fromData }: BaseConstructorArgs) {
    this.context = context;

    if (fromData) {
      this.setData(fromData);
    }
  }

  get graphQlGid(): string {
    return this.apiData.id;
  }
  get restId(): number {
    return graphQlGidToId(this.apiData.id);
  }

  /**
   * Returns the current class's constructor as a type BaseT, which defaults to the class itself.
   * This allows accessing the constructor type of the current class.
   */
  protected resource<BaseT extends typeof AbstractGraphQlResource = typeof AbstractGraphQlResource>(): BaseT {
    return this.constructor as unknown as BaseT;
  }

  protected setData(data: Body): void {
    this.apiData = data;
  }

  protected async _baseSave<NodeT extends TadaDocumentNode>({
    update = false,
    documentNode,
    variables,
  }: BaseSaveArgs<NodeT>): Promise<void> {
    const staticResource = this.resource();
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
  //   await this.resource().request({
  //     http_method: 'delete',
  //     operation: 'delete',
  //     context: this.context,
  //     urlIds: {},
  //     entity: this,
  //   });
  // }

  public request<NodeT extends TadaDocumentNode = TadaDocumentNode>(args: RequestArgs<NodeT>) {
    return this.resource().request<NodeT>(args);
  }
}

export abstract class AbstractGraphQlResource_Synced extends AbstractGraphQlResource {
  /**
   * Get the static Coda schema for the resource
   */
  public static getStaticSchema() {
    return;
  }

  /**
   * Get the dynamic Coda schema for the resource
   */
  public static async getDynamicSchema(params: GetSchemaArgs): Promise<coda.ObjectSchema<string, string> | undefined> {
    return;
  }

  /**
   * Get the current Array Schema for the resource. Dynamic if it exists, else static.
   * Keep the schema in a cache to avoid refetching dynamic schema
   */
  static async getArraySchema({ context, codaSyncParams = [], normalized = true }: GetSchemaArgs) {
    if (context.sync?.schema) {
      this._schemaCache = context.sync.schema as unknown as coda.ArraySchema<coda.ObjectSchema<string, string>>;
    }
    if (!this._schemaCache) {
      const dynamicSchema = await this.getDynamicSchema({ context, codaSyncParams });
      const schema = dynamicSchema ? normalizeObjectSchema(dynamicSchema) : this.getStaticSchema();
      this._schemaCache = transformToArraySchema(schema);
    }
    return this._schemaCache;
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableGraphQlNew<AbstractGraphQlResource_Synced>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableGraphQlNew<AbstractGraphQlResource_Synced>(schema, codaSyncParams, context);
  }

  /**
   * Generate a sync function to be used by a SyncTableManager.
   * Should be overridden by subclasses
   */
  protected static makeSyncTableManagerSyncFunction(
    params: MakeSyncFunctionArgsGraphQl<AbstractGraphQlResource_Synced, any>
  ): SyncTableManagerSyncFunction {
    return ({ cursor = null, maxEntriesPerRun }) => this.all({ cursor, maxEntriesPerRun, ...params });
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const syncFunction = this.makeSyncTableManagerSyncFunction({ codaSyncParams, context, syncTableManager });

    const { response, continuation } = await syncTableManager.executeSync({
      sync: syncFunction,
      defaultMaxEntriesPerRun: this.defaultMaxEntriesPerRun,
    });
    return {
      result: response.data.map((data: AbstractGraphQlResource_Synced) => data.formatToRow()),
      continuation,
    };
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    const instance: AbstractGraphQlResource_Synced = new (this as any)({ context, fromRow: { row: newRow } });
    await instance.saveAndUpdate();
    return { ...prevRow, ...instance.formatToRow() };
  }

  public static getRequiredPropertiesForUpdate(schema: coda.ArraySchema<coda.ObjectSchema<string, string>>) {
    // Always include the id property
    return [schema.items.idProperty].filter(Boolean).map((key) => getObjectSchemaEffectiveKey(schema, key));
  }

  public static async syncUpdate(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableUpdateResult> {
    const schema = await this.getArraySchema({ context, codaSyncParams });

    const completed = await Promise.allSettled(
      updates.map(async (update) => {
        const includedProperties = arrayUnique(
          update.updatedFields.concat(this.getRequiredPropertiesForUpdate(schema))
        );

        const prevRow = update.previousValue as BaseRow;
        const newRow = Object.fromEntries(
          Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
        ) as BaseRow;

        return this.handleRowUpdate(prevRow, newRow, context);
      })
    );

    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  constructor({ context, fromData, fromRow }: BaseConstructorSyncedArgs) {
    super({ context, fromData });
    if (fromRow) {
      this.setDataFromRow(fromRow);
    }
  }

  public abstract formatToRow(...args: any[]): BaseRow;
  protected abstract formatToApi(...args: any[]): any;

  protected setDataFromRow(fromRow: FromRow): void {
    this.setData(this.formatToApi(fromRow));
  }
}
