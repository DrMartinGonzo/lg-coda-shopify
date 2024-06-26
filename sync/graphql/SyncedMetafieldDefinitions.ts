// #region Imports

import { ListMetafieldDefinitionsArgs } from '../../Clients/GraphQlClients';
import { Sync_MetafieldDefinitions } from '../../coda/setup/metafieldDefinitions-setup';
import { MetafieldDefinitionModel } from '../../models/graphql/MetafieldDefinitionModel';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncMetafieldDefinitionsParams = CodaSyncParams<typeof Sync_MetafieldDefinitions>;
// #endregion

export class SyncedMetafieldDefinitions extends AbstractSyncedGraphQlResources<MetafieldDefinitionModel> {
  public static staticSchema = MetafieldDefinitionSyncTableSchema;

  public get codaParamsMap() {
    const [ownerType] = this.codaParams as SyncMetafieldDefinitionsParams;
    return {
      ownerType,
    };
  }

  protected codaParamsToListArgs() {
    const { ownerType } = this.codaParamsMap;
    return {
      ownerType,
    } as ListMetafieldDefinitionsArgs;
  }
}
