// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  adjustInventoryLevelRest,
  formatInventoryLevelForSchemaFromRestApi,
  handleInventoryLevelUpdateJob,
  setInventoryLevelRest,
} from './inventoryLevels-functions';

import { InventoryLevelSchema } from '../schemas/syncTable/InventoryLevelSchema';
import { IDENTITY_INVENTORYLEVEL, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { SyncTableRestContinuation } from '../types/tableSync';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { sharedParameters } from '../shared-parameters';
import { parseOptionId } from '../helpers';
import { InventoryLevelSyncTableRestParams } from '../types/InventoryLevel';

// #endregion

const parameters = {
  available: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'available',
    description: 'Sets the available inventory quantity.',
  }),
  availableAdjustment: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'availableAdjustment',
    description:
      'The amount to adjust the available inventory quantity. Send negative values to subtract from the current available quantity.',
  }),
};

// #region Sync Tables
export const Sync_InventoryLevels = coda.makeSyncTable({
  name: 'InventoryLevels',
  description: 'Return Inventory Levels from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_INVENTORYLEVEL,
  schema: InventoryLevelSchema,
  formula: {
    name: 'SyncInventoryLevels',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...sharedParameters.filterLocations, description: 'Fetch inventory levels for the specified locations.' },
      { ...sharedParameters.filterUpdatedAtMin, optional: true },
    ],
    execute: async function ([location_ids, updated_at_min], context) {
      if (!location_ids || !location_ids.length) {
        throw new coda.UserVisibleError('At least one location is required.');
      }
      const parsedLocationIds = location_ids.map(parseOptionId);

      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;

      let restItems = [];
      let restContinuation: SyncTableRestContinuation = null;

      const restParams = cleanQueryParams({
        limit: REST_DEFAULT_LIMIT,
        location_ids: parsedLocationIds.join(','),
        updated_at_min,
      } as InventoryLevelSyncTableRestParams);

      let url: string;
      if (prevContinuation?.nextUrl) {
        url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
      } else {
        url = coda.withQueryParams(
          `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/inventory_levels.json`,
          restParams
        );
      }
      const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
      restContinuation = continuation;

      if (response?.body?.inventory_levels) {
        restItems = response.body.inventory_levels.map((redirect) =>
          formatInventoryLevelForSchemaFromRestApi(redirect, context)
        );
      }

      return {
        result: restItems,
        continuation: restContinuation,
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const jobs = updates.map((update) => handleInventoryLevelUpdateJob(update, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
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
    sharedParameters.inventoryItemID,
    { ...sharedParameters.location, description: 'The Location for which the available quantity should be set.' },
    parameters.available,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  // TODO: withIdentity breaks update for relations
  // schema: coda.withIdentity(InventoryLevelSchema, IDENTITY_INVENTORYLEVEL),
  schema: InventoryLevelSchema,
  execute: async function ([inventory_item_id, location_id, available], context) {
    const response = await setInventoryLevelRest(
      {
        available,
        inventory_item_id,
        location_id: parseOptionId(location_id),
      },
      context
    );
    if (response.body?.inventory_level) {
      return formatInventoryLevelForSchemaFromRestApi(response.body.inventory_level, context);
    }
  },
});

export const Action_AdjustInventoryLevel = coda.makeFormula({
  name: 'AdjustInventoryLevel',
  description:
    'Adjusts the Inventory level by a certain quantity for an Inventory Item at a given Location and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    sharedParameters.inventoryItemID,
    {
      ...sharedParameters.location,
      description: 'The Location for which the available quantity should be adjusted.',
    },
    parameters.availableAdjustment,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  // TODO: withIdentity breaks update for relations
  // schema: coda.withIdentity(InventoryLevelSchema, IDENTITY_INVENTORYLEVEL),
  schema: InventoryLevelSchema,
  execute: async function ([inventory_item_id, location_id, available_adjustment], context) {
    const response = await adjustInventoryLevelRest(
      {
        available_adjustment,
        inventory_item_id,
        location_id: parseOptionId(location_id),
      },
      context
    );
    if (response.body?.inventory_level) {
      return formatInventoryLevelForSchemaFromRestApi(response.body.inventory_level, context);
    }
  },
});
// #endregion
