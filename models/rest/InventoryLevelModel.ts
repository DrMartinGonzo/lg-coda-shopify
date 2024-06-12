// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { AdjustInventoryLevelArgs, InventoryLevelClient, SetInventoryLevelArgs } from '../../Clients/RestApiClientBase';
import { IMetafield } from '../../Resources/Mixed/MetafieldHelper';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { InventoryLevelRow } from '../../schemas/CodaRows.types';
import { formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractModelRest, BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithRestMetafields,
  BaseModelDataRestWithRestMetafields,
} from './AbstractModelRestWithMetafields';
import { safeToString } from '../../utils/helpers';
import { formatInventoryItemReference } from '../../schemas/syncTable/InventoryItemSchema';
import { formatLocationReference } from '../../schemas/syncTable/LocationSchema';

// #endregion

// #region Types
export interface InventoryLevelApiData extends BaseApiDataRest {
  admin_graphql_api_id: string | null;
  available: number | null;
  inventory_item_id: number | null;
  location_id: number | null;
  updated_at: string | null;
}

interface InventoryLevelModelData extends InventoryLevelApiData {}
// #endregion

export class InventoryLevelModel extends AbstractModelRest<InventoryLevelModel> {
  public data: InventoryLevelModelData;
  public static readonly displayName: Identity = PACK_IDENTITIES.InventoryLevel;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: InventoryLevelRow) {
    const splitIds = row.id.split(',');
    const inventoryItemId = parseInt(splitIds[0], 10);
    const locationId = parseInt(splitIds[1], 10);
    const data: Partial<InventoryLevelModelData> = {
      admin_graphql_api_id: row.admin_graphql_api_id,
      available: row.available,
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return InventoryLevelClient.createInstance(this.context);
  }

  public async adjust(available_adjustment: number) {
    const response = await this.client.adjust(this.getApiData(), available_adjustment);
    if (response) this.setData(response.body);
  }

  public async set(disconnect_if_necessary?: boolean) {
    const response = await this.client.set(this.getApiData(), disconnect_if_necessary);
    if (response) this.setData(response.body);
  }

  public async save() {
    await this.set();
  }

  public toCodaRow(): InventoryLevelRow {
    const { data } = this;
    const obj: InventoryLevelRow = {
      ...data,
      id: [data.inventory_item_id, data.location_id].join(','),
      inventory_history_url: `${this.context.endpoint}/admin/products/inventory/${data.inventory_item_id}/inventory_history?location_id=${data.location_id}`,
    };
    if (data.inventory_item_id) {
      obj.inventory_item = formatInventoryItemReference(data.inventory_item_id);
    }
    if (data.location_id) {
      obj.location = formatLocationReference(data.location_id);
    }

    return obj;
  }
}
