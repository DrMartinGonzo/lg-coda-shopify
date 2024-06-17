import { toIsoDate } from '../utils/helpers';
import { graphql } from './utils/graphql-utils';
import { metafieldFieldsFragment } from './metafields-graphql';
import { pageInfoFragment } from './sharedFragments-graphql';

export interface ProductFilters {
  search?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  gift_card?: Boolean;
  published_status?: string;
  title?: string;
  status?: string[];
  vendors?: string[];
  product_types?: string[];
  ids?: string[];
  tags?: string[];
}

// #region Helpers
export function buildProductsSearchQuery({
  created_at_max,
  created_at_min,
  updated_at_max,
  updated_at_min,
  gift_card,
  ids = [],
  product_types = [],
  published_status,
  search,
  status = [],
  tags = [],
  title,
  vendors = [],
}: ProductFilters) {
  const searchItems = [];
  if (search) {
    searchItems.push(search);
  }

  // date range filters
  if (created_at_min) {
    searchItems.push(`created_at:>='${toIsoDate(created_at_min)}'`);
  }
  if (created_at_max) {
    searchItems.push(`created_at:<='${toIsoDate(created_at_max)}'`);
  }
  if (updated_at_min) {
    searchItems.push(`updated_at:>='${toIsoDate(updated_at_min)}'`);
  }
  if (updated_at_max) {
    searchItems.push(`updated_at:<='${toIsoDate(updated_at_max)}'`);
  }

  if (gift_card !== undefined) {
    searchItems.push(`gift_card:'${gift_card === true ? 'true' : 'false'}'`);
  }
  if (published_status) {
    searchItems.push(`published_status:${published_status}`);
  }
  if (status.length) {
    searchItems.push('(' + status.map((status) => `status:${status}`).join(' OR ') + ')');
  }
  if (title) {
    searchItems.push(`title:'${title}'`);
  }
  if (vendors.length) {
    searchItems.push('(' + vendors.map((vendor) => `vendor:'${vendor}'`).join(' OR ') + ')');
  }
  if (product_types.length) {
    searchItems.push('(' + product_types.map((product_type) => `product_type:'${product_type}'`).join(' OR ') + ')');
  }
  if (ids.length) {
    searchItems.push('(' + ids.map((id) => `id:${id}`).join(' OR ') + ')');
  }
  if (tags.length) {
    searchItems.push('(' + tags.map((tag) => `tag:${tag}`).join(' OR ') + ')');
  }

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
export const productFieldsFragment = graphql(
  `
    fragment ProductFields on Product @_unmask {
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
      options @include(if: $includeOptions) {
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
      images(first: 10) @include(if: $includeImages) {
        nodes {
          url
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

export const getProductsQuery = graphql(
  `
    query GetProducts(
      $limit: Int!
      $cursor: String
      $metafieldKeys: [String!]
      $countMetafields: Int
      $searchQuery: String
      $includeOptions: Boolean!
      $includeFeaturedImage: Boolean!
      $includeMetafields: Boolean!
      $includeImages: Boolean!
    ) {
      products(first: $limit, after: $cursor, query: $searchQuery) {
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

export const getSingleProductQuery = graphql(
  `
    query GetSingleProduct(
      $id: ID!
      $metafieldKeys: [String!]
      $countMetafields: Int
      $includeOptions: Boolean!
      $includeFeaturedImage: Boolean!
      $includeMetafields: Boolean!
      $includeImages: Boolean!
    ) {
      product(id: $id) {
        ...ProductFields
      }
    }
  `,
  [productFieldsFragment]
);
// #endregion

// #region Mutations
export const createProductMutation = graphql(
  `
    mutation CreateProduct(
      $countMetafields: Int
      $includeFeaturedImage: Boolean!
      $includeMetafields: Boolean!
      $includeOptions: Boolean!
      $metafieldKeys: [String!]
      # $metafieldsSetsInput: [MetafieldsSetInput!]!
      $productInput: ProductInput!
      $includeImages: Boolean!
    ) {
      productCreate(input: $productInput) {
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

export const updateProductMutation = graphql(
  `
    mutation UpdateProduct(
      $countMetafields: Int
      $includeFeaturedImage: Boolean!
      $includeMetafields: Boolean!
      $includeOptions: Boolean!
      $metafieldKeys: [String!]
      # $metafieldsSetsInput: [MetafieldsSetInput!]!
      $productInput: ProductInput!
      $includeImages: Boolean!
    ) {
      # metafieldsSet(metafields: $metafieldsSetsInput) {
      #   metafields {
      #     key
      #     namespace
      #     value
      #   }
      #   userErrors {
      #     field
      #     message
      #   }
      # }
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

export const deleteProductMutation = graphql(
  `
    mutation DeleteProduct($id: ID!) {
      productDelete(input: { id: $id }) {
        deletedProductId

        userErrors {
          field
          message
        }
      }
    }
  `
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
*/
// #endregion
