// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InventoryLevelRestFetcher } from './inventoryLevels-functions';

import { InventoryLevelSyncTableSchema } from '../schemas/syncTable/InventoryLevelSchema';
import { IDENTITY_INVENTORYLEVEL, REST_DEFAULT_LIMIT } from '../constants';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { filters, inputs } from '../shared-parameters';
import { parseOptionId } from '../helpers';

import type { InventoryLevel as InventoryLevelRest } from '@shopify/shopify-api/rest/admin/2023-10/inventory_level';
import type { InventoryLevelRow } from '../types/CodaRows';
import type { InventoryLevelSetRestParams, InventoryLevelSyncTableRestParams } from '../types/InventoryLevel';
import type { SyncTableRestContinuation } from '../types/tableSync';

// #endregion

// #region Sync Tables
export const Sync_InventoryLevels = coda.makeSyncTable({
  name: 'InventoryLevels',
  description: 'Return Inventory Levels from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_INVENTORYLEVEL,
  schema: InventoryLevelSyncTableSchema,
  formula: {
    name: 'SyncInventoryLevels',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [filters.location.idOptionNameArray, { ...filters.general.updatedAtMin, optional: true }],
    execute: async function ([location_ids, updated_at_min], context) {
      if (!location_ids || !location_ids.length) {
        throw new coda.UserVisibleError('At least one location is required.');
      }

      const inventoryLevelFetcher = new InventoryLevelRestFetcher(context);
      const parsedLocationIds = location_ids.map(parseOptionId);
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;

      let restItems: Array<InventoryLevelRow> = [];
      let restContinuation: SyncTableRestContinuation = null;

      const restParams = cleanQueryParams({
        limit: REST_DEFAULT_LIMIT,
        location_ids: parsedLocationIds.join(','),
        updated_at_min,
      } as InventoryLevelSyncTableRestParams);

      const url: string = prevContinuation?.nextUrl
        ? coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit })
        : inventoryLevelFetcher.getFetchAllUrl(restParams);
      const { response, continuation } = await makeSyncTableGetRequest<{ inventory_levels: InventoryLevelRest[] }>(
        { url },
        context
      );
      restContinuation = continuation;

      if (response?.body?.inventory_levels) {
        restItems = response.body.inventory_levels.map(inventoryLevelFetcher.formatApiToRow);
      }

      return {
        result: restItems,
        continuation: restContinuation,
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const inventoryLevelFetcher = new InventoryLevelRestFetcher(context);

      const jobs = updates.map((update) => {
        const inventoryLevelUniqueId = update.previousValue.id as string;
        const inventoryItemId = parseInt(inventoryLevelUniqueId.split(',')[0], 10);
        const locationId = parseInt(inventoryLevelUniqueId.split(',')[1], 10);
        const restParams: InventoryLevelSetRestParams = {
          inventory_item_id: inventoryItemId,
          location_id: locationId,
          available: update.newValue.available,
        };
        return inventoryLevelFetcher.set(restParams);
      });

      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled' && job.value?.body?.inventory_level) {
            return inventoryLevelFetcher.formatApiToRow(job.value.body.inventory_level);
          } else if (job.status === 'rejected') {
            return job.reason;
          }
        }),
      };
    },
  },
});
// #endregion

// #region Actions
export const Action_SetInventoryLevel = coda.makeFormula({
  name: 'SetInventoryLevel',
  description: 'Sets the Inventory Level for an Inventory Item at a given Location and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.inventoryItem.id,
    {
      ...inputs.location.idOptionName,
      description: 'The Location for which the available quantity should be set.',
    },
    inputs.InventoryLevel.available,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(InventoryLevelSchema, IDENTITY_INVENTORYLEVEL),
  schema: InventoryLevelSyncTableSchema,
  execute: async function ([inventory_item_id, location_id, available], context) {
    const inventoryLevelFetcher = new InventoryLevelRestFetcher(context);
    const response = await inventoryLevelFetcher.set({
      available,
      inventory_item_id,
      location_id: parseOptionId(location_id),
    });
    if (response?.body?.inventory_level) {
      return inventoryLevelFetcher.formatApiToRow(response.body.inventory_level);
    }
  },
});

export const Action_AdjustInventoryLevel = coda.makeFormula({
  name: 'AdjustInventoryLevel',
  description:
    'Adjusts the Inventory level by a certain quantity for an Inventory Item at a given Location and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.inventoryItem.id,
    {
      ...inputs.location.idOptionName,
      description: 'The Location for which the available quantity should be adjusted.',
    },
    inputs.InventoryLevel.availableAdjustment,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(InventoryLevelSchema, IDENTITY_INVENTORYLEVEL),
  schema: InventoryLevelSyncTableSchema,
  execute: async function ([inventory_item_id, location_id, available_adjustment], context) {
    const inventoryLevelFetcher = new InventoryLevelRestFetcher(context);
    const response = await inventoryLevelFetcher.adjust({
      available_adjustment,
      inventory_item_id,
      location_id: parseOptionId(location_id),
    });
    if (response?.body?.inventory_level) {
      return inventoryLevelFetcher.formatApiToRow(response.body.inventory_level);
    }
  },
});
// #endregion
