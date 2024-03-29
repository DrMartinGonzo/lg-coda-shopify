// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { Identity } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { filters, inputs } from '../../shared-parameters';
import { ShopRestFetcher } from '../shop/ShopRestFetcher';
import { InventoryItemGraphQlFetcher } from './InventoryItemGraphQlFetcher';
import { handleInventoryItemUpdateJob } from './inventoryItems-functions';
import {
  InventoryItemFieldsFragment,
  QueryAllInventoryItems,
  buildInventoryItemsSearchQuery,
} from './inventoryItems-graphql';
import { deepCopy } from '../../utils/helpers';

// #endregion

async function getInventoryItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = deepCopy(InventoryItemSyncTableSchema);

  const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();
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
        query: printGql(QueryAllInventoryItems),
        variables: {
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
          searchQuery: buildInventoryItemsSearchQuery(queryFilters),
        } as VariablesOf<typeof QueryAllInventoryItems>,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof QueryAllInventoryItems>>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.inventoryItems?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.inventoryItems?.nodes) {
        const inventoryItemsFetcher = new InventoryItemGraphQlFetcher(context);
        const inventoryItems = readFragment(InventoryItemFieldsFragment, response.body.data.inventoryItems.nodes);
        return {
          result: inventoryItems.map((inventoryItem) => inventoryItemsFetcher.formatApiToRow(inventoryItem)),
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
      const jobs = updates.map((update) =>
        handleInventoryItemUpdateJob(
          {
            original: update.previousValue as unknown as InventoryItemRow,
            updated: Object.fromEntries(
              Object.entries(update.newValue).filter(([key]) => update.updatedFields.includes(key) || key == 'id')
            ) as InventoryItemRow,
          },
          context
        )
      );
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
  // schema: coda.withIdentity(InventoryItemSchema, Identity.InventoryItem),
  schema: InventoryItemSyncTableSchema,
  execute: async function (
    [inventoryItemId, cost, country_code_of_origin, harmonized_system_code, province_code_of_origin, tracked],
    context
  ) {
    const originalRow = {
      id: inventoryItemId,
    };
    const updatedRow = {
      id: inventoryItemId,
      cost,
      country_code_of_origin,
      harmonized_system_code,
      province_code_of_origin,
      tracked,
    };
    return handleInventoryItemUpdateJob(
      {
        original: originalRow,
        updated: updatedRow,
      },
      context
    );
  },
});
// #endregion
