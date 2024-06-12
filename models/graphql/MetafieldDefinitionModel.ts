// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../utils/tada-utils';

import { MetafieldDefinitionClient } from '../../Clients/GraphQlApiClientBase';
import { getSupportedMetafieldSyncTable } from '../../Resources/Mixed/SupportedMetafieldSyncTable';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { Identity, NOT_IMPLEMENTED, PACK_IDENTITIES } from '../../constants';
import { metafieldDefinitionFragment } from '../../graphql/metafieldDefinitions-graphql';
import { MetafieldDefinitionRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export type MetafieldDefinitionApiData = BaseApiDataGraphQl & ResultOf<typeof metafieldDefinitionFragment>;

export interface MetafieldDefinitionModelData extends BaseModelDataGraphQl, MetafieldDefinitionApiData {}
// #endregion

export class MetafieldDefinitionModel extends AbstractModelGraphQl<MetafieldDefinitionModel> {
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
    const { namespace, key } = this.data;
    return `${namespace}.${key}`;
  }

  get adminUrl() {
    const supportedSyncTable = getSupportedMetafieldSyncTable(this.data.ownerType as MetafieldOwnerType);
    if (!supportedSyncTable.supportDefinition) return;
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
