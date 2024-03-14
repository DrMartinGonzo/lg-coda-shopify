// #region Imports
import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makePostRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';

import { formatLocationReference } from '../schemas/syncTable/LocationSchema';
import { formatInventoryItemReference } from '../schemas/syncTable/InventoryItemSchema';
import { parseOptionId } from '../helpers';
import { SimpleRestNew } from '../Fetchers/SimpleRest';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';

import type * as Rest from '../types/RestResources';
import type { InventoryLevelRow } from '../typesNew/CodaRows';
import type {
  InventoryLevelAdjustRestParams,
  InventoryLevelSetRestParams,
  InventoryLevelSyncTableRestParams,
} from '../types/InventoryLevel';
import type { FetchRequestOptions } from '../types/Requests';
import type { SingleFetchData, SyncTableParamValues } from '../Fetchers/SyncTableRest';
import type { Sync_InventoryLevels } from './inventoryLevels-setup';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { SyncTableType } from '../types/SyncTable';
import { inventoryLevelResource } from '../allResources';

// #region Classes
export type InventoryLevelSyncTableType = SyncTableType<
  typeof inventoryLevelResource,
  InventoryLevelRow,
  InventoryLevelSyncTableRestParams,
  never,
  never
>;

export class InventoryLevelSyncTable extends SyncTableRestNew<InventoryLevelSyncTableType> {
  constructor(fetcher: InventoryLevelRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(inventoryLevelResource, fetcher, params);
  }

  setSyncParams() {
    const [location_ids, updated_at_min] = this.codaParams as SyncTableParamValues<typeof Sync_InventoryLevels>;
    const parsedLocationIds = location_ids.map(parseOptionId);

    this.syncParams = cleanQueryParams({
      limit: this.restLimit,
      location_ids: parsedLocationIds.join(','),
      updated_at_min,
    });
  }
}

export class InventoryLevelRestFetcher extends SimpleRestNew<InventoryLevelSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(inventoryLevelResource, context);
  }

  formatApiToRow = (inventoryLevel): InventoryLevelRow => {
    let obj: InventoryLevelRow = {
      // ...inventoryLevel,
      admin_graphql_api_id: inventoryLevel.id,
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
    row: Partial<InventoryLevelRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): InventoryLevelSetRestParams | undefined => {
    const inventoryLevelUniqueId = row.id;
    const inventoryItemId = parseInt(inventoryLevelUniqueId.split(',')[0], 10);
    const locationId = parseInt(inventoryLevelUniqueId.split(',')[1], 10);

    let restParams: InventoryLevelSetRestParams = {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: row.available,
    };

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  adjust = (payload: InventoryLevelAdjustRestParams, requestOptions: FetchRequestOptions = {}) => {
    const url = `${this.context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${this.resource.rest.plural}/adjust.json`;
    return makePostRequest<SingleFetchData<InventoryLevelSyncTableType>>(
      { ...requestOptions, url, payload },
      this.context
    );
  };

  set = (payload: InventoryLevelSetRestParams, requestOptions: FetchRequestOptions = {}) => {
    const url = `${this.context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${this.resource.rest.plural}/set.json`;
    return makePostRequest<SingleFetchData<InventoryLevelSyncTableType>>(
      { ...requestOptions, url, payload },
      this.context
    );
  };

  // Edge case, updateWithMetafields will call set method
  updateWithMetafields = async (row: {
    original?: InventoryLevelRow;
    updated: InventoryLevelRow;
  }): Promise<InventoryLevelRow> => {
    const originalRow = row.original ?? {};
    const restParams = this.formatRowToApi(row.updated) as InventoryLevelSetRestParams;
    const response = restParams ? await this.set(restParams) : undefined;
    const updatedResource = response?.body[this.singular] ? this.formatApiToRow(response.body[this.singular]) : {};
    return {
      ...originalRow,
      ...updatedResource,
    } as InventoryLevelRow;
  };
}
// #endregion
