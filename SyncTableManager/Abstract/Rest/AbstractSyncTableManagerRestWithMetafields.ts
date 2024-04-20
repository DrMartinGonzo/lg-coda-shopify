// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractSyncedRestResource } from '../../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { AbstractSyncTableManagerWithMetafields } from '../AbstractSyncTableManagerWithMetafields';
import {
  ExecuteRestSyncArgs,
  ISyncTableManagerConstructorArgs,
  ISyncTableManagerWithMetafields,
  SyncTableManagerRestResult,
} from '../../types/SyncTableManager.types';
import { SyncTableManagerRest } from '../../Rest/SyncTableManagerRest';

// #endregion

export abstract class AbstractSyncTableManagerRestWithMetafields<
    BaseT extends AbstractSyncedRestResource,
    C extends coda.Continuation
  >
  extends AbstractSyncTableManagerWithMetafields<BaseT, C>
  implements ISyncTableManagerWithMetafields
{
  protected parentSyncTableManager: SyncTableManagerRest<BaseT>;

  constructor({ schema, codaSyncParams, context }: ISyncTableManagerConstructorArgs) {
    super({ schema, codaSyncParams, context });
    this.parentSyncTableManager = new SyncTableManagerRest({ schema, codaSyncParams, context });
  }

  public abstract executeSync({
    sync,
    defaultLimit,
  }: ExecuteRestSyncArgs<BaseT>): Promise<SyncTableManagerRestResult<typeof this.continuation, BaseT>>;
}
