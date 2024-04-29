// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractResource } from '../../Resources/Abstract/AbstractResource';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../../utils/metafields-utils';
import { AbstractSyncTableManager } from './AbstractSyncTableManager';
import { ISyncTableManagerConstructorArgs, ISyncTableManagerWithMetafields } from '../types/SyncTableManager.types';

// #endregion

export abstract class AbstractSyncTableManagerWithMetafields<
    BaseT extends AbstractResource,
    C extends coda.Continuation
  >
  extends AbstractSyncTableManager<BaseT, C>
  implements ISyncTableManagerWithMetafields
{
  public effectiveMetafieldKeys: string[];
  public shouldSyncMetafields: boolean;

  constructor({ schema, codaSyncParams, context }: ISyncTableManagerConstructorArgs) {
    super({ schema, codaSyncParams, context });

    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectiveStandardFromKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;
  }
}
