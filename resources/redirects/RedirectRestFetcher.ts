import * as coda from '@codahq/packs-sdk';

import { SimpleRest } from '../../Fetchers/SimpleRest';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { Redirect, redirectResource } from './redirectResource';

export class RedirectRestFetcher extends SimpleRest<Redirect> {
  constructor(context: coda.ExecutionContext) {
    super(redirectResource, context);
  }

  validateParams = (params: any) => {
    return true;
  };

  formatRowToApi = (
    row: Partial<Redirect['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Redirect['rest']['params']['update'] | Redirect['rest']['params']['create'] | undefined => {
    let restParams: Redirect['rest']['params']['update'] | Redirect['rest']['params']['create'] = {};

    if (row.path !== undefined) restParams.path = row.path;
    if (row.target !== undefined) restParams.target = row.target;

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (redirect): Redirect['codaRow'] => {
    let obj: Redirect['codaRow'] = {
      ...redirect,
      admin_url: `${this.context.endpoint}/admin/${this.plural}/${redirect.id}`,
    };
    if (redirect.path) {
      obj.test_url = `${this.context.endpoint}${redirect.path}`;
    }

    return obj;
  };
}
