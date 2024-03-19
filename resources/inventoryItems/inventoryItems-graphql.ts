import { graphql } from '../../types/graphql';

// #region Helpers
export function buildInventoryItemsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  // date range filters
  if (filters.created_at_min) searchItems.push(`created_at:>='${filters.created_at_min.toISOString()}'`);
  if (filters.created_at_max) searchItems.push(`created_at:<='${filters.created_at_max.toISOString()}'`);
  if (filters.updated_at_min) searchItems.push(`updated_at:>='${filters.updated_at_min.toISOString()}'`);
  if (filters.updated_at_max) searchItems.push(`updated_at:<='${filters.updated_at_max.toISOString()}'`);

  // id filter
  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  if (filters.skus && filters.skus.length)
    searchItems.push('(' + filters.skus.map((sku) => `sku:${sku}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
export const InventoryItemFieldsFragment = graphql(`
  fragment InventoryItemFields on InventoryItem {
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
    locationsCount
    variant {
      id
    }
  }
`);
// #endregion

// #region Queries
export const QueryAllInventoryItems = graphql(
  `
    query GetInventoryItems($maxEntriesPerRun: Int!, $cursor: String, $searchQuery: String) {
      inventoryItems(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {
        nodes {
          ...InventoryItemFields
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  [InventoryItemFieldsFragment]
);
// #endregion

// #region Mutations
export const UpdateInventoryItem = graphql(
  `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemUpdateInput!) {
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
  [InventoryItemFieldsFragment]
);
// #endregion
