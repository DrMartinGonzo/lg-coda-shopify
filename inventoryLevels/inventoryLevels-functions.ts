import * as coda from '@codahq/packs-sdk';

import { makePostRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';

import { formatLocationReference } from '../schemas/syncTable/LocationSchema';
import { formatInventoryItemReference } from '../schemas/syncTable/InventoryItemSchema';
import { RestResourceName } from '../types/RequestsRest';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { InventoryLevelSyncTableSchema } from '../schemas/syncTable/InventoryLevelSchema';

import type { InventoryLevel as InventoryLevelRest } from '@shopify/shopify-api/rest/admin/2023-10/inventory_level';
import type { InventoryLevelRow } from '../types/CodaRows';
import type { InventoryLevelAdjustRestParams, InventoryLevelSetRestParams } from '../types/InventoryLevel';
import type { singleFetchData } from '../Fetchers/SimpleRest';
import type { FetchRequestOptions } from '../types/Requests';

export class InventoryLevelRestFetcher extends SimpleRest<
  RestResourceName.InventoryLevel,
  typeof InventoryLevelSyncTableSchema
> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.InventoryLevel, InventoryLevelSyncTableSchema, context);
  }

  formatApiToRow = (inventoryLevel: InventoryLevelRest): InventoryLevelRow => {
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

  adjust = (payload: InventoryLevelAdjustRestParams, requestOptions: FetchRequestOptions = {}) => {
    const url = `${this.context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${this.resource.plural}/adjust.json`;
    return makePostRequest<singleFetchData<RestResourceName.InventoryLevel>>(
      { ...requestOptions, url, payload },
      this.context
    );
  };

  set = (payload: InventoryLevelSetRestParams, requestOptions: FetchRequestOptions = {}) => {
    const url = `${this.context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${this.resource.plural}/set.json`;
    return makePostRequest<singleFetchData<RestResourceName.InventoryLevel>>(
      { ...requestOptions, url, payload },
      this.context
    );
  };
}
