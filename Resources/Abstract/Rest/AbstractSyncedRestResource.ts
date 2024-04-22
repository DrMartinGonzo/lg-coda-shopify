// #region Imports
import * as coda from '@codahq/packs-sdk';

import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';
import { SyncTableManagerRest } from '../../../SyncTableManager/Rest/SyncTableManagerRest';
import { SyncTableSyncResult, SyncTableUpdateResult } from '../../../SyncTableManager/types/SyncTable.types';
import { MakeSyncRestFunctionArgs, SyncRestFunction } from '../../../SyncTableManager/types/SyncTableManager.types';
import { REST_DEFAULT_LIMIT } from '../../../constants';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { getObjectSchemaEffectiveKey, transformToArraySchema } from '../../../utils/coda-utils';
import { arrayUnique } from '../../../utils/helpers';
import { FromRow, ISyncedResource, SyncedResourceConstructorArgs } from '../../types/Resource.types';
import { GetSchemaArgs } from '../AbstractResource';
import { AbstractRestResource } from './AbstractRestResource';

// #endregion

export abstract class AbstractSyncedRestResource extends AbstractRestResource implements ISyncedResource {
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  protected static readonly defaultLimit: number = REST_DEFAULT_LIMIT;

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
  protected static makeSyncTableManagerSyncFunction({
    context,
  }: MakeSyncRestFunctionArgs<AbstractSyncedRestResource, any>): SyncRestFunction<AbstractSyncedRestResource> {
    return ({ nextPageQuery = {} }) =>
      this.baseFind({
        context,
        urlIds: {},
        ...nextPageQuery,
      });
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableManagerRest<AbstractSyncedRestResource>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRest<AbstractSyncedRestResource>({ schema, codaSyncParams, context });
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const sync = this.makeSyncTableManagerSyncFunction({ codaSyncParams, context, syncTableManager });

    const { response, continuation } = await syncTableManager.executeSync({
      sync: sync,
      defaultLimit: this.defaultLimit,
    });
    return {
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    const instance: AbstractSyncedRestResource = new (this as any)({ context, fromRow: { row: newRow } });
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
  constructor({ context, fromData, fromRow }: SyncedResourceConstructorArgs) {
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
