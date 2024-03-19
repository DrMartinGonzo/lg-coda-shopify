// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InventoryLevelSyncTable } from './InventoryLevelSyncTable';
import { InventoryLevelRestFetcher } from './InventoryLevelRestFetcher';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { filters, inputs } from '../../shared-parameters';
import { parseOptionId } from '../../utils/helpers';
import { Identity } from '../../constants';

// #endregion

// #region Sync Tables
export const Sync_InventoryLevels = coda.makeSyncTable({
  name: 'InventoryLevels',
  description: 'Return Inventory Levels from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.InventoryLevel,
  schema: InventoryLevelSyncTableSchema,
  formula: {
    name: 'SyncInventoryLevels',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [filters.location.idOptionNameArray, { ...filters.general.updatedAtMin, optional: true }],
    execute: async function (params, context) {
      const [location_ids] = params;
      if (!location_ids || !location_ids.length) {
        throw new coda.UserVisibleError('At least one location is required.');
      }

      const inventoryLevelSyncTable = new InventoryLevelSyncTable(new InventoryLevelRestFetcher(context), params);
      return inventoryLevelSyncTable.executeSync(InventoryLevelSyncTableSchema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const inventoryLevelSyncTable = new InventoryLevelSyncTable(new InventoryLevelRestFetcher(context), params);
      return inventoryLevelSyncTable.executeUpdate(updates);
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
  // schema: coda.withIdentity(InventoryLevelSchema, Identity.InventoryLevel),
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
  // schema: coda.withIdentity(InventoryLevelSchema, Identity.InventoryLevel),
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
