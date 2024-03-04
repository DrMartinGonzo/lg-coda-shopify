import * as coda from '@codahq/packs-sdk';

import { RedirectSyncTableSchema } from '../schemas/syncTable/RedirectSchema';
import { RestResourceName } from '../types/RequestsRest';
import { SimpleRest } from '../Fetchers/SimpleRest';

import type { RedirectRow } from '../types/CodaRows';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { RedirectCreateRestParams, RedirectUpdateRestParams } from '../types/Redirect';

// #region Class
export class RedirectRestFetcher extends SimpleRest<RestResourceName.Redirect, typeof RedirectSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Redirect, RedirectSyncTableSchema, context);
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
