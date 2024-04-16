// #region Imports
import * as coda from '@codahq/packs-sdk';

import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';
import { SyncTableManagerGraphQl } from '../../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import { SyncTableSyncResult, SyncTableUpdateResult } from '../../../SyncTableManager/types/SyncTable.types';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { getObjectSchemaEffectiveKey, transformToArraySchema } from '../../../utils/coda-utils';
import { arrayUnique } from '../../../utils/helpers';
import {
  BaseConstructorSyncedArgs,
  CodaSyncParams,
  FromRow,
  GetSchemaArgs,
  SyncTableDefinition,
} from '../Rest/AbstractSyncedRestResource';
import { AbstractGraphQlResource, FindAllResponse } from './AbstractGraphQlResource';

// #endregion

// #region Types
export type MakeSyncFunctionArgsGraphQl<
  BaseT extends AbstractSyncedGraphQlResource = AbstractSyncedGraphQlResource,
  SyncTableDefT extends SyncTableDefinition = never,
  SyncTableManagerT extends SyncTableManagerGraphQl<BaseT> = SyncTableManagerGraphQl<BaseT>
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
}) => Promise<FindAllResponse<AbstractSyncedGraphQlResource>>;

// #endregion

export abstract class AbstractSyncedGraphQlResource extends AbstractGraphQlResource {
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;

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
  ): Promise<SyncTableManagerGraphQl<AbstractSyncedGraphQlResource>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerGraphQl<AbstractSyncedGraphQlResource>(schema, codaSyncParams, context);
  }

  /**
   * Generate a sync function to be used by a SyncTableManager.
   * Should be overridden by subclasses
   */
  protected static makeSyncTableManagerSyncFunction(
    params: MakeSyncFunctionArgsGraphQl<AbstractSyncedGraphQlResource, any>
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
      result: response.data.map((data: AbstractSyncedGraphQlResource) => data.formatToRow()),
      continuation,
    };
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    const instance: AbstractSyncedGraphQlResource = new (this as any)({ context, fromRow: { row: newRow } });
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
