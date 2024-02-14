import '../types/admin.generated.d.ts';

import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';

// #region Helpers
export function buildLocationsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
const LocationFragment = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  fragment Location on Location {
    id
    name
    isActive
    fulfillsOnlineOrders
    hasActiveInventory
    shipsInventory
    address {
      address1
      address2
      city
      country
      countryCode
      phone
      zip
      province
      provinceCode
    }
    fulfillmentService @include(if: $includeFulfillmentService) {
      handle
      serviceName
    }
    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {
      instructions
      pickupTime
    }
    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {
      nodes {
        ...MetafieldFields
      }
    }
  }
`;
// #endregion

// #region Queries
export const QueryLocations = /* GraphQL */ `
  ${LocationFragment}

  query GetLocations(
    $maxEntriesPerRun: Int!
    $cursor: String
    $metafieldKeys: [String!]
    $countMetafields: Int
    $includeMetafields: Boolean!
    $includeFulfillmentService: Boolean!
    $includeLocalPickupSettings: Boolean!
    $searchQuery: String
  ) {
    locations(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID, includeInactive: true) {
      nodes {
        ...Location
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const QuerySingleLocation = /* GraphQL */ `
  ${LocationFragment}

  query GetSingleLocation(
    $id: ID!
    $metafieldKeys: [String!]
    $countMetafields: Int
    $includeMetafields: Boolean!
    $includeFulfillmentService: Boolean!
    $includeLocalPickupSettings: Boolean!
  ) {
    location(id: $id) {
      ...Location
    }
  }
`;
// #endregion

// #region Mutations
export const UpdateLocation = /* GraphQL */ `
  ${LocationFragment}

  mutation locationEdit(
    $id: ID!
    $input: LocationEditInput!
    $metafieldKeys: [String!]
    $countMetafields: Int
    $includeMetafields: Boolean!
    $includeFulfillmentService: Boolean!
    $includeLocalPickupSettings: Boolean!
  ) {
    locationEdit(id: $id, input: $input) {
      location {
        ...Location
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ActivateLocation = /* GraphQL */ `
  mutation LocationActivate($locationId: ID!) {
    locationActivate(locationId: $locationId) {
      location {
        name
        isActive
      }
      locationActivateUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const DeactivateLocation = /* GraphQL */ `
  mutation LocationDeactivate($locationId: ID!, $destinationLocationId: ID) {
    locationDeactivate(locationId: $locationId, destinationLocationId: $destinationLocationId) {
      location {
        name
        isActive
      }
      locationDeactivateUserErrors {
        code
        field
        message
      }
    }
  }
`;

// #endregion

// #region Unused stuff
// export const QueryLocationsMetafieldsAdmin = /* GraphQL */ `
//   ${MetafieldFieldsFragment}

//   query getLocationsMetafields(
//     $maxEntriesPerRun: Int!
//     $cursor: String
//     $metafieldKeys: [String!]
//     $countMetafields: Int
//     $searchQuery: String
//   ) {
//     locations(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {
//       nodes {
//         id

//         metafields(keys: $metafieldKeys, first: $countMetafields) {
//           nodes {
//             ...MetafieldFields
//           }
//         }
//       }
//       pageInfo {
//         hasNextPage
//         endCursor
//       }
//     }
//   }
// `;
// #endregion
