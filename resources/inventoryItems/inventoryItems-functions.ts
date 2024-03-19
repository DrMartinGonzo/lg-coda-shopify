import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { InventoryItemUpdateInput } from '../../types/admin.types';
import { InventoryItemFieldsFragment, UpdateInventoryItem } from './inventoryItems-graphql';

// #region Helpers
export async function handleInventoryItemUpdateJob(
  update: coda.SyncUpdate<string, string, typeof InventoryItemSyncTableSchema>,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const subJobs: (Promise<any> | undefined)[] = [];
  const inventoryItemId = update.previousValue.id as number;

  if (updatedFields.length) {
    const inventoryItemUpdateInput = formatGraphQlInventoryItemUpdateInput(update, updatedFields);
    subJobs.push(
      updateInventoryItemGraphQl(
        idToGraphQlGid(GraphQlResourceName.InventoryItem, inventoryItemId),
        inventoryItemUpdateInput,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob] = await Promise.all(subJobs);
  if (updateJob?.body?.data?.inventoryItemUpdate?.inventoryItem) {
    obj = {
      ...obj,
      ...formatInventoryItemNodeForSchema(updateJob.body.data.inventoryItemUpdate.inventoryItem),
    };
  }
  return obj;
}
// #endregion

// #region Formatting functions
/**
 * Format InventoryItemUpdateInput for a GraphQL InventoryItem update mutation
 */
function formatGraphQlInventoryItemUpdateInput(update: any, fromKeys: string[]): InventoryItemUpdateInput {
  const ret = {};
  if (!fromKeys.length) return ret;

  fromKeys.forEach((fromKey) => {
    const value = update.newValue[fromKey];
    let inputKey = fromKey;
    switch (fromKey) {
      case 'country_code_of_origin':
        inputKey = 'countryCodeOfOrigin';
        break;
      case 'harmonized_system_code':
        inputKey = 'harmonizedSystemCode';
        break;
      case 'province_code_of_origin':
        inputKey = 'provinceCodeOfOrigin';
        break;
      default:
        break;
    }
    ret[inputKey] = value !== undefined && value !== '' ? value : null;
  });

  return ret;
}

export const formatInventoryItemNodeForSchema = (inventoryItem: ResultOf<typeof InventoryItemFieldsFragment>) => {
  const obj: any = {
    ...inventoryItem,
    admin_graphql_api_id: inventoryItem.id,
    id: graphQlGidToId(inventoryItem.id),
    cost: inventoryItem.unitCost?.amount,
    country_code_of_origin: inventoryItem.countryCodeOfOrigin,
    created_at: inventoryItem.createdAt,
    harmonized_system_code: inventoryItem.harmonizedSystemCode,
    province_code_of_origin: inventoryItem.provinceCodeOfOrigin,
    requires_shipping: inventoryItem.requiresShipping,
    sku: inventoryItem.sku,
    tracked: inventoryItem.tracked,
    updated_at: inventoryItem.updatedAt,
    inventory_history_url: inventoryItem.inventoryHistoryUrl,
  };

  if (inventoryItem.variant?.id) {
    const variantId = graphQlGidToId(inventoryItem.variant?.id);
    obj.variant = formatProductVariantReference(variantId);
    obj.variant_id = variantId;
  }

  return obj;
};

// #endregion

async function updateInventoryItemGraphQl(
  inventoryItemGid: string,
  inventoryItemUpdateInput: InventoryItemUpdateInput,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(UpdateInventoryItem),
    variables: {
      id: inventoryItemGid,
      input: inventoryItemUpdateInput,
    } as VariablesOf<typeof UpdateInventoryItem>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof UpdateInventoryItem>>(
    {
      ...requestOptions,
      payload,
      getUserErrors: (body: { data: ResultOf<typeof UpdateInventoryItem> }) => body.data.inventoryItemUpdate.userErrors,
    },
    context
  );

  return response;
}
