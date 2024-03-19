import * as coda from '@codahq/packs-sdk';
import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { REST_DEFAULT_LIMIT } from '../../constants';
import { handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { collectFieldDependencies } from '../../schemas/syncTable/CollectSchema';
import { CollectRestFetcher } from './CollectRestFetcher';
import { Collect, collectResource } from './collectResource';

import type { Sync_Collects } from './collects-coda';

export class CollectSyncTable extends SyncTableRest<Collect> {
  constructor(fetcher: CollectRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(collectResource, fetcher, params);
  }
  setSyncParams() {
    const [collectionId] = this.codaParams as SyncTableParamValues<typeof Sync_Collects>;
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, collectFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: REST_DEFAULT_LIMIT,
      collection_id: collectionId,
    });

    return this.syncParams;
  }
}
