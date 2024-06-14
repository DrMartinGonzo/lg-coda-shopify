// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionClient } from '../Clients/GraphQlClients';
import { AbstractModel } from '../models/AbstractModel';
import { AbstractModelGraphQlWithMetafields } from '../models/graphql/AbstractModelGraphQlWithMetafields';
import { MetafieldDefinitionModel } from '../models/graphql/MetafieldDefinitionModel';
import { AbstractModelRestWithRestMetafields } from '../models/rest/AbstractModelRestWithMetafields';
import {
  isPrefixedMetaFieldKey,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../models/utils/MetafieldHelper';
import { BaseRow } from '../schemas/CodaRows.types';
import { FieldDependency } from '../schemas/Schema.types';
import { getObjectSchemaEffectiveKey, transformToArraySchema } from '../schemas/schema-utils';
import { arrayUnique } from '../utils/helpers';

// #endregion

// #region Types
type SyncTableDefinition =
  | coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
  | coda.DynamicSyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>;
/** Helper type to extract the parameter values from a SyncTableDef. */

type SyncTableParamValues<
  T extends
    | coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
    | coda.DynamicSyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
> = coda.ParamValues<T['getter']['parameters']>;

export type CodaSyncParams<SyncTableDefT extends SyncTableDefinition = never> = SyncTableDefT extends never
  ? coda.ParamValues<coda.ParamDefs>
  : SyncTableParamValues<SyncTableDefT>;

type ValidateSyncParamsT = (params: any) => void;
type ValidateSyncUpdateT = (prevRow: BaseRow, newRow: BaseRow) => void;

export interface ISyncedResourcesConstructorArgs<T> {
  context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  codaSyncParams: coda.ParamValues<coda.ParamDefs>;
  model: ModelType<T>;
  validateSyncParams?: ValidateSyncParamsT;
  validateSyncUpdate?: ValidateSyncUpdateT;
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

export interface GetSchemaArgs {
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

export abstract class AbstractSyncedResources<T extends AbstractModel> {
  protected data: T[];

  protected readonly model: ModelType<T>;

  protected effectiveStandardFromKeys: string[];
  protected effectiveMetafieldKeys: string[];
  protected supportMetafields: boolean;
  protected shouldSyncMetafields: boolean;
  protected _metafieldDefinitions: MetafieldDefinitionModel[];

  protected readonly prevContinuation: SyncTableContinuation;
  protected continuation: SyncTableContinuation;
  protected pendingExtraContinuationData: any;

  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  protected readonly validateSyncParams?: ValidateSyncParamsT;
  protected readonly validateSyncUpdate?: ValidateSyncUpdateT;

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

  /**
   * Wether an update triggered by a 2-way sync table has metafields in it.
   */
  /*
  protected static hasMetafieldsInUpdate(
    update: coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>
  ) {
    return update.updatedFields.some((fromKey) => isPrefixedMetaFieldKey(fromKey));
  }
  */

  /**
   * Wether a row involved in a 2-way sync table has metafields in it.
   */
  protected static hasMetafieldsInRow(row: BaseRow) {
    return Object.keys(row).some((fromKey) => isPrefixedMetaFieldKey(fromKey));
  }

  constructor({
    codaSyncParams,
    context,
    model,
    validateSyncParams,
    validateSyncUpdate,
  }: ISyncedResourcesConstructorArgs<T>) {
    this.context = context;
    this.codaParams = codaSyncParams;
    this.model = model;
    this.validateSyncParams = validateSyncParams;
    this.validateSyncUpdate = validateSyncUpdate;

    this.prevContinuation = context.sync.continuation as SyncTableContinuation;
    this.continuation = null;
  }

  /**
   * Returns the current class's constructor.
   * This allows accessing the constructor type of the current class.
   */
  protected asStatic() {
    return this.constructor as typeof AbstractSyncedResources<T>;
  }

  public async init() {
    if (this.validateSyncParams) this.validateSyncParams(this.codaParamsMap);
    this.schema = await this.asStatic().getSchema({ context: this.context, codaSyncParams: this.codaParams });

    const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = this.supportMetafields && !!this.effectiveMetafieldKeys.length;
  }

  // TODO: maybe not in abstract
  protected async getMetafieldDefinitions(): Promise<MetafieldDefinitionModel[]> {
    if (this._metafieldDefinitions) return this._metafieldDefinitions;

    const defsData = await MetafieldDefinitionClient.createInstance(this.context).listForOwner({
      ownerType: (
        this.model as unknown as typeof AbstractModelRestWithRestMetafields | typeof AbstractModelGraphQlWithMetafields
      ).metafieldGraphQlOwnerType,
    });
    this._metafieldDefinitions = defsData.map((data) => MetafieldDefinitionModel.createInstance(this.context, data));
    return this._metafieldDefinitions;
  }

  public abstract get codaParamsMap(): any;

  /**
   * Some fields are not returned directly by the API but are derived from a
   * calculation on another field. Since the user may choose not to synchronize
   * this parent field, this function allows adding it according to a dependency
   * array defined in the SyncResource class.
   */
  private handleFieldDependencies() {
    const fields = [...this.effectiveStandardFromKeys];
    this.asStatic().schemaDependencies.forEach((def) => {
      if (
        def.dependencies.some(
          (key) =>
            this.effectiveStandardFromKeys.includes(key) &&
            !this.effectiveStandardFromKeys.includes(def.field as string)
        )
      ) {
        fields.push(def.field as string);
      }
    });

    return arrayUnique<string>(fields);
  }

  protected get syncedStandardFields(): string[] {
    return this.handleFieldDependencies();
  }

  protected get currentLimit(): number {
    return;
  }

  protected abstract getListParams(): any;
  protected abstract codaParamsToListArgs(): any;

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  protected async createInstanceFromData(data: any) {
    return this.model.createInstance(this.context, data);
  }
  protected async createInstanceFromRow(row: BaseRow) {
    return this.model.createInstanceFromRow(this.context, row);
  }

  protected async beforeSync(): Promise<void> {}
  protected async afterSync(): Promise<void> {}
  public abstract executeSync(): Promise<SyncedResourcesSyncResult<typeof this.continuation>>;

  public abstract executeSyncUpdate(
    updates: Array<coda.SyncUpdate<string, string, any>>
  ): Promise<coda.GenericSyncUpdateResult>;

  protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
    // Always include the id property
    return [this.schema.items.idProperty].filter(Boolean).map((key) => getObjectSchemaEffectiveKey(this.schema, key));
  }
}
