import * as coda from '@codahq/packs-sdk';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { redirectFieldDependencies } from '../../schemas/syncTable/RedirectSchema';
import { RedirectRestFetcher } from './RedirectRestFetcher';
import { Redirect, redirectResource } from './redirectResource';
import { Sync_Redirects } from './redirects-coda';

export class RedirectSyncTable extends SyncTableRest<Redirect> {
  constructor(fetcher: RedirectRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(redirectResource, fetcher, params);
  }

  setSyncParams() {
    const [path, target] = this.codaParams as SyncTableParamValues<typeof Sync_Redirects>;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, redirectFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      path,
      target,
    });
  }
}
