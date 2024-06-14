// #region Imports
import * as coda from '@codahq/packs-sdk';

import { RedirectClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { RedirectRow } from '../../schemas/CodaRows.types';
import { AbstractModelRest, BaseApiDataRest } from './AbstractModelRest';

// #endregion

// #region Types
export interface RedirectApiData extends BaseApiDataRest {
  id: number | null;
  path: string | null;
  target: string | null;
}

export interface RedirectModelData extends RedirectApiData {}
// #endregion

export class RedirectModel extends AbstractModelRest {
  public data: RedirectModelData;
  public static readonly displayName: Identity = PACK_IDENTITIES.Redirect;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: RedirectRow) {
    return this.createInstance(context, {
      id: row.id,
      path: row.path,
      target: row.target,
    } as RedirectModelData);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return RedirectClient.createInstance(this.context);
  }

  public toCodaRow(): RedirectRow {
    const { data } = this;
    return {
      ...data,
      admin_url: `${this.context.endpoint}/admin/redirects/${data.id}`,
      test_url: data.path ? `${this.context.endpoint}${data.path}` : undefined,
    };
  }
}
