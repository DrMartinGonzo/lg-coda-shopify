// #region Helpers
export function buildPagesSearchQuery(filters: { [key: string]: any }) {}
// #endregion

// #region Fragments
// ${MetafieldFieldsFragment}
const PageFieldsFragment = /* GraphQL */ `
  fragment PageFields on Page {
    id
    handle
    createdAt
    title
    updatedAt
    onlineStoreUrl
    body
    # author
    # published
    metafields(identifiers: $metafieldsIdentifiers) @include(if: $includeMetafields) {
      ...MetafieldFields
    }
  }
`;
// #endregion

// #region Queries
export const QueryPagesAdmin = /* GraphQL */ `
  ${PageFieldsFragment}

  query GetPagessWithMetafields(
    $maxEntriesPerRun: Int!
    $cursor: String
    $metafieldKeys: [String!]
    $countMetafields: Int
    $maxOptions: Int
    $searchQuery: String
    $includeOptions: Boolean!
    $includeFeaturedImage: Boolean!
    $includeMetafields: Boolean!
  ) {
    products(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {
      nodes {
        ...PageFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
// #endregion

// #region Mutations
export const MutationUpdatePage = /* GraphQL */ `
  ${PageFieldsFragment}

  mutation UpdatePage(
    $countMetafields: Int
    $includeFeaturedImage: Boolean!
    $includeMetafields: Boolean!
    $includeOptions: Boolean!
    $maxOptions: Int
    $metafieldKeys: [String!]
    $metafieldsSetsInput: [MetafieldsSetInput!]!
    $productInput: ProductInput!
  ) {
    metafieldsSet(metafields: $metafieldsSetsInput) {
      metafields {
        key
        namespace
        value
      }
      userErrors {
        field
        message
      }
    }
    productUpdate(input: $productInput) {
      product {
        ...PageFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;
// #endregion
