// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../../resources/metafields/utils/metafields-utils-keys';
import { AbstractResource_Synced } from './AbstractResource_Synced';
import { SyncTableRestNew } from './SyncTableRestNew';

// #endregion

export abstract class AbstractSyncTableRestHasMetafields<
  BaseT extends AbstractResource_Synced
> extends SyncTableRestNew<BaseT> {
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
