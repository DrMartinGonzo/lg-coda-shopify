// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import { MarketClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { marketFieldsFragment } from '../../graphql/markets-graphql';
import { MarketRow } from '../../schemas/CodaRows.types';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export interface MarketApidata extends BaseApiDataGraphQl, ResultOf<typeof marketFieldsFragment> {}

// TODO add metafields support to Market ?
export interface MarketModelData extends MarketApidata, BaseModelDataGraphQl {}
// #endregion

export class MarketModel extends AbstractModelGraphQl {
  public data: MarketModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Market;
  protected static readonly graphQlName = GraphQlResourceNames.Market;

  public static createInstanceFromRow(context: coda.ExecutionContext, { id, ...row }: MarketRow) {
    let data: Partial<MarketModelData> = {
      ...row,
      id: idToGraphQlGid(GraphQlResourceNames.Market, id),
    };

    return MarketModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return MarketClient.createInstance(this.context);
  }

  public toCodaRow(): MarketRow {
    const { id, ...data } = this.data;

    let obj: MarketRow = {
      ...data,
      id: this.restId,
      admin_graphql_api_id: this.graphQlGid,
      admin_url: `${this.context.endpoint}/admin/settings/markets/${this.restId}`,
    };

    return obj as MarketRow;
  }
}
