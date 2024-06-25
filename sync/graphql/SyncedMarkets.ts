// #region Imports

import { ListMarketsArgs } from '../../Clients/GraphQlClients';
import { Sync_Markets } from '../../coda/setup/markets-setup';
import { MarketModel } from '../../models/graphql/MarketModel';
import { MarketSyncTableSchema } from '../../schemas/syncTable/MarketSchema';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncMarketsParams = CodaSyncParams<typeof Sync_Markets>;
// #endregion

export class SyncedMarkets extends AbstractSyncedGraphQlResources<MarketModel> {
  public static staticSchema = MarketSyncTableSchema;

  public get codaParamsMap() {
    const [] = this.codaParams as SyncMarketsParams;
    return {};
  }

  protected codaParamsToListArgs() {
    const {} = this.codaParamsMap;
    return {} as ListMarketsArgs;
  }
}
