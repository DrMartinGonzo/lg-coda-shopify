// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../resourcesOld/metafields/utils/metafields-utils-keys';
import { AbstractResource_Synced } from '../Resources/AbstractResource_Synced';
import { SyncTableManagerRest } from './SyncTableManagerRest';

// #endregion

export abstract class AbstractSyncTableManagerRestHasMetafields<
  BaseT extends AbstractResource_Synced
> extends SyncTableManagerRest<BaseT> {
  public effectiveStandardFromKeys: string[];
  public effectiveMetafieldKeys: string[];
  public shouldSyncMetafields: boolean;

  constructor(
    schema: coda.ArraySchema<coda.ObjectSchema<string, string>>,
    codaParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ) {
    super(schema, codaParams, context);

    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectiveStandardFromKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;
  }
}
