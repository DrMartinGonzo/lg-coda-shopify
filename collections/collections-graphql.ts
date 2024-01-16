import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';

// #region Fragments
const CollectionFieldsFragmentAdmin = /* GraphQL */ `
  ${MetafieldFieldsFragment}

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
`;
// #endregion

// #region Queries
export const QueryCollectionsAdmin = /* GraphQL */ `
  ${CollectionFieldsFragmentAdmin}

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
`;

export const isSmartCollection = /* GraphQL */ `
  query IsSmartCollection($gid: ID!) {
    collection(id: $gid) {
      # will be null for non smart collections
      isSmartCollection: ruleSet {
        appliedDisjunctively
      }
    }
  }
`;
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

// TODO: see if useful, and move it elsewhere
export const queryOnlineStorePublication = /* GraphQL */ `
  query GetOnlineStorePublication {
    appByHandle(handle: "online_store") {
      id
      handle
      title
      installation {
        publication {
          id
        }
      }
    }
  }
`;
