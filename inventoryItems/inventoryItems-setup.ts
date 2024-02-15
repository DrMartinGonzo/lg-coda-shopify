import * as coda from '@codahq/packs-sdk';

import { InventoryItemSchema } from '../schemas/syncTable/InventoryItemSchema';
import { formatInventoryItemNodeForSchema, handleInventoryItemUpdateJob } from './inventoryItems-functions';
import { CODA_SUPPORTED_CURRENCIES, IDENTITY_INVENTORYITEM } from '../constants';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { QueryAllInventoryItems, buildInventoryItemsSearchQuery } from './inventoryItems-graphql';
import { GetInventoryItemsQuery, GetInventoryItemsQueryVariables } from '../types/admin.generated';
import { fetchShopDetails } from '../shop/shop-functions';
import { sharedParameters } from '../shared-parameters';
import { countryCodes } from '../types/misc';
import { cleanQueryParams } from '../helpers-rest';

async function getInventoryItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = InventoryItemSchema;

  // TODO: need a generic setCurrencyCode function
  const shop = await fetchShopDetails(['currency'], context);
  if (shop && shop['currency']) {
    let currencyCode = shop['currency'];
    if (!CODA_SUPPORTED_CURRENCIES.includes(currencyCode)) {
      console.error(`Shop currency ${currencyCode} not supported. Falling back to USD.`);
      currencyCode = 'USD';
    }

    // Main props
    augmentedSchema.properties.cost.currencyCode = currencyCode;
  }

  return augmentedSchema;
}

const parameters = {
  inventoryItemId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'inventoryItemId',
    description: 'The ID of the Inventory Item.',
  }),
  cost: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'cost',
    description: "Unit cost associated with the inventory item, the currency is the shop's default currency.",
  }),
  countryCodeOfOrigin: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'countryCodeOfOrigin',
    description: 'The ISO 3166-1 alpha-2 country code of where the item originated from.',
    autocomplete: countryCodes,
  }),
  provinceCodeOfOrigin: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'provinceCodeOfOrigin',
    description: 'The ISO 3166-2 alpha-2 province/state code of where the item originated from.',
  }),
  harmonizedSystemCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'harmonizedSystemCode',
    description: 'The harmonized system code of the inventory item. This must be a number between 6 and 13 digits.',
  }),
  tracked: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'tracked',
    description: "Whether the inventory item is tracked. The value must be true to adjust the item's inventory levels.",
  }),
};

export const setupInventoryItems = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync tables
  // Sync all Inventory Items
  pack.addSyncTable({
    name: 'InventoryItems',
    description: 'Return Inventory Items from this shop.',
    identityName: IDENTITY_INVENTORYITEM,
    schema: InventoryItemSchema,
    dynamicOptions: {
      getSchema: getInventoryItemSchema,
      defaultAddDynamicColumns: false,
    },

    formula: {
      name: 'SyncInventoryItems',
      description: '<Help text for the sync formula, not shown to the user>',
      parameters: [
        { ...sharedParameters.filterCreatedAtRange, optional: true },
        { ...sharedParameters.filterUpdatedAtRange, optional: true },
        { ...sharedParameters.filterSkus, optional: true },
      ],
      execute: async function ([createdAtRange, updatedAtRange, skus], context: coda.SyncExecutionContext) {
        const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
        const defaultMaxEntriesPerRun = 50;
        const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
        }

        const queryFilters = {
          created_at_min: createdAtRange ? createdAtRange[0] : undefined,
          created_at_max: createdAtRange ? createdAtRange[1] : undefined,
          updated_at_min: updatedAtRange ? updatedAtRange[0] : undefined,
          updated_at_max: updatedAtRange ? updatedAtRange[1] : undefined,
          skus,
        };
        // Remove any undefined filters
        Object.keys(queryFilters).forEach((key) => {
          if (queryFilters[key] === undefined) delete queryFilters[key];
        });
        const payload = {
          query: QueryAllInventoryItems,
          variables: {
            maxEntriesPerRun,
            cursor: prevContinuation?.cursor ?? null,
            searchQuery: buildInventoryItemsSearchQuery(queryFilters),
          } as GetInventoryItemsQueryVariables,
        };

        const { response, continuation } = await makeSyncTableGraphQlRequest(
          {
            payload,
            maxEntriesPerRun,
            prevContinuation,
            getPageInfo: (data: any) => data.inventoryItems?.pageInfo,
          },
          context
        );
        if (response && response.body.data?.inventoryItems) {
          const data = response.body.data as GetInventoryItemsQuery;
          return {
            result: data.inventoryItems.nodes.map((inventoryItem) => formatInventoryItemNodeForSchema(inventoryItem)),
            continuation,
          };
        } else {
          return {
            result: [],
            continuation,
          };
        }
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (params, updates, context) {
        const jobs = updates.map((update) => handleInventoryItemUpdateJob(update, context));
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
  // UpdateInventoryItem Action
  pack.addFormula({
    name: 'UpdateInventoryItem',
    description: 'Update an existing Shopify Inventory Item and return the updated data.',
    parameters: [
      parameters.inventoryItemId,
      {
        ...parameters.cost,
        optional: true,
        description:
          "Unit cost associated with the inventory item, the currency is the shop's default currency. Set to 0 to delete the cost value.",
      },
      { ...parameters.countryCodeOfOrigin, optional: true },
      { ...parameters.harmonizedSystemCode, optional: true },
      { ...parameters.provinceCodeOfOrigin, optional: true },
      { ...parameters.tracked, optional: true },
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(InventoryItemSchema, IDENTITY_INVENTORYITEM),
    schema: InventoryItemSchema,
    execute: async function (
      [inventoryItemId, cost, country_code_of_origin, harmonized_system_code, province_code_of_origin, tracked],
      context
    ) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, any>;

      const newValues = cleanQueryParams({
        cost,
        country_code_of_origin,
        harmonized_system_code,
        province_code_of_origin,
        tracked,
      });
      /* Edge case for cost. Setting it to 0 should delete the value. All other
      values when undefined will not be deleted, just not updated */
      newValues.cost = cost === 0 ? undefined : cost;

      update = {
        previousValue: { id: inventoryItemId },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };

      return handleInventoryItemUpdateJob(update, context);
    },
  });
  // #endregion
};
