// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  AdjustInventoryLevelsArgs,
  InventoryLevelClient,
  MoveInventoryLevelsArgs,
  SetInventoryLevelsArgs,
} from '../../Clients/GraphQlClients';
import { DEFAULT_LEDGER_DOC_URI } from '../../constants/inventoryLevels-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { InventoryLevelModel } from '../../models/graphql/InventoryLevelModel';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { SyncedInventoryLevels } from '../../sync/graphql/SyncedInventoryLevels';
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
    // validateSyncParams,
  });
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
    parameters: [inputs.location.idOptionName, { ...filters.general.updatedAtMin, optional: true }],
    execute: async (codaSyncParams, context) => createSyncedInventoryLevels(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedInventoryLevels(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
export const Action_SetInventoryLevel = coda.makeFormula({
  name: 'SetInventory',
  description: 'Sets the Inventory Level for an Inventory Item at a given Location and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.inventoryItem.id,
    {
      ...inputs.location.idOptionName,
      description: 'The Location for which the available quantity should be set.',
    },
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: 'quantity',
      description: 'The quantity to set.',
    }),
    {
      ...inputs.InventoryLevel.setQuantityName,
      name: 'state',
      description: 'The quantity name to be set.',
    },
    inputs.InventoryLevel.reason,
    {
      ...inputs.InventoryLevel.referenceDocumentUri,
      optional: true,
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(InventoryLevelSchema, IdentitiesNew.inventoryLevel),
  schema: InventoryLevelSyncTableSchema,
  execute: async function (
    [inventoryItemId, locationOptionId, quantity, quantityName, reason, referenceDocumentUri],
    context
  ) {
    const locationId = idToGraphQlGid(GraphQlResourceNames.Location, parseOptionId(locationOptionId));

    const setArgs: SetInventoryLevelsArgs = {
      inventoryItemId: idToGraphQlGid(GraphQlResourceNames.InventoryItem, inventoryItemId),
      locationId,
      reason,
      id: undefined,
      referenceDocumentUri,
      quantities: [
        {
          name: quantityName,
          quantity,
        },
      ],
    };

    const response = await InventoryLevelClient.createInstance(context).set(setArgs);
    const inventoryLevel = InventoryLevelModel.createInstance(context, response.body);
    return inventoryLevel.toCodaRow();
  },
});

export const Action_AdjustInventory = coda.makeFormula({
  name: 'AdjustInventory',
  description: `Increment or decrement the total amount of inventory that's in the available, damaged, quality_control, reserved, or safety_stock state at a location. Return the updated data. Beware that if an external inventory adjustment happens during this action, the result might not represent the final state of the inventory.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.inventoryItem.id,
    {
      ...inputs.location.idOptionName,
      description: 'The Location for which the available quantity should be set.',
    },
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: 'delta',
      description:
        'The inventory adjustment. A positive number indicates an increase in inventory quantities. A negative number indicates a decrease in inventory quantities.',
    }),
    inputs.InventoryLevel.adjustQuantityName,
    inputs.InventoryLevel.reason,
    {
      ...inputs.InventoryLevel.referenceDocumentUri,
      optional: true,
    },
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'ledgerDocumentUri',
      description: `A freeform URI that represents what changed the inventory quantity. Required for all quantity names except \`available\`. Will default to \`${DEFAULT_LEDGER_DOC_URI}\` if not set.`,
      optional: true,
    }),
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(InventoryLevelSchema, IdentitiesNew.inventoryLevel),
  schema: InventoryLevelSyncTableSchema,
  execute: async function (
    [inventoryItemId, locationOptionId, delta, state, reason, referenceDocumentUri, ledgerDocumentUri],
    context
  ) {
    const locationId = idToGraphQlGid(GraphQlResourceNames.Location, parseOptionId(locationOptionId));

    const adjustArgs: AdjustInventoryLevelsArgs = {
      inventoryItemId: idToGraphQlGid(GraphQlResourceNames.InventoryItem, inventoryItemId),
      locationId,
      reason,
      id: undefined,
      referenceDocumentUri,
      quantityName: state,
      delta,
      ledgerDocumentUri,
    };

    const response = await InventoryLevelClient.createInstance(context).adjust(adjustArgs);
    const inventoryLevel = InventoryLevelModel.createInstance(context, response.body);
    return inventoryLevel.toCodaRow();
  },
});

export const Action_MoveInventoryBetweenStates = coda.makeFormula({
  name: 'MoveInventoryBetweenStates',
  description: 'Transition inventory quantities between states at sepcified location. Return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.inventoryItem.id,
    {
      ...inputs.location.idOptionName,
      name: 'location',
      description: 'Specifies the source location of the move.',
    },
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: 'quantity',
      description: 'The amount by which the inventory quantity will be changed.',
    }),
    {
      ...inputs.InventoryLevel.moveQuantityName,
      name: 'fromState',
      description: 'The source quantity name to be moved.',
    },
    {
      ...inputs.InventoryLevel.moveQuantityName,
      name: 'toState',
      description: 'The target quantity name to be moved.',
    },
    inputs.InventoryLevel.reason,

    {
      ...inputs.InventoryLevel.referenceDocumentUri,
      optional: true,
    },
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'fromLedgerDocumentUri',
      description: `A freeform URI that represents what changed the source inventory quantity. Required for all quantity names except \`available\`. Will default to \`${DEFAULT_LEDGER_DOC_URI}\` if not set.`,
      optional: true,
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'toLedgerDocumentUri',
      description: `A freeform URI that represents what changed the target inventory quantity. Required for all quantity names except \`available\`. Will default to \`${DEFAULT_LEDGER_DOC_URI}\` if not set.`,
      optional: true,
    }),
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(InventoryLevelSchema, IdentitiesNew.inventoryLevel),
  schema: InventoryLevelSyncTableSchema,
  execute: async function (
    [
      inventoryItemId,
      locationOptionId,
      quantity,
      fromState,
      toState,
      reason,
      referenceDocumentUri,
      fromLedgerDocumentUri,
      toLedgerDocumentUri,
    ],
    context
  ) {
    const locationId = idToGraphQlGid(GraphQlResourceNames.Location, parseOptionId(locationOptionId));

    const moveArgs: MoveInventoryLevelsArgs = {
      inventoryItemId: idToGraphQlGid(GraphQlResourceNames.InventoryItem, inventoryItemId),
      reason,
      quantity,
      referenceDocumentUri,
      from: {
        locationId,
        name: fromState,
        ledgerDocumentUri: fromLedgerDocumentUri,
      },
      to: {
        locationId,
        name: toState,
        ledgerDocumentUri: toLedgerDocumentUri,
      },
    };

    const response = await InventoryLevelClient.createInstance(context).move(moveArgs);
    const inventoryLevel = InventoryLevelModel.createInstance(context, response.body);
    return inventoryLevel.toCodaRow();
  },
});
// #endregion
