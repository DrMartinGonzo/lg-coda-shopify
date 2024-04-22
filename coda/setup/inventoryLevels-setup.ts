// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InventoryLevel } from '../../Resources/Rest/InventoryLevel';
import { PACK_IDENTITIES } from '../../constants';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { parseOptionId } from '../../utils/helpers';
import { filters, inputs } from '../coda-parameters';

// #endregion

// #region Sync Tables
export const Sync_InventoryLevels = coda.makeSyncTable({
  name: 'InventoryLevels',
  description: 'Return Inventory Levels from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.InventoryLevel,
  schema: InventoryLevelSyncTableSchema,
  formula: {
    name: 'SyncInventoryLevels',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link InventoryLevel.makeSyncTableManagerSyncFunction}
     */
    parameters: [filters.location.idOptionNameArray, { ...filters.general.updatedAtMin, optional: true }],
    execute: async function (params, context) {
      return InventoryLevel.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return InventoryLevel.syncUpdate(params, updates, context);
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
  // schema: coda.withIdentity(InventoryLevelSchema, IdentitiesNew.inventoryLevel),
  schema: InventoryLevelSyncTableSchema,
  execute: async function ([inventory_item_id, location_id, available], context) {
    const inventoryLevel = new InventoryLevel({
      context,
      fromData: {
        available,
        inventory_item_id,
        location_id: parseOptionId(location_id),
      },
    });

    await inventoryLevel.set(inventoryLevel.apiData);
    return inventoryLevel.formatToRow();
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
  // schema: coda.withIdentity(InventoryLevelSchema, IdentitiesNew.inventoryLevel),
  schema: InventoryLevelSyncTableSchema,
  execute: async function ([inventory_item_id, location_id, available_adjustment], context) {
    const inventoryLevel = new InventoryLevel({
      context,
      fromData: {
        inventory_item_id,
        location_id: parseOptionId(location_id),
      },
    });

    await inventoryLevel.adjust({ ...inventoryLevel.apiData, available_adjustment, context });
    return inventoryLevel.formatToRow();
  },
});
// #endregion
