import * as coda from '@codahq/packs-sdk';

import { SimpleRest } from '../../Fetchers/SimpleRest';
import { SingleFetchData } from '../../Fetchers/SyncTableRest';
import { REST_DEFAULT_API_VERSION } from '../../config/config';
import { makePostRequest } from '../../helpers-rest';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { formatInventoryItemReference } from '../../schemas/syncTable/InventoryItemSchema';
import { formatLocationReference } from '../../schemas/syncTable/LocationSchema';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { InventoryLevel, inventoryLevelResource } from './inventoryLevelResource';

export class InventoryLevelRestFetcher extends SimpleRest<InventoryLevel> {
  constructor(context: coda.ExecutionContext) {
    super(inventoryLevelResource, context);
  }

  formatApiToRow = (inventoryLevel): InventoryLevel['codaRow'] => {
    let obj: InventoryLevel['codaRow'] = {
      // ...inventoryLevel,
      admin_graphql_api_id: inventoryLevel.admin_graphql_api_id,
      available: inventoryLevel.available,
      inventory_item_id: inventoryLevel.inventory_item_id,
      id: [inventoryLevel.inventory_item_id, inventoryLevel.location_id].join(','),
      inventory_history_url: `${this.context.endpoint}/admin/products/inventory/${inventoryLevel.inventory_item_id}/inventory_history?location_id=${inventoryLevel.location_id}`,
      location_id: inventoryLevel.location_id,
    };
    if (inventoryLevel.location_id) {
      obj.location = formatLocationReference(inventoryLevel.location_id);
    }
    if (inventoryLevel.inventory_item_id) {
      obj.inventory_item = formatInventoryItemReference(inventoryLevel.inventory_item_id);
    }
    if (inventoryLevel.updated_at) {
      obj.updated_at = new Date(inventoryLevel.updated_at);
    }

    return obj;
  };

  // Only used for setting available value
  formatRowToApi = (
    row: Partial<InventoryLevel['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): InventoryLevel['rest']['params']['set'] | undefined => {
    const inventoryLevelUniqueId = row.id;
    const inventoryItemId = parseInt(inventoryLevelUniqueId.split(',')[0], 10);
    const locationId = parseInt(inventoryLevelUniqueId.split(',')[1], 10);

    let restParams: InventoryLevel['rest']['params']['set'] = {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: row.available,
    };

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  adjust = (payload: InventoryLevel['rest']['params']['adjust'], requestOptions: FetchRequestOptions = {}) => {
    const url = `${this.context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${this.resource.rest.plural}/adjust.json`;
    return makePostRequest<SingleFetchData<InventoryLevel>>({ ...requestOptions, url, payload }, this.context);
  };

  set = (payload: InventoryLevel['rest']['params']['set'], requestOptions: FetchRequestOptions = {}) => {
    const url = `${this.context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${this.resource.rest.plural}/set.json`;
    return makePostRequest<SingleFetchData<InventoryLevel>>({ ...requestOptions, url, payload }, this.context);
  };

  // Edge case, updateWithMetafields will call set method
  updateWithMetafields = async (row: {
    original?: InventoryLevel['codaRow'];
    updated: InventoryLevel['codaRow'];
  }): Promise<InventoryLevel['codaRow']> => {
    const originalRow = row.original ?? {};
    const restParams = this.formatRowToApi(row.updated) as InventoryLevel['rest']['params']['set'];
    const response = restParams ? await this.set(restParams) : undefined;
    const updatedResource = response?.body[this.singular] ? this.formatApiToRow(response.body[this.singular]) : {};
    return {
      ...originalRow,
      ...updatedResource,
    } as InventoryLevel['codaRow'];
  };
}
