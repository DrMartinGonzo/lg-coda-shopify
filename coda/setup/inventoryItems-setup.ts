// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InventoryItemClient } from '../../Clients/GraphQlClients';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { InventoryItemModel } from '../../models/graphql/InventoryItemModel';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { SyncedInventoryItems } from '../../sync/graphql/SyncedInventoryItems';
import { filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedInventoryItems(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedInventoryItems({
    context,
    codaSyncParams,
    model: InventoryItemModel,
    client: InventoryItemClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({
  publishedStatus,
  statusArray,
  title,
}: {
  publishedStatus?: string;
  statusArray?: string[];
  title?: string;
}) {
  // const invalidMsg: string[] = [];
  // if (
  //   !isNullishOrEmpty(statusArray) &&
  //   !assertAllowedValue(statusArray, optionValues(OPTIONS_PRODUCT_STATUS_GRAPHQL))
  // ) {
  //   invalidMsg.push(`product_status: ${statusArray.join(', ')}`);
  // }
  // if (
  //   !isNullishOrEmpty(publishedStatus) &&
  //   !assertAllowedValue(publishedStatus, optionValues(OPTIONS_PUBLISHED_STATUS))
  // ) {
  //   invalidMsg.push(`published_status: ${publishedStatus}`);
  // }
  // if (!assertNotBlank(title)) {
  //   invalidMsg.push("title can't be blank");
  // }
  // if (invalidMsg.length) {
  //   throw new InvalidValueVisibleError(invalidMsg.join(', '));
  // }
}
// #endregion

// #region Sync tables
export const Sync_InventoryItems = coda.makeSyncTable({
  name: 'InventoryItems',
  description: 'Return Inventory Items from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.InventoryItem,
  schema: SyncedInventoryItems.staticSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return SyncedInventoryItems.getDynamicSchema({ context, codaSyncParams: [] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncInventoryItems',
    description: '<Help text for the sync formula, not shown to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedInventoryItems.codaParamsMap}
     */
    parameters: [
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.productVariant.skuArray, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedInventoryItems(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedInventoryItems(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
export const Action_UpdateInventoryItem = coda.makeFormula({
  name: 'UpdateInventoryItem',
  description: 'Update an existing Shopify Inventory Item and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.inventoryItem.id,
    {
      ...inputs.inventoryItem.cost,
      description: inputs.inventoryItem.cost.description + ' Set to 0 to delete the cost value.',
      optional: true,
    },
    {
      ...inputs.location.countryCode,
      name: 'countryCodeOfOrigin',
      description: 'The ISO 3166-1 alpha-2 country code of where the item originated from.',
      optional: true,
    },
    { ...inputs.inventoryItem.harmonizedSystemCode, optional: true },
    {
      ...inputs.location.provinceCode,
      description: 'The province/state code of where the item originated from (ISO 3166-2 alpha-2 format).',
      optional: true,
    },
    { ...inputs.inventoryItem.tracked, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(InventoryItemSchema, IdentitiesNew.inventoryItem),
  schema: InventoryItemSyncTableSchema,
  execute: async function (
    [inventoryItemId, cost, country_code_of_origin, harmonized_system_code, province_code_of_origin, tracked],
    context
  ) {
    const inventoryItem = InventoryItemModel.createInstanceFromRow(context, {
      id: inventoryItemId,
      /* Edge case for cost. Setting it to 0 should delete the value. */
      cost: cost === 0 ? null : cost,
      country_code_of_origin,
      harmonized_system_code,
      province_code_of_origin,
      tracked,
    });

    await inventoryItem.save();
    return inventoryItem.toCodaRow();
  },
});
// #endregion
