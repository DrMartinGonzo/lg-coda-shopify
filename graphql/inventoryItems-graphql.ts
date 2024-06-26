import { toIsoDate } from '../utils/helpers';
import { graphql } from './utils/graphql-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Helpers
export function buildInventoryItemsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  // date range filters
  if (filters.created_at_min) searchItems.push(`created_at:>='${toIsoDate(filters.created_at_min)}'`);
  if (filters.created_at_max) searchItems.push(`created_at:<='${toIsoDate(filters.created_at_max)}'`);
  if (filters.updated_at_min) searchItems.push(`updated_at:>='${toIsoDate(filters.updated_at_min)}'`);
  if (filters.updated_at_max) searchItems.push(`updated_at:<='${toIsoDate(filters.updated_at_max)}'`);

  // id filter
  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  if (filters.skus && filters.skus.length)
    searchItems.push('(' + filters.skus.map((sku) => `sku:${sku}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
export const inventoryItemFieldsFragment = graphql(`
  fragment InventoryItemFields on InventoryItem @_unmask {
    harmonizedSystemCode
    createdAt
    id
    inventoryHistoryUrl
    provinceCodeOfOrigin
    requiresShipping
    sku
    tracked
    trackedEditable {
      locked
      reason
    }
    updatedAt
    unitCost {
      amount
      currencyCode
    }
    countryCodeOfOrigin
    # locationsCount {
    #   count
    # }
    variant {
      id
    }
  }
`);
// #endregion

// #region Queries
export const getInventoryItemsQuery = graphql(
  `
    query GetInventoryItems($limit: Int!, $cursor: String, $searchQuery: String) {
      inventoryItems(first: $limit, after: $cursor, query: $searchQuery) {
        nodes {
          ...InventoryItemFields
        }

        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [inventoryItemFieldsFragment, pageInfoFragment]
);
// #endregion

// #region Mutations
export const updateInventoryItemMutation = graphql(
  `
    mutation UpdateInventoryItem($id: ID!, $input: InventoryItemUpdateInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem {
          ...InventoryItemFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [inventoryItemFieldsFragment]
);
// #endregion
