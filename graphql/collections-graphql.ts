import { graphql } from '../utils/tada-utils';
import { metafieldFieldsFragment } from './metafields-graphql';

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
      $maxEntriesPerRun: Int!
      $cursor: String
      $metafieldKeys: [String!]
      $countMetafields: Int
      $searchQuery: String
      $includeImage: Boolean!
      $includeMetafields: Boolean!
      $includeSortOrder: Boolean!
      $includeRuleSet: Boolean!
    ) {
      collections(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {
        nodes {
          ...CollectionFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  [collectionFieldsFragmentAdmin]
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

/*
export const QueryCollectionsMetafieldsAdmin = /* GraphQL */ `
  ${metafieldFieldsFragment}

  query getCollectionsMetafields(
    $maxEntriesPerRun: Int!
    $cursor: String
    $metafieldKeys: [String!]
    $countMetafields: Int
    $searchQuery: String
  ) {
    collections(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {
      nodes {
        id

        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldFields
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
/*
// #endregion

// #region Mutations
export const MutationCollectionProduct = /* GraphQL */ `
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