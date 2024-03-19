import * as coda from '@codahq/packs-sdk';

import { SyncTableRest } from '../../Fetchers/SyncTableRest';
import { cleanQueryParams } from '../../helpers-rest';
import { ShopRestFetcher } from './ShopRestFetcher';
import { Shop, shopResource } from './shopResource';

export class ShopSyncTable extends SyncTableRest<Shop> {
  constructor(fetcher: ShopRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(shopResource, fetcher, params);
  }

  setSyncParams() {
    // const [syncMetafields] = this.codaParams as SyncTableParamValues<typeof Sync_Shops>;
    this.syncParams = cleanQueryParams({
      fields: this.effectiveStandardFromKeys.filter((key) => !['admin_url'].includes(key)).join(','),
    });
  }
}
