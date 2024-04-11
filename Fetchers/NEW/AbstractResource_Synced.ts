// #region Imports
import * as coda from '@codahq/packs-sdk';

import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';
import { BaseRow } from '../../schemas/CodaRows.types';
import { arrayUnique, getObjectSchemaEffectiveKey, transformToArraySchema } from '../../utils/helpers';
import { SyncTableParamValues, SyncTableSyncResult, SyncTableUpdateResult } from '../SyncTable/SyncTable.types';
import { AbstractResource, BaseConstructorArgs, FindAllResponse } from './AbstractResource';
import { Metafield } from './Resources/Metafield';
import { SearchParams } from './RestClientNEW';
import { SyncTableRestNew } from './SyncTableRestNew';

// #endregion

// #region Types
export interface BaseConstructorSyncedArgs extends BaseConstructorArgs {
  fromRow?: FromRow;
}

export type MakeSyncFunctionArgs<
  BaseT extends AbstractResource_Synced = AbstractResource_Synced,
  SyncTableDefT extends SyncTableDefinition = never,
  SyncTableManagerT extends SyncTableRestNew<BaseT> = SyncTableRestNew<BaseT>
> = {
  context: coda.SyncExecutionContext;
  codaSyncParams: CodaSyncParams<SyncTableDefT>;
  syncTableManager?: SyncTableManagerT;
};

export type SyncFunction = (
  nextPageQuery: SearchParams,
  adjustLimit?: number
) => Promise<FindAllResponse<AbstractResource_Synced>>;

export interface FromRow<RowT extends BaseRow = BaseRow> {
  row: Partial<RowT> | null;
  metafields?: Array<Metafield>;
}

export type SyncTableDefinition =
  | coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
  | coda.DynamicSyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>;

export type CodaSyncParams<SyncTableDefT extends SyncTableDefinition = never> = SyncTableDefT extends never
  ? coda.ParamValues<coda.ParamDefs>
  : SyncTableParamValues<SyncTableDefT>;

export interface GetSchemaArgs {
  context: coda.ExecutionContext;
  codaSyncParams?: coda.ParamValues<coda.ParamDefs>;
  normalized?: boolean;
}

// #endregion

export abstract class AbstractResource_Synced extends AbstractResource {
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;

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
   * Generate a sync function to be used by a SyncTableManager
   */
  protected static makeSyncFunction({ context }: MakeSyncFunctionArgs<AbstractResource_Synced, any>): SyncFunction {
    return (nextPageQuery: SearchParams = {}) =>
      this.baseFind({
        context,
        urlIds: {},
        ...nextPageQuery,
      });
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableRestNew<AbstractResource_Synced>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableRestNew<AbstractResource_Synced>(schema, codaSyncParams, context);
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const syncFunction = this.makeSyncFunction({ codaSyncParams, context, syncTableManager });

    const { response, continuation } = await syncTableManager.executeSync({ sync: syncFunction });
    return {
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    const instance: AbstractResource_Synced = new (this as any)({ context, fromRow: { row: newRow } });
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
