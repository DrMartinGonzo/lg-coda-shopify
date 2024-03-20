import * as coda from '@codahq/packs-sdk';
import { MultipleFetchResponse } from '../../../Fetchers/SyncTableRest';
import { COLLECTION_TYPE__SMART } from '../../../constants';
import { CollectionSyncTableBase } from '../CollectionSyncTableBase';
import { SmartCollectionRestFetcher } from '../smart_collection/SmartCollectionRestFetcher';
import { smartCollectionResource } from '../smart_collection/smartCollectionResource';
import { CustomCollectionRestFetcher } from './CustomCollectionRestFetcher';
import { CustomCollection, customCollectionResource } from './customCollectionResource';

export class CustomCollectionSyncTable extends CollectionSyncTableBase<CustomCollection> {
  constructor(fetcher: CustomCollectionRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(customCollectionResource, fetcher, params);
  }

  afterSync(response: MultipleFetchResponse<CustomCollection>) {
    let { restItems, continuation: superContinuation } = super.afterSync(response);

    /**
     * If we have no more items to sync, we need to sync smart collections
     */
    if (!superContinuation?.nextUrl) {
      const nextCollectionSyncTable = new CollectionSyncTableBase(
        smartCollectionResource,
        new SmartCollectionRestFetcher(this.fetcher.context),
        this.codaParams
      );
      nextCollectionSyncTable.setSyncUrl();

      this.extraContinuationData = {
        ...superContinuation?.extraContinuationData,
        restType: COLLECTION_TYPE__SMART,
      };

      superContinuation = {
        ...superContinuation,
        nextUrl: nextCollectionSyncTable.syncUrl,
        extraContinuationData: this.extraContinuationData,
      };
    }

    return { restItems, continuation: superContinuation };
  }
}
