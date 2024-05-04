// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractResource, FindAllResponseBase } from '../../Resources/Abstract/AbstractResource';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../../utils/metafields-utils';
import {
  ExecuteSyncBaseArgs,
  ISyncTableManager,
  ISyncTableManagerConstructorArgs,
  SyncGraphQlFunction,
  SyncRestFunction,
  SyncTableManagerResult,
} from '../types/SyncTableManager.types';

// #endregion

// #region Mixins
type Constructable = new (...args: any[]) => object;

export function AddMetafieldsSupportMixin<TBase extends Constructable>(Base: TBase) {
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

export abstract class AbstractSyncTableManager<
  BaseT extends AbstractResource,
  C extends coda.Continuation,
  SyncF extends CallableFunction
> implements ISyncTableManager
{
  public effectiveStandardFromKeys: string[];

  public prevContinuation: C;
  public continuation: C;
  public extraContinuationData: any;

  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected readonly schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;

  protected readonly resource: typeof AbstractResource;

  protected syncFunction: SyncF;

  constructor({ schema, codaSyncParams, context, resource }: ISyncTableManagerConstructorArgs) {
    this.context = context;
    this.codaParams = codaSyncParams;
    this.schema = schema;
    this.resource = resource;
    this.continuation = null;
    this.prevContinuation = context.sync.continuation as C;

    const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
    this.effectiveStandardFromKeys = effectivePropertyKeys;
  }

  public setSyncFunction(syncFunction: SyncF) {
    this.syncFunction = syncFunction;
  }

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  abstract executeSync({
    defaultLimit,
  }: ExecuteSyncBaseArgs): Promise<SyncTableManagerResult<C, FindAllResponseBase<BaseT>>>;
}
