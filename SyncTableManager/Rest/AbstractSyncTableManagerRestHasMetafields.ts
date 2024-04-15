// #region Imports
import * as coda from '@codahq/packs-sdk';

import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../../utils/metafields-utils';
import { AbstractSyncedRestResource } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { SyncTableManagerRest } from './SyncTableManagerRest';

// #endregion

export abstract class AbstractSyncTableManagerRestHasMetafields<
  BaseT extends AbstractSyncedRestResource
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
