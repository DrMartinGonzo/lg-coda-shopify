import * as coda from '@codahq/packs-sdk';

import { redirectFieldDependencies } from '../schemas/syncTable/RedirectSchema';
import { SimpleRestNew } from '../Fetchers/SimpleRest';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';
import { cleanQueryParams } from '../helpers-rest';
import { handleFieldDependencies } from '../helpers';

import type { RedirectRow } from '../typesNew/CodaRows';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type {
  RedirectCreateRestParams,
  RedirectSyncTableRestParams,
  RedirectUpdateRestParams,
} from '../types/Redirect';
import type { Sync_Redirects } from './redirects-setup';
import type { SyncTableParamValues } from '../Fetchers/SyncTableRest';
import type { SyncTableType } from '../types/SyncTable';
import { redirectResource } from '../allResources';

// #region Class
export type RedirectSyncTableType = SyncTableType<
  typeof redirectResource,
  RedirectRow,
  RedirectSyncTableRestParams,
  RedirectCreateRestParams,
  RedirectUpdateRestParams
>;

export class RedirectSyncTable extends SyncTableRestNew<RedirectSyncTableType> {
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

export class RedirectRestFetcher extends SimpleRestNew<RedirectSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(redirectResource, context);
  }

  validateParams = (params: any) => {
    return true;
  };

  formatRowToApi = (
    row: Partial<RedirectRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): RedirectUpdateRestParams | RedirectCreateRestParams | undefined => {
    let restParams: RedirectUpdateRestParams | RedirectCreateRestParams = {};

    if (row.path !== undefined) restParams.path = row.path;
    if (row.target !== undefined) restParams.target = row.target;

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (redirect): RedirectRow => {
    let obj: RedirectRow = {
      ...redirect,
      admin_url: `${this.context.endpoint}/admin/${this.plural}/${redirect.id}`,
    };
    if (redirect.path) {
      obj.test_url = `${this.context.endpoint}${redirect.path}`;
    }

    return obj;
  };
}
// #endregion
