// #region Imports

import { ListTranslatableContentsArgs } from '../../Clients/GraphQlApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_TranslatableContent } from '../../coda/setup/translations-setup';
import { TranslatableContentModel } from '../../models/graphql/TranslatableContentModel';
import { TranslatableContentSyncTableSchema } from '../../schemas/syncTable/TranslatableContentSchema';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedTranslatableContents extends AbstractSyncedGraphQlResources<TranslatableContentModel> {
  public static staticSchema = TranslatableContentSyncTableSchema;

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return this.staticSchema;
  }

  public get codaParamsMap() {
    const [resourceType] = this.codaParams as CodaSyncParams<typeof Sync_TranslatableContent>;
    return { resourceType };
  }

  protected codaParamsToListArgs() {
    const { resourceType } = this.codaParamsMap;
    return {
      resourceType,
    } as ListTranslatableContentsArgs;
  }
}
