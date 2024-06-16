// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractModel } from '../../models/AbstractModel';
import { AbstractModelRestWithGraphQlMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { Stringified } from '../../types/utilities';
import { logAdmin } from '../../utils/helpers';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/sync-utils';
import { SyncTableMixedContinuation } from './AbstractSyncedRestResourcesWithGraphQlMetafields';

// #endregion

// #region Types
export type RawBatchData = {
  toProcess: any[];
  remaining: any[];
};

type RestItemsBatchConstructorArgs<T extends AbstractModel> = {
  prevContinuation: SyncTableMixedContinuation | undefined;
  items: T[];
  limit: number;
  reviveItems: (data: any) => T;
};
// #endregion

export class RestItemsBatch<T extends AbstractModelRestWithGraphQlMetafields> {
  public toProcess: T[];
  public remaining: T[];

  constructor({ prevContinuation, items, limit, reviveItems: reviveInstances }: RestItemsBatchConstructorArgs<T>) {
    const previousBatch = prevContinuation?.extraData?.batch
      ? parseContinuationProperty(prevContinuation.extraData.batch)
      : { toProcess: [], remaining: [] };

    this.toProcess = previousBatch.toProcess.map(reviveInstances);
    this.remaining = previousBatch.remaining.map(reviveInstances);

    let msg = '';
    if (prevContinuation?.cursor) {
      msg += `🔁 Fetching remaining graphQL results from same batch`;
    } else {
      let currentItems: T[] = [];
      if (this.remaining.length > 0) {
        currentItems = this.remaining;
        msg += `🔁 ${currentItems.length} items remaining.`;
      } else {
        currentItems = [...items];
        msg += `🟢 Found ${currentItems.length} items to augment.`;
      }
      msg += ` Augmenting ${Math.min(currentItems.length, limit)} items`;
      logAdmin(msg);

      // modified 'currentItems' array after the splice operation, will now contains the elements not extracted for processing
      this.toProcess = currentItems.splice(0, limit);
      this.remaining = currentItems;
    }
  }

  public toString(): Stringified<RawBatchData> {
    const toData = (instance: T) => instance.data;
    return stringifyContinuationProperty({
      toProcess: this.toProcess.map(toData),
      remaining: this.remaining.map(toData),
    });
  }
}
