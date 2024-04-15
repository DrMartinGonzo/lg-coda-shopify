import { graphql } from '../utils/tada-utils';
import { metafieldFieldsFragment } from './metafields-graphql';

// #region Helpers
function buildLocationsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
export const locationFragment = graphql(
  `
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
  `,
  [metafieldFieldsFragment]
);
// #endregion

// #region Queries
export const getLocationsQuery = graphql(
  `
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
  `,
  [locationFragment]
);

export const getSingleLocationQuery = graphql(
  `
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
  `,
  [locationFragment]
);
// #endregion

// #region Mutations
export const editLocationMutation = graphql(
  `
    mutation EditLocation(
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
  `,
  [locationFragment]
);

export const activateLocationMutation = graphql(
  `
    mutation ActivateLocation($locationId: ID!) {
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
  `
);

export const deactivateLocationMutation = graphql(
  `
    mutation DeactivateLocation($locationId: ID!, $destinationLocationId: ID) {
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
  `
);
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
