// #region Imports
import * as coda from '@codahq/packs-sdk';

import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';
import { Body } from '@shopify/shopify-api';
import {
  ISyncTableManager,
  ISyncTableManagerConstructorArgs,
  SyncTableSyncResult,
  SyncTableUpdateResult,
} from '../../SyncTableManager/types/SyncTableManager.types';
import { Identity } from '../../constants';
import { BaseRow } from '../../schemas/CodaRows.types';
import { getObjectSchemaEffectiveKey, transformToArraySchema } from '../../utils/coda-utils';
import { arrayUnique, isDefinedEmpty } from '../../utils/helpers';
import { FromRow, ResourceConstructorArgs } from '../types/Resource.types';
import { SaveArgs } from './GraphQl/AbstractGraphQlResource';

// #endregion

// #region Types
export interface GetSchemaArgs {
  context: coda.ExecutionContext;
  codaSyncParams?: coda.ParamValues<coda.ParamDefs>;
  normalized?: boolean;
}

export interface FindAllResponseBase<T> {
  data: T[];
  headers: coda.FetchResponse['headers'];
  pageInfo?: any;
}
// #endregion

// TODO: implement readOnlyAttributes

export abstract class AbstractResource {
  protected static readonly defaultLimit: number;
  public static readonly displayName: Identity;
  public apiData: any;

  protected static readonly primaryKey: string = 'id';
  protected static readonly readOnlyAttributes: string[] = [];

  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  protected context: coda.ExecutionContext;
  protected static SyncTableManager: new (params: ISyncTableManagerConstructorArgs) => ISyncTableManager;

  /**
   * Get the static Coda schema for the resource
   */
  public static getStaticSchema(): coda.ObjectSchema<string, string> {
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
   * Nettoyage des donnée brutes.
   *
   * Soit la valeur est undefined et elle ne sera pas présente dans apiData,
   * donc dans les updates, soit elle a une valeur mais considérée comme "vide"
   * est on la force en `null`
   */
  protected cleanRawData(data: any): any {
    // Ce sont surtout les instances de Metafields qui sont concernées par ça pour l'instant
    if (data instanceof AbstractResource) return data;

    if (typeof data !== 'object') {
      if (isDefinedEmpty(data)) {
        return null;
      } else {
        return data;
      }
    } else {
      const ret = {};
      for (let key in data) {
        if (data[key] !== undefined) {
          if (Array.isArray(data[key])) {
            ret[key] = data[key].map((d) => this.cleanRawData(d));
          } else if (typeof data[key] === 'object') {
            const cleanedObject = this.cleanRawData(data[key]);
            if (Object.keys(cleanedObject).length) {
              ret[key] = cleanedObject;
            }
          }
          //
          /**
           * Apparemment Coda renvoie une string et pas un nombre lors d'une update,
           * du coup certaines valeurs peuvent être égales à ''. Dans ce cas on les force comme null
           */
          else if (isDefinedEmpty(data[key])) {
            ret[key] = null;
          } else {
            ret[key] = data[key];
          }
        }
      }
      return ret;
    }
  }

  protected static validateParams(params: any): boolean {
    return true;
  }

  protected static validateUpdateJob(prevRow: BaseRow, newRow: BaseRow): boolean {
    return true;
  }

  /**
   * Generate a sync function to be used by a SyncTableManager.
   * Should be overridden by subclasses
   */
  public static makeSyncTableManagerSyncFunction(params): (params) => Promise<any> {
    return;
  }

  /**
   * Get the appropriate SyncTableManager for this resource
   * Should be overridden by subclasses
   */
  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<ISyncTableManager> {
    return new this.SyncTableManager({
      context,
      schema: await this.getArraySchema({ codaSyncParams, context }),
      codaSyncParams,
      resource: this,
    });
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    syncTableManager.setSyncFunction(
      this.makeSyncTableManagerSyncFunction({ codaSyncParams, context, syncTableManager })
    );

    const { response, continuation } = await syncTableManager.executeSync({ defaultLimit: this.defaultLimit });
    return {
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }

  public static getRequiredPropertiesForUpdate(schema: coda.ArraySchema<coda.ObjectSchema<string, string>>) {
    // Always include the id property
    return [schema.items.idProperty].filter(Boolean).map((key) => getObjectSchemaEffectiveKey(schema, key));
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    this.validateUpdateJob(prevRow, newRow);

    const instance: AbstractResource = new (this as any)({ context, fromRow: { row: newRow } });
    await instance.saveAndUpdate();
    return { ...prevRow, ...instance.formatToRow() };
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

  public static createInstance<T extends AbstractResource = AbstractResource>(
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
  constructor({ context, fromData, fromRow }: ResourceConstructorArgs) {
    this.context = context;

    if (fromData) {
      this.setData(fromData);
    }
    if (fromRow) {
      this.setDataFromRow(fromRow);
    }
  }

  protected setData(data: Body): void {
    this.apiData = this.cleanRawData(data);
  }

  protected setDataFromRow(fromRow: FromRow): void {
    this.setData(this.formatToApi(fromRow));
  }

  /**
   * Returns the current class's constructor as a type BaseT, which defaults to the class itself.
   * This allows accessing the constructor type of the current class.
   */
  protected resource<BaseT extends typeof AbstractResource = typeof AbstractResource>(): BaseT {
    return this.constructor as BaseT;
  }

  public abstract formatToRow(...args: any[]): BaseRow;
  protected abstract formatToApi(...args: any[]): any;

  public abstract save(params: SaveArgs): Promise<void>;
  public async saveAndUpdate(): Promise<void> {
    await this.save({ update: true });
  }
}
