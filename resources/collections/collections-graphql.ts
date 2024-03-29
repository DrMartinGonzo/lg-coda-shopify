import { graphql } from '../../utils/graphql';
import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';

// #region Helpers
function buildCollectionsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
const CollectionFieldsFragmentAdmin = graphql(
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
  [MetafieldFieldsFragment]
);
// #endregion

// #region Queries
const queryCollectionsAdmin = graphql(
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
  [CollectionFieldsFragmentAdmin]
);

export const queryCollectionType = graphql(
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

export const queryCollectionTypes = graphql(
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
  ${MetafieldFieldsFragment}

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
