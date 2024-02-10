import * as coda from '@codahq/packs-sdk';

import { makePostRequest } from '../helpers-rest';
import { NOT_FOUND, REST_DEFAULT_API_VERSION } from '../constants';
import { FormatFunction } from '../types/misc';

import { InventoryLevelSchema } from './inventoryLevels-schema';
import { InventoryLevelAdjustRestParams, InventoryLevelSetRestParams } from '../types/InventoryLevel';

// #region Helpers
export async function handleInventoryLevelUpdateJob(
  update: coda.SyncUpdate<string, string, typeof InventoryLevelSchema>,
  context: coda.ExecutionContext
) {
  const inventoryLevelUniqueId = update.previousValue.id as string;
  const inventoryItemId = parseInt(inventoryLevelUniqueId.split(',')[0], 10);
  const locationId = parseInt(inventoryLevelUniqueId.split(',')[1], 10);

  let obj = { ...update.previousValue };
  const restParams: InventoryLevelSetRestParams = {
    inventory_item_id: inventoryItemId,
    location_id: locationId,
    available: update.newValue.available,
  };
  const response = await setInventoryLevelRest(restParams, context);
  if (response.body?.inventory_level) {
    obj = {
      ...obj,
      ...formatInventoryLevelForSchemaFromRestApi(response.body.inventory_level, context),
    };
  }

  return obj;
}
// #endregion

// #region Formatting
export const formatInventoryLevelForSchemaFromRestApi: FormatFunction = (inventoryLevel, context) => {
  let obj: any = {
    ...inventoryLevel,
    id: [inventoryLevel.inventory_item_id, inventoryLevel.location_id].join(','),
    inventory_history_url: `${context.endpoint}/admin/products/inventory/${inventoryLevel.inventory_item_id}/inventory_history?location_id=${inventoryLevel.location_id}`,
  };
  if (inventoryLevel.location_id) {
    obj.location = {
      id: inventoryLevel.location_id,
      name: NOT_FOUND,
    };
  }
  if (inventoryLevel.inventory_item_id) {
    obj.inventory_item = {
      id: inventoryLevel.inventory_item_id,
    };
  }

  return obj;
};
// #endregion

// #region Rest requests
export const adjustInventoryLevelRest = (payload: InventoryLevelAdjustRestParams, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/inventory_levels/adjust.json`;
  return makePostRequest({ url, payload }, context);
};

export const setInventoryLevelRest = (payload: InventoryLevelSetRestParams, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/inventory_levels/set.json`;
  return makePostRequest({ url, payload }, context);
};
// #endregion
