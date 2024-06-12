// #region Imports

import { ListMetafieldDefinitionsArgs } from '../../Clients/GraphQlApiClientBase';
import { MetafieldDefinitionModel } from '../../models/graphql/MetafieldDefinitionModel';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedMetafieldDefinitions extends AbstractSyncedGraphQlResources<MetafieldDefinitionModel> {
  public static staticSchema = MetafieldDefinitionSyncTableSchema;

  public static async getDynamicSchema() {
    return this.staticSchema;
  }

  public get codaParamsMap() {
    return {};
  }

  protected codaParamsToListArgs() {
    return {
      ownerType: this.context.sync.dynamicUrl as MetafieldOwnerType,
    } as ListMetafieldDefinitionsArgs;
  }
}
