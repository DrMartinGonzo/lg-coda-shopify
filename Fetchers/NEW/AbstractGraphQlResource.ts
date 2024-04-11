// #region Imports
import * as coda from '@codahq/packs-sdk';
import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';
import { Body } from '@shopify/shopify-api/rest/types';
import { TadaDocumentNode } from 'gql.tada';
import { FragmentOf, ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { GRAPHQL_DEFAULT_API_VERSION } from '../../config/config';
import { graphQlGidToId } from '../../helpers-graphql';
import { GraphQlResourceName, RestResourceSingular } from '../../resources/ShopifyResource.types';
import { fetchMetafieldDefinitionsGraphQl } from '../../resources/metafieldDefinitions/metafieldDefinitions-functions';
import { metafieldDefinitionFragment } from '../../resources/metafieldDefinitions/metafieldDefinitions-graphql';
import { metafieldFieldsFragment } from '../../resources/metafields/metafields-graphql';
import { hasMetafieldsInRow } from '../../resources/metafields/utils/metafields-utils';
import { formatMetaFieldValueForSchema } from '../../resources/metafields/utils/metafields-utils-formatToRow';
import { getMetafieldKeyValueSetsFromUpdate } from '../../resources/metafields/utils/metafields-utils-keyValueSets';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../../resources/metafields/utils/metafields-utils-keys';
import { BaseRow } from '../../schemas/CodaRows.types';
import { MetafieldInput, MetafieldOwnerType, PageInfo } from '../../types/admin.types';
import { arrayUnique, getObjectSchemaEffectiveKey, transformToArraySchema } from '../../utils/helpers';
import { FetchRequestOptions } from '../Fetcher.types';
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
import { CACHE_DEFAULT, GRAPHQL_NODES_LIMIT } from '../../constants';
// import { RestResourceError } from '@shopify/shopify-api';

// #endregion

// #region Types
export type GraphQlResourcePath = string;

interface BaseConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: Body | null;
}

interface GraphQlApiData {
  id: string | null;
  [key: string]: any;
}
export interface GraphQlApiDataWithMetafields extends GraphQlApiData {
  metafields: { nodes: Array<FragmentOf<typeof metafieldFieldsFragment>> };
  restMetafieldInstances?: Array<Metafield>;
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
interface BaseSaveArgs<NodeT extends TadaDocumentNode> extends SaveArgs, BaseArgs<NodeT> {}

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

export type SyncFunctionGraphQl = ({
  cursor,
  maxEntriesPerRun,
}: {
  cursor: string;
  maxEntriesPerRun?: number;
}) => Promise<FindAllResponse<AbstractGraphQlResource>>;
// #endregion

export abstract class AbstractGraphQlResource {
  // TODO: remove ?
  // For instance attributes
  [key: string]: any;

  protected static resourceName: ResourceDisplayName;
  protected static paths: Array<GraphQlResourcePath> = [];
  protected static defaultMaxEntriesPerRun: number = GRAPHQL_NODES_LIMIT;

  protected static Client = GraphQlClientNEW;
  protected static apiVersion = GRAPHQL_DEFAULT_API_VERSION;

  protected static primaryKey = 'id';
  protected static graphQlName: GraphQlResourceName | undefined;
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

  /**
   * Generate a sync function to be used by a SyncTableManager.
   * Must be implemented by child class
   */
  protected static makeSyncFunction(
    params: MakeSyncFunctionArgsGraphQl<AbstractGraphQlResource_Synced, any>
  ): SyncFunctionGraphQl {
    return;
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableGraphQlNew<AbstractGraphQlResource>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableGraphQlNew<AbstractGraphQlResource>(schema, codaSyncParams, context);
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const syncFunction = this.makeSyncFunction({ codaSyncParams, context, syncTableManager });

    const { response, continuation } = await syncTableManager.executeSync({
      sync: syncFunction,
      defaultMaxEntriesPerRun: this.defaultMaxEntriesPerRun,
    });
    return {
      result: response.data.map((data) => data.formatToRow()),
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

export abstract class AbstractGraphQlResource_Synced_HasMetafields extends AbstractGraphQlResource_Synced {
  public apiData: GraphQlApiDataWithMetafields;

  protected static readonly metafieldGraphQlOwnerType: MetafieldOwnerType | undefined;
  protected static metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>>;

  // TODO: this is duplicate code from AbstractResource_Synced_HasMetafields
  protected static async getMetafieldDefinitions(
    context: coda.ExecutionContext,
    includeFakeExtraDefinitions?: boolean
  ) {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;
    this.metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
      { ownerType: this.metafieldGraphQlOwnerType, includeFakeExtraDefinitions },
      context
    );
    return this.metafieldDefinitions;
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    if (hasMetafieldsInRow(newRow)) {
      const metafieldDefinitions = await this.getMetafieldDefinitions(context);
      const metafieldSets = await getMetafieldKeyValueSetsFromUpdate(newRow, metafieldDefinitions, context);
      const instance: AbstractGraphQlResource_Synced_HasMetafields = new (this as any)({
        context,
        fromRow: {
          row: newRow,
          metafields: metafieldSets.map((set) => Metafield.createInstancesFromMetafieldSet(context, set, newRow.id)),
        },
      });
      await instance.saveAndUpdate();
      return { ...prevRow, ...instance.formatToRow() };
    }

    return super.handleRowUpdate(prevRow, newRow, context);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO: fix any
  protected setData(data: typeof this.apiData): void {
    this.apiData = data;

    /**
     * Convert GraphQl Metafields to Rest Metafields
     */
    if (data.metafields?.nodes && data.metafields.nodes.length) {
      this.apiData.restMetafieldInstances = data.metafields.nodes.map((m) =>
        Metafield.createInstanceFromGraphQlMetafield(this.context, m, data.id)
      );
    }
  }

  protected async _baseSave<NodeT extends TadaDocumentNode>({
    update = false,
    documentNode,
    variables,
  }: BaseSaveArgs<NodeT> & { variables: { metafields?: Array<MetafieldInput> } }): Promise<void> {
    const { restMetafieldInstances } = this.apiData;

    if (restMetafieldInstances && restMetafieldInstances.length) {
      const staticOwnerResource = this.resource<typeof AbstractGraphQlResource_Synced_HasMetafields>();
      const { primaryKey } = staticOwnerResource;
      const isUpdate = this.apiData[primaryKey];

      /**
       * When performing an update on a GraphQl resource, we must
       * create/update/delete metafields individually using Rest, as its easier
       * since it doesn't require to know the metafield ID in advance
       */
      if (isUpdate) {
        const newMetafields = await Promise.all(
          restMetafieldInstances.map(async (m: Metafield) => {
            await m.saveAndUpdate();
            return m;
          })
        );

        await super._baseSave({ update, documentNode, variables });
        if (update) this.apiData.restMetafieldInstances = newMetafields;
        return;
      }
      //
      /**
       * When creating a resource, we can create the metafields in bulk directly
       * on the main request. We have to use the metafields data and not the
       * Metafield instances themselves.
       * */
      else {
        variables.metafields = this.apiData.restMetafieldInstances.map((metafield: Metafield) => {
          const { key, namespace, type, value } = metafield.apiData;
          return {
            key,
            namespace,
            type,
            value,
          };
        });
      }
    }

    await super._baseSave({ update, documentNode, variables });
  }

  // TODO: remove ?
  protected formatMetafields() {
    const formattedMetafields: Record<string, any> = {};
    if (this.apiData.metafields?.nodes) {
      const metafields = readFragment(
        metafieldFieldsFragment,
        this.apiData.metafields.nodes as Array<FragmentOf<typeof metafieldFieldsFragment>>
      );
      metafields.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        formattedMetafields[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      });
    }
    return formattedMetafields;
  }
}
