import { graphql } from '../utils/tada-utils';
import { metafieldFieldsFragment } from './metafields-graphql';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Helpers
function buildProductsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];
  if (filters.search) searchItems.push(filters.search);

  // date range filters
  if (filters.created_at_min) searchItems.push(`created_at:>='${filters.created_at_min.toISOString()}'`);
  if (filters.created_at_max) searchItems.push(`created_at:<='${filters.created_at_max.toISOString()}'`);
  if (filters.updated_at_min) searchItems.push(`updated_at:>='${filters.updated_at_min.toISOString()}'`);
  if (filters.updated_at_max) searchItems.push(`updated_at:<='${filters.updated_at_max.toISOString()}'`);

  if (filters.gift_card !== undefined) searchItems.push(`gift_card:'${filters.gift_card === true ? 'true' : 'false'}'`);
  if (filters.published_status) searchItems.push(`published_status:${filters.published_status}`);
  if (filters.title) searchItems.push(`title:'${filters.title}'`);
  if (filters.status && filters.status.length)
    searchItems.push('(' + filters.status.map((status) => `status:${status}`).join(' OR ') + ')');

  if (filters.vendors && filters.vendors.length)
    searchItems.push('(' + filters.vendors.map((vendor) => `vendor:'${vendor}'`).join(' OR ') + ')');

  if (filters.product_types && filters.product_types.length)
    searchItems.push(
      '(' + filters.product_types.map((product_type) => `product_type:'${product_type}'`).join(' OR ') + ')'
    );

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
const productFieldsFragment = graphql(
  `
    fragment ProductFields on Product {
      id
      handle
      createdAt
      title
      productType
      publishedAt
      status
      tags
      templateSuffix
      updatedAt
      vendor
      isGiftCard
      descriptionHtml
      onlineStoreUrl

      # Optional fields and connections
      options(first: $maxOptions) @include(if: $includeOptions) {
        name
      }
      featuredImage @include(if: $includeFeaturedImage) {
        url
      }
      metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {
        nodes {
          ...MetafieldFields
        }
      }

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
    }
  `,
  [metafieldFieldsFragment]
);
// #endregion

// #region Queries
// List max 250 available product types
export const getProductTypesQuery = graphql(
  `
    query QueryProductTypes {
      shop {
        name
        productTypes(first: 250) {
          edges {
            node
          }
        }
      }
    }
  `
);

const getProductsAdminQuery = graphql(
  `
    query getProductsWithMetafields(
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
          ...ProductFields
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [productFieldsFragment, pageInfoFragment]
);

// export const QueryProductsMetafieldsAdmin = /* GraphQL */ `
//   ${MetafieldFieldsFragment}

//   query getProductsMetafields(
//     $maxEntriesPerRun: Int!
//     $cursor: String
//     $metafieldKeys: [String!]
//     $countMetafields: Int
//     $searchQuery: String
//   ) {
//     products(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {
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
export const updateProductMutation = graphql(
  `
    mutation UpdateProduct(
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
          ...ProductFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [productFieldsFragment]
);
// #endregion

/**====================================================================================================================
 *    Unused stuff
 *===================================================================================================================== */
// #region Unused stuff
const getProductInCollectionQuery = graphql(
  `
    query ProductInCollection($collectionId: ID!, $productId: ID!) {
      collection(id: $collectionId) {
        hasProduct(id: $productId)
      }
    }
  `
);

// export const makeQueryProductsStorefront = `
//   query queryProducts($cursor: String) {
//     products(first: 200, after: $cursor) {
//       nodes {
//         ...productFields
//       }
//       pageInfo {
//         ...PageInfoFields
//       }
//     }
//   }
//   ${makeProductFieldsFragmentStorefront()}
// `;

/*
export const makeMutationProductsWithMetafieldsBulk = () => `
  mutation {
    bulkOperationRunQuery(
    query: """
      {
        products {
          edges {
            node {
              id
              handle
              createdAt
              title
              options {
                name
              }
              productType
              publishedAt
              status
              tags
              templateSuffix
              updatedAt
              vendor
              descriptionHtml
              metafields {
                edges {
                  node {
                    ...metafieldFields
                  }
                }
              }
            }
          }
        }
      }
      ${metafieldFieldsFragment}
      """
    ) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;
*/

const currentBulkOperationQuery = graphql(
  `
    query CurrentBulkOperation {
      currentBulkOperation {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
        type
        rootObjectCount
      }
    }
  `
);
// #endregion
