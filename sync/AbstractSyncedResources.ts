// #region Imports
import * as coda from '@codahq/packs-sdk';
import { normalizeObjectSchema } from '@codahq/packs-sdk/dist/schema';

import { MetafieldDefinition } from '../Resources/GraphQl/MetafieldDefinition';
import { MetafieldHelper } from '../Resources/Mixed/MetafieldHelper';
import { SyncTableUpdateResult } from '../SyncTableManager/types/SyncTableManager.types';
import { AbstractModel } from '../models/AbstractModel';
import { AbstractModelRestWithMetafields } from '../models/rest/AbstractModelRestWithMetafields';
import { BaseRow } from '../schemas/CodaRows.types';
import { FieldDependency } from '../schemas/Schema.types';
import { getObjectSchemaEffectiveKey, transformToArraySchema } from '../utils/coda-utils';
import { handleFieldDependencies } from '../utils/helpers';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../utils/metafields-utils';

// #endregion

// #region Types
export interface ISyncedResourcesConstructorArgs<T> {
  context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  codaSyncParams: coda.ParamValues<coda.ParamDefs>;
  model: ModelType<T>;
}

export interface SyncedResourcesSyncResult<C extends SyncTableContinuation>
  extends coda.SyncFormulaResult<any, any, any> {
  continuation?: C;
}

export type SyncTableExtraContinuationData = {
  [key: string]: any;
};
export interface SyncTableContinuation extends coda.Continuation {
  extraData: SyncTableExtraContinuationData;
}

interface GetSchemaArgs {
  context: coda.ExecutionContext;
  codaSyncParams?: coda.ParamValues<coda.ParamDefs>;
  normalized?: boolean;
}

export interface ModelType<T> {
  new (...args: any[]): T;
  createInstance(context: coda.ExecutionContext, data: any): T;
  createInstanceFromRow(context: coda.ExecutionContext, row: BaseRow): T;
}
// #endregion

// #region Mixins
type Constructable = new (...args: any[]) => object;

function AddMetafieldsSupportMixin<TBase extends Constructable>(Base: TBase) {
  return class extends Base {
    public effectiveStandardFromKeys: string[];
    public effectiveMetafieldKeys: string[];
    public shouldSyncMetafields: boolean;

    constructor(...args) {
      super(...args);

      const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectiveStandardFromKeys);
      this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
      this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
      this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;
    }
  };
}
// #endregion

export abstract class AbstractSyncedResources<T extends AbstractModel<any>> {
  protected data: T[];

  protected readonly model: ModelType<T>;

  protected effectiveStandardFromKeys: string[];
  protected effectiveMetafieldKeys: string[];
  protected supportMetafields: boolean;
  protected shouldSyncMetafields: boolean;
  protected _metafieldDefinitions: MetafieldDefinition[];

  protected static defaultLimit: number;
  protected currentLimit: number;

  protected readonly prevContinuation: SyncTableContinuation;
  protected continuation: SyncTableContinuation;
  protected pendingExtraContinuationData: any;

  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;

  /** The effective schema for the sync. Can be a static or dynamic schema */
  protected schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  protected static schemaDependencies: FieldDependency<any>[] = [];

  /**
   * Static Coda schema for the resource
   * Must be overriden by subclasses
   */
  public static staticSchema: coda.ObjectSchema<string, string>;
  /**
   * Get the dynamic Coda schema for the resource
   * Must be overriden by subclasses
   */
  public static async getDynamicSchema(params: GetSchemaArgs): Promise<coda.ObjectSchema<string, string> | undefined> {
    return;
  }
  /**
   * Get the current Array Schema for the resource. Dynamic if it exists, else static.
   * Keep the schema in a cache to avoid refetching dynamic schema
   // TODO: Pourquoi est-ce qu'on utilise normalizeObjectSchema ?
   */
  static async getSchema({ context, codaSyncParams = [], normalized = true }: GetSchemaArgs) {
    if (context.sync?.schema) {
      this._schemaCache = context.sync.schema as coda.ArraySchema<coda.ObjectSchema<string, string>>;
    }
    if (!this._schemaCache) {
      const dynamicSchema = await this.getDynamicSchema({ context, codaSyncParams });
      // console.log('dynamicSchema', dynamicSchema);
      // const schema = dynamicSchema ? normalizeObjectSchema(dynamicSchema) : this.staticSchema;
      const schema = dynamicSchema ? dynamicSchema : this.staticSchema;
      this._schemaCache = transformToArraySchema(schema);
    }
    return this._schemaCache;
  }

  constructor({ codaSyncParams, context, model }: ISyncedResourcesConstructorArgs<T>) {
    this.context = context;
    this.codaParams = codaSyncParams;
    this.model = model;

    this.prevContinuation = context.sync.continuation as SyncTableContinuation;
    this.continuation = null;

    this.currentLimit = this.asStatic().defaultLimit;
  }

  /**
   * Returns the current class's constructor.
   * This allows accessing the constructor type of the current class.
   */
  protected asStatic() {
    return this.constructor as typeof AbstractSyncedResources<T>;
  }

  public async init() {
    this.schema = await this.asStatic().getSchema({ context: this.context, codaSyncParams: this.codaParams });

    const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = this.supportMetafields && !!this.effectiveMetafieldKeys.length;
  }

  protected async getMetafieldDefinitions(): Promise<MetafieldDefinition[]> {
    if (this._metafieldDefinitions) return this._metafieldDefinitions;

    this._metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({
      context: this.context,
      ownerType: (this.model as unknown as typeof AbstractModelRestWithMetafields).metafieldGraphQlOwnerType,
    });
    return this._metafieldDefinitions;
  }

  protected abstract get codaParamsMap(): any;

  protected get syncedStandardFields(): string[] {
    return handleFieldDependencies(this.effectiveStandardFromKeys, this.asStatic().schemaDependencies);
  }

  protected abstract getListParams(): any;
  protected abstract codaParamsToListArgs(): any;

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  protected async beforeSync(): Promise<void> {}
  protected async afterSync(): Promise<void> {}
  public abstract executeSync(): Promise<SyncedResourcesSyncResult<typeof this.continuation>>;

  public abstract executeSyncUpdate(
    updates: Array<coda.SyncUpdate<string, string, any>>
  ): Promise<SyncTableUpdateResult>;

  protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
    // Always include the id property
    return [this.schema.items.idProperty].filter(Boolean).map((key) => getObjectSchemaEffectiveKey(this.schema, key));
  }
}