// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractResource, FindAllResponseBase } from '../../Resources/Abstract/AbstractResource';
import { FieldDependency } from '../../schemas/Schema.types';
import { handleFieldDependencies } from '../../utils/helpers';
import {
  ExecuteSyncBaseArgs,
  ISyncTableManager,
  ISyncTableManagerConstructorArgs,
  SyncTableManagerResult,
} from '../types/SyncTableManager.types';

// #endregion

// TODO: BaseT should extend AbstractSyncedResource when this one will be done
export abstract class AbstractSyncTableManager<BaseT extends AbstractResource, C extends coda.Continuation>
  implements ISyncTableManager
{
  protected readonly context: coda.SyncExecutionContext;
  /** Array of Coda formula parameters */
  protected readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected readonly schema: coda.ArraySchema<coda.ObjectSchema<string, string>>;

  public effectiveStandardFromKeys: string[];

  public prevContinuation: C;
  public continuation: C;
  public extraContinuationData: any;

  constructor({ schema, codaSyncParams, context }: ISyncTableManagerConstructorArgs) {
    this.context = context;
    this.codaParams = codaSyncParams;

    this.continuation = null;
    this.prevContinuation = context.sync.continuation as C;

    this.schema = schema;

    this.effectiveStandardFromKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
  }

  public getSyncedStandardFields(dependencies?: Array<FieldDependency<any>>): string[] {
    return handleFieldDependencies(this.effectiveStandardFromKeys, dependencies);
  }

  // protected validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  abstract executeSync({
    sync,
    defaultLimit,
  }: ExecuteSyncBaseArgs): Promise<SyncTableManagerResult<C, FindAllResponseBase<BaseT>>>;
}
