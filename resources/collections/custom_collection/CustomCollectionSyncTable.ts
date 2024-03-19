import * as coda from '@codahq/packs-sdk';
import { MultipleFetchResponse } from '../../../Fetchers/SyncTableRest';
import { COLLECTION_TYPE__SMART } from '../../../constants';
import { CollectionSyncTableBase } from '../CollectionSyncTableBase';
import { getCollectionSyncTableOfType } from '../collections-helpers';
import { CustomCollectionRestFetcher } from './CustomCollectionRestFetcher';
import { customCollectionResource } from './customCollectionResource';

export class CustomCollectionSyncTable extends CollectionSyncTableBase<typeof customCollectionResource> {
  constructor(fetcher: CustomCollectionRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(customCollectionResource, fetcher, params);
  }

  afterSync(response: MultipleFetchResponse<typeof customCollectionResource>) {
    let { restItems, continuation: superContinuation } = super.afterSync(response);

    /**
     * If we have no more items to sync, we need to sync smart collections
     */
    if (!superContinuation?.nextUrl) {
      const restType = COLLECTION_TYPE__SMART;
      const nextCollectionSyncTable = getCollectionSyncTableOfType(restType, this.codaParams, this.fetcher.context);
      nextCollectionSyncTable.setSyncUrl();
      this.extraContinuationData = {
        ...superContinuation?.extraContinuationData,
        restType,
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
