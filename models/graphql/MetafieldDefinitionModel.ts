// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../graphql/utils/graphql-utils';

import { MetafieldDefinitionClient } from '../../Clients/GraphQlClients';
import { getSupportDefinitionMetafieldSyncTable } from '../../sync/SupportedMetafieldSyncTable';
import { GraphQlResourceNames } from '../types/SupportedResource';
import { Identity, NOT_IMPLEMENTED, PACK_IDENTITIES } from '../../constants';
import { metafieldDefinitionFragment } from '../../graphql/metafieldDefinitions-graphql';
import { MetafieldDefinitionRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';
import { getMetaFieldFullKey } from '../utils/metafields-utils';

// #endregion

// #region Types
export type MetafieldDefinitionApiData = BaseApiDataGraphQl & ResultOf<typeof metafieldDefinitionFragment>;

export interface MetafieldDefinitionModelData extends BaseModelDataGraphQl, MetafieldDefinitionApiData {}
// #endregion

export class MetafieldDefinitionModel extends AbstractModelGraphQl {
  public data: MetafieldDefinitionModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.MetafieldDefinition;
  protected static readonly graphQlName = GraphQlResourceNames.MetafieldDefinition;

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    row: MetafieldDefinitionRow
  ): MetafieldDefinitionModel {
    throw new Error(NOT_IMPLEMENTED);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return MetafieldDefinitionClient.createInstance(this.context);
  }

  get fullKey() {
    return getMetaFieldFullKey(this.data);
  }

  get adminUrl() {
    const supportedSyncTable = getSupportDefinitionMetafieldSyncTable(this.data.ownerType as MetafieldOwnerType);
    return coda.joinUrl(supportedSyncTable.getAdminUrl(this.context), this.restId.toString());
  }

  public toCodaRow(): MetafieldDefinitionRow {
    const { data } = this;

    let obj: Partial<MetafieldDefinitionRow> = {
      ...data,
      admin_graphql_api_id: data.id,
      id: this.restId,
      admin_url: this.adminUrl,
      type: data.type?.name,
    };

    return obj as MetafieldDefinitionRow;
  }
}
