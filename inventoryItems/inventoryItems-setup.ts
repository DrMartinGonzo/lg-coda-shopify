// #region Imports
import * as coda from '@codahq/packs-sdk';

import { InventoryItemSyncTableSchema } from '../schemas/syncTable/InventoryItemSchema';
import { formatInventoryItemNodeForSchema, handleInventoryItemUpdateJob } from './inventoryItems-functions';
import { IDENTITY_INVENTORYITEM } from '../constants';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { QueryAllInventoryItems, buildInventoryItemsSearchQuery } from './inventoryItems-graphql';
import { GetInventoryItemsQuery, GetInventoryItemsQueryVariables } from '../types/admin.generated';
import { filters, inputs } from '../shared-parameters';
import { cleanQueryParams } from '../helpers-rest';
import { getSchemaCurrencyCode } from '../shop/shop-functions';

// #endregion

async function getInventoryItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = InventoryItemSyncTableSchema;
  augmentedSchema.properties.cost['currencyCode'] = await getSchemaCurrencyCode(context);
  return augmentedSchema;
}

// #region Sync tables
export const Sync_InventoryItems = coda.makeSyncTable({
  name: 'InventoryItems',
  description: 'Return Inventory Items from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_INVENTORYITEM,
  schema: InventoryItemSyncTableSchema,
  dynamicOptions: {
    getSchema: getInventoryItemSchema,
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
      if (response?.body?.data?.inventoryItems) {
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
  // schema: coda.withIdentity(InventoryItemSchema, IDENTITY_INVENTORYITEM),
  schema: InventoryItemSyncTableSchema,
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
