import { graphql } from '../../utils/graphql';
import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';

// #region Helpers
export function buildCustomersSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
export const CustomerAddressFieldsFragment = graphql(`
  fragment CustomerAddressFields on MailingAddress {
    address1
    address2
    city
    company
    coordinatesValidated
    country
    countryCodeV2
    firstName
    formattedArea
    id
    lastName
    latitude
    longitude
    name
    phone
    province
    provinceCode
    timeZone
    zip
    formatted(withName: true, withCompany: true)
  }
`);

export const CustomerFieldsFragment = graphql(
  `
    fragment CustomerFields on Customer {
      id
      createdAt
      displayName
      email
      firstName
      lastName
      lifetimeDuration
      locale
      multipassIdentifier
      note
      numberOfOrders
      phone
      productSubscriberStatus
      state
      tags
      taxExempt
      taxExemptions
      unsubscribeUrl
      updatedAt
      validEmailAddress
      verifiedEmail
      addresses(first: 3) {
        ...CustomerAddressFields
      }
      defaultAddress {
        ...CustomerAddressFields
      }
      amountSpent {
        amount
        currencyCode
      }
      canDelete
      # events(first: 2) {
      #   nodes {
      #     ... on CommentEvent {
      #       id
      #       message
      #     }
      #   }
      # }
      emailMarketingConsent {
        consentUpdatedAt
        marketingOptInLevel
        marketingState
      }
      smsMarketingConsent {
        consentCollectedFrom
        consentUpdatedAt
        marketingOptInLevel
        marketingState
      }
      statistics {
        predictedSpendTier
      }

      # Optional fields and connections
      # options(first: $maxOptions) @include(if: $includeOptions) {
      #   name
      # }
      # featuredImage @include(if: $includeFeaturedImage) {
      #   url
      # }
      metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {
        nodes {
          ...MetafieldFields
        }
      }
    }
  `,
  [CustomerAddressFieldsFragment, MetafieldFieldsFragment]
);
// #endregion

// #region Queries
export const queryNodesMetafieldsByKey = graphql(
  `
    query getCustomersWithMetafields(
      $maxEntriesPerRun: Int!
      $cursor: String
      $metafieldKeys: [String!]
      $countMetafields: Int
      $searchQuery: String
      $includeMetafields: Boolean!
    ) {
      customers(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {
        nodes {
          ...CustomerFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  [CustomerFieldsFragment]
);

// export const QueryCustomersMetafieldsAdmin = /* GraphQL */ `
//   ${MetafieldFieldsFragment}

//   query getCustomersMetafields(
//     $maxEntriesPerRun: Int!
//     $cursor: String
//     $metafieldKeys: [String!]
//     $countMetafields: Int
//     $searchQuery: String
//   ) {
//     customers(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {
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

// #region Mutations

// #endregion

// #region Unused stuff

// #endregion
