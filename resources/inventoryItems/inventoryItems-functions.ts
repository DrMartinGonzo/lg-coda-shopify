import * as coda from '@codahq/packs-sdk';

import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { UpdateInventoryItem } from './inventoryItems-graphql';
import { GraphQlResourceName } from '../../types/ShopifyGraphQlResourceTypes';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';

import type {
  InventoryItemFieldsFragment,
  InventoryItemUpdateMutation,
  InventoryItemUpdateMutationVariables,
} from '../../types/generated/admin.generated';
import type { InventoryItemUpdateInput } from '../../types/generated/admin.types';
import type { FetchRequestOptions } from '../../types/Fetcher';

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

export const formatInventoryItemNodeForSchema = (inventoryItem: InventoryItemFieldsFragment) => {
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
    query: UpdateInventoryItem,
    variables: {
      id: inventoryItemGid,
      input: inventoryItemUpdateInput,
    } as InventoryItemUpdateMutationVariables,
  };

  const { response } = await makeGraphQlRequest<InventoryItemUpdateMutation>(
    {
      ...requestOptions,
      payload,
      getUserErrors: (body: { data: InventoryItemUpdateMutation }) => body.data.inventoryItemUpdate.userErrors,
    },
    context
  );

  return response;
}