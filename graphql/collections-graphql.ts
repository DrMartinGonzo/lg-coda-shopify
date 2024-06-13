import { graphql } from '../utils/tada-utils';
import { metafieldFieldsFragment } from './metafields-graphql';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Helpers
function buildCollectionsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
const collectionFieldsFragmentAdmin = graphql(
  `
    fragment CollectionFields on Collection {
      handle
      id
      descriptionHtml
      updatedAt
      templateSuffix
      title
      # availableForSale
      # publishedOnPublication(publicationId: "gid://shopify/Publication/42911268979")
      # seo {
      #   description
      #   title
      # }
      # trackingParameters
      # media(first: 10) {
      #   nodes {
      #     mediaContentType
      #   }
      # }

      # Optional fields and connections
      image @include(if: $includeImage) {
        url
      }
      sortOrder @include(if: $includeSortOrder)
      ruleSet @include(if: $includeRuleSet) {
        appliedDisjunctively
        rules {
          column
          condition
          relation
        }
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
const collectionsAdminQuery = graphql(
  `
    query GetCollections(
      $limit: Int!
      $cursor: String
      $metafieldKeys: [String!]
      $countMetafields: Int
      $searchQuery: String
      $includeImage: Boolean!
      $includeMetafields: Boolean!
      $includeSortOrder: Boolean!
      $includeRuleSet: Boolean!
    ) {
      collections(first: $limit, after: $cursor, query: $searchQuery) {
        nodes {
          ...CollectionFields
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [collectionFieldsFragmentAdmin, pageInfoFragment]
);

export const collectionTypeQuery = graphql(
  `
    query GetCollectionType($collectionGid: ID!) {
      collection(id: $collectionGid) {
        # will be null for non smart collections
        isSmartCollection: ruleSet {
          appliedDisjunctively
        }
      }
    }
  `
);

export const collectionTypesQuery = graphql(
  `
    query GetCollectionTypes($ids: [ID!]!) {
      nodes(ids: $ids) {
        id
        __typename
        ... on Collection {
          isSmartCollection: ruleSet {
            appliedDisjunctively
          }
        }
      }
    }
  `
);
// #endregion

// #region Mutations
const MutationCollectionProduct = /* GraphQL */ `
  mutation UpdateCollection($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection {
        handle
        descriptionHtml
        templateSuffix
        title
      }

      userErrors {
        field
        message
      }
    }
  }
`;
// #endregion
