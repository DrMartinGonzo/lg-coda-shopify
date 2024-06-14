// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InventoryLevelClient } from '../../Clients/RestClients';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { InventoryLevelApiData, InventoryLevelModel } from '../../models/rest/InventoryLevelModel';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { SyncedInventoryLevels } from '../../sync/rest/SyncedInventoryLevels';
import { parseOptionId } from '../../utils/helpers';
import { filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedInventoryLevels(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedInventoryLevels({
    context,
    codaSyncParams,
    model: InventoryLevelModel,
    client: InventoryLevelClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({ locationIds }: { locationIds?: string[] }) {
  if (!locationIds || !locationIds.length) {
    throw new coda.UserVisibleError('At least one location is required.');
  }
}
// #endregion

// #region Sync Tables
export const Sync_InventoryLevels = coda.makeSyncTable({
  name: 'InventoryLevels',
  description: 'Return Inventory Levels from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.InventoryLevel,
  schema: SyncedInventoryLevels.staticSchema,
  formula: {
    name: 'SyncInventoryLevels',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedInventoryLevels.codaParamsMap}
     */
    parameters: [filters.location.idOptionNameArray, { ...filters.general.updatedAtMin, optional: true }],
    execute: async (codaSyncParams, context) => createSyncedInventoryLevels(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedInventoryLevels(codaSyncParams, context).executeSyncUpdate(updates),
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
  execute: async function ([inventory_item_id, locationOptionId, available], context) {
    const location_id = parseOptionId(locationOptionId);
    const inventoryLevel = InventoryLevelModel.createInstance(context, {
      available,
      inventory_item_id,
      location_id,
    } as InventoryLevelApiData);
    await inventoryLevel.set();
    return inventoryLevel.toCodaRow();
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
  execute: async function ([inventory_item_id, locationOptionId, available_adjustment], context) {
    const location_id = parseOptionId(locationOptionId);
    const inventoryLevel = InventoryLevelModel.createInstance(context, {
      inventory_item_id,
      location_id,
    } as InventoryLevelApiData);
    await inventoryLevel.adjust(available_adjustment);
    return inventoryLevel.toCodaRow();
  },
});
// #endregion
