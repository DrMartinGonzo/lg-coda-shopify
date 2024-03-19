import * as coda from '@codahq/packs-sdk';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { pageFieldDependencies } from '../../schemas/syncTable/PageSchema';
import { PageRestFetcher } from './PageRestFetcher';
import { Page, pageResource } from './pageResource';
import { Sync_Pages } from './pages-coda';

export class PageSyncTable extends SyncTableRest<Page> {
  constructor(fetcher: PageRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(pageResource, fetcher, params);
  }

  setSyncParams() {
    const [syncMetafields, created_at, updated_at, published_at, handle, published_status, since_id, title] = this
      .codaParams as SyncTableParamValues<typeof Sync_Pages>;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, pageFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      published_at_min: published_at ? published_at[0] : undefined,
      published_at_max: published_at ? published_at[1] : undefined,
      handle,
      // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
      // TODO: calculate best possible value based on effectiveMetafieldKeys.length
      limit: this.restLimit,
      published_status,
      since_id,
      title,
    });
  }
}
