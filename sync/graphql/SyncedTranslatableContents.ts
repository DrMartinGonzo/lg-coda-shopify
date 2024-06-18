// #region Imports

import { ListTranslatableContentsArgs } from '../../Clients/GraphQlClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_TranslatableContents } from '../../coda/setup/translations-setup';
import { TranslatableContentModel } from '../../models/graphql/TranslatableContentModel';
import { TranslatableContentSyncTableSchema } from '../../schemas/syncTable/TranslatableContentSchema';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncTranslatableContentsParams = CodaSyncParams<typeof Sync_TranslatableContents>;
// #endregion

export class SyncedTranslatableContents extends AbstractSyncedGraphQlResources<TranslatableContentModel> {
  public static staticSchema = TranslatableContentSyncTableSchema;

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return this.staticSchema;
  }

  public get codaParamsMap() {
    const [resourceType] = this.codaParams as SyncTranslatableContentsParams;
    return { resourceType };
  }

  protected codaParamsToListArgs() {
    const { resourceType } = this.codaParamsMap;
    return {
      resourceType,
    } as ListTranslatableContentsArgs;
  }
}
