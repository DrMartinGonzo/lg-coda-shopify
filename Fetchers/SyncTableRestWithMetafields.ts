// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceWithMetafields } from '../resources/Resource.types';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../resources/metafields/metafields-helpers';
import { MetafieldOwnerType } from '../types/admin.types';
import { RestClientWithRestMetafields } from './RestClientWithRestMetafields';
import { SyncTableRest } from './SyncTableRest';

// #endregion

export interface SyncTableSyncResult {
  result: Array<any>;
  continuation?: any;
}

export interface SyncTableUpdateResult {
  result: Array<any>;
}

export abstract class SyncTableRestWithMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends SyncTableRest<ResourceT> {
  effectivePropertyKeys: string[];
  effectiveStandardFromKeys: string[];
  effectiveMetafieldKeys: string[];
  shouldSyncMetafields: boolean;

  readonly fetcher: RestClientWithRestMetafields<ResourceT>;

  constructor(resource: ResourceT, fetcher: RestClient<ResourceT>, codaParams: coda.ParamValues<coda.ParamDefs>) {
    super(resource, fetcher, codaParams);
  }


    this.effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;
  }

  abstract executeSyncWithMetafields(schema: any): Promise<SyncTableSyncResult>;

  abstract augmentSyncWithMetafields(): Promise<SyncTableSyncResult>;
}
