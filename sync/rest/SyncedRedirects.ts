// #region Imports

import { ListRedirectsArgs } from '../../Clients/RestClients';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Redirects } from '../../coda/setup/redirects-setup';
import { RedirectModel } from '../../models/rest/RedirectModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { RedirectSyncTableSchema } from '../../schemas/syncTable/RedirectSchema';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

// #region Types
export type SyncRedirectsParams = CodaSyncParams<typeof Sync_Redirects>;
// #endregion

export class SyncedRedirects extends AbstractSyncedRestResources<RedirectModel> {
  public static schemaDependencies: FieldDependency<typeof RedirectSyncTableSchema.properties>[] = [
    {
      field: 'id',
      dependencies: ['admin_url'],
    },
    {
      field: 'path',
      dependencies: ['test_url'],
    },
  ];

  public static staticSchema = RedirectSyncTableSchema;

  public get codaParamsMap() {
    const [path, target] = this.codaParams as SyncRedirectsParams;
    return {
      path,
      target,
    };
  }

  protected codaParamsToListArgs(): Omit<ListRedirectsArgs, 'limit' | 'options'> {
    const { path, target } = this.codaParamsMap;
    return {
      fields: this.syncedStandardFields.join(','),
      path,
      target,
    };
  }
}
