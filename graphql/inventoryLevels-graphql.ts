import { graphql } from './utils/graphql-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Helpers

// #endregion

// #region Fragments
export const inventoryLevelFragment = graphql(
  `
    fragment InventoryLevelFields on InventoryLevel @_unmask {
      id
      updatedAt
      createdAt
      quantities(names: $quantitiesNames) {
        name
        quantity
      }
      item @include(if: $includeInventoryItem) {
        id
        inventoryHistoryUrl
        variant @include(if: $includeVariant) {
          id
        }
      }
      location @include(if: $includeLocation) {
        id
      }
    }
  `
);

const inventoryAdjustmentGroupFragment = graphql(
  `
    fragment inventoryAdjustmentGroupFields on InventoryAdjustmentGroup @_unmask {
      id
      createdAt
      reason
      referenceDocumentUri
      changes {
        name
        delta
      }
    }
  `
);
// #endregion

// #region Queries
export const getInventoryLevelsAtLocation = graphql(
  `
    query QueryInventoryLevelsAtLocation(
      $limit: Int!
      $cursor: String
      $locationId: ID!
      $quantitiesNames: [String!]!
      $includeInventoryItem: Boolean!
      $includeLocation: Boolean!
      $includeVariant: Boolean!
    ) {
      location(id: $locationId) {
        inventoryLevels(first: $limit, after: $cursor) {
          nodes {
            ...InventoryLevelFields
          }
          pageInfo {
            ...PageInfoFields
          }
        }
      }
    }
  `,
  [inventoryLevelFragment, pageInfoFragment]
);

export const getSingleInventoryLevelQuery = graphql(
  `
    query QueryInventoryLevel(
      $id: ID!
      $quantitiesNames: [String!]!
      $includeInventoryItem: Boolean!
      $includeLocation: Boolean!
      $includeVariant: Boolean!
    ) {
      inventoryLevel(id: $id) {
        ...InventoryLevelFields
      }
    }
  `,
  [inventoryLevelFragment]
);

const getSingleInventoryAdjustmentGroupQuery = graphql(
  `
    query QueryInventoryAdjustmentGroup($id: ID!) {
      node(id: $id) {
        ... on InventoryAdjustmentGroup {
          changes {
            name
            delta
            quantityAfterChange
          }
        }
      }
    }
  `
);

export const getSingleInventoryLevelByInventoryItemQuery = graphql(
  `
    query QueryInventoryLevelByInventoryItem(
      $inventoryItemId: ID!
      $locationId: ID!
      $quantitiesNames: [String!]!
      $includeInventoryItem: Boolean!
      $includeLocation: Boolean!
      $includeVariant: Boolean!
    ) {
      inventoryItem(id: $inventoryItemId) {
        inventoryLevel(locationId: $locationId) {
          ...InventoryLevelFields
        }
      }
    }
  `,
  [inventoryLevelFragment]
);
// #endregion

// #region Mutations
export const setInventoryLevelQuantities = graphql(
  `
    mutation SetInventoryQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          ...inventoryAdjustmentGroupFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,
  [inventoryAdjustmentGroupFragment]
);

export const adjustInventoryLevelQuantities = graphql(
  `
    mutation AdjustInventoryQuantities($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        inventoryAdjustmentGroup {
          ...inventoryAdjustmentGroupFields
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `,
  [inventoryAdjustmentGroupFragment]
);

export const moveInventoryLevelQuantities = graphql(
  `
    mutation inventoryMoveQuantities($input: InventoryMoveQuantitiesInput!) {
      inventoryMoveQuantities(input: $input) {
        inventoryAdjustmentGroup {
          ...inventoryAdjustmentGroupFields
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `,
  [inventoryAdjustmentGroupFragment]
);
// #endregion
