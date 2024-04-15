// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromRow } from '../../Fetchers/NEW/AbstractResource_Synced';
import { InventoryItem } from '../../Fetchers/NEW/Resources/InventoryItem';
import { Shop } from '../../Fetchers/NEW/Resources/Shop';
import { Identity } from '../../constants';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { filters, inputs } from '../../shared-parameters';
import { deepCopy } from '../../utils/helpers';

// #endregion

async function getInventoryItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = deepCopy(InventoryItemSyncTableSchema);

  const shopCurrencyCode = await Shop.activeCurrency({ context });
  augmentedSchema.properties.cost['currencyCode'] = shopCurrencyCode;

  return augmentedSchema;
}

// #region Sync tables
export const Sync_InventoryItems = coda.makeSyncTable({
  name: 'InventoryItems',
  description: 'Return Inventory Items from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.InventoryItem,
  schema: InventoryItemSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return InventoryItem.getDynamicSchema({ context, codaSyncParams: [] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncInventoryItems',
    description: '<Help text for the sync formula, not shown to the user>',
    parameters: [
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.productVariant.skuArray, optional: true },
    ],
    execute: async function (params, context) {
      return InventoryItem.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return InventoryItem.syncUpdate(params, updates, context);
    },
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
  // schema: coda.withIdentity(InventoryItemSchema, Identity.InventoryItem),
  schema: InventoryItemSyncTableSchema,
  execute: async function (
    [inventoryItemId, cost, country_code_of_origin, harmonized_system_code, province_code_of_origin, tracked],
    context
  ) {
    const fromRow: FromRow<InventoryItemRow> = {
      row: {
        id: inventoryItemId,
        /* Edge case for cost. Setting it to 0 should delete the value. */
        cost: cost === 0 ? null : cost,
        country_code_of_origin,
        harmonized_system_code,
        province_code_of_origin,
        tracked,
      },
    };

    const updatedInventoryItem = new InventoryItem({ context, fromRow });
    await updatedInventoryItem.saveAndUpdate();
    return updatedInventoryItem.formatToRow();
  },
});
// #endregion
