import { toIsoDate } from '../utils/helpers';
import { graphql } from './utils/graphql-utils';
import { metafieldFieldsFragment } from './metafields-graphql';
import { pageInfoFragment } from './sharedFragments-graphql';

export interface ProductVariantFilters {
  search?: string;

  created_at_max?: Date;
  created_at_min?: Date;
  inventory_quantity_max?: number;
  inventory_quantity_min?: number;
  // optionsFilter?: string[];
  product_ids?: string[];
  product_publication_status?: string;
  product_status?: string[];
  product_types?: string[];
  skus?: string[];
  updated_at_max?: Date;
  updated_at_min?: Date;
  vendors?: string[];
}

// #region Helpers
export function buildProductVariantsSearchQuery({
  created_at_max,
  created_at_min,
  updated_at_max,
  updated_at_min,
  search,
  product_publication_status,
  inventory_quantity_min,
  inventory_quantity_max,
  product_ids = [],
  // optionsFilter = [],
  product_types = [],
  product_status = [],
  skus = [],
  vendors = [],
}: ProductVariantFilters) {
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

  if (inventory_quantity_min) {
    searchItems.push(`inventory_quantity:>='${inventory_quantity_min}'`);
  }
  if (inventory_quantity_max) {
    searchItems.push(`inventory_quantity:<='${inventory_quantity_max}'`);
  }

  if (product_ids.length) {
    searchItems.push(`(product_ids:${product_ids.join(',')})`);
  }
  if (product_publication_status) {
    searchItems.push(`product_publication_status:${product_publication_status}`);
  }

  // if (optionsFilter.length) {
  //   searchItems.push(
  //     '(' +
  //       optionsFilter.map((option) => `option1:${option} OR option2:${option} OR option3:${option}`).join(' OR ') +
  //       ')'
  //   );
  // }

  if (product_status.length) {
    searchItems.push('(' + product_status.map((status) => `product_status:${status}`).join(' OR ') + ')');
  }
  if (product_types.length) {
    searchItems.push('(' + product_types.map((product_type) => `product_type:'${product_type}'`).join(' OR ') + ')');
  }
  if (vendors.length) {
    searchItems.push('(' + vendors.map((vendor) => `vendor:'${vendor}'`).join(' OR ') + ')');
  }
  if (skus.length) {
    searchItems.push('(' + skus.map((sku) => `sku:${sku}`).join(' OR ') + ')');
  }

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
const inventoryItemFieldsFragment = graphql(`
  fragment InventoryItemFields on InventoryItem @_unmask {
    id
    # createdAt
    # updatedAt
    countryCodeOfOrigin
    harmonizedSystemCode
    measurement @include(if: $includeWeight) {
      weight {
        unit
        value
      }
    }
    provinceCodeOfOrigin
    requiresShipping
    sku
    tracked
    # trackedEditable {
    #   locked
    #   reason
    # }
    unitCost @include(if: $includeCost) {
      amount
      currencyCode
    }
  }
`);

export const productVariantFieldsFragment = graphql(
  `
    fragment ProductVariantFields on ProductVariant @_unmask {
      barcode
      compareAtPrice
      createdAt
      displayName
      id
      inventoryPolicy
      inventoryQuantity
      position
      price
      taxable
      taxCode
      title
      updatedAt

      image @include(if: $includeImage) {
        url
      }
      inventoryItem @include(if: $includeInventoryItem) {
        ...InventoryItemFields
      }
      metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {
        nodes {
          ...MetafieldFields
        }
      }
      product @include(if: $includeProduct) {
        id
        onlineStoreUrl
      }
      selectedOptions @include(if: $includeOptions) {
        value
      }
    }
  `,
  [inventoryItemFieldsFragment, metafieldFieldsFragment]
);
// #endregion

// #region Queries
export const getProductVariantsQuery = graphql(
  `
    query GetProductVariants(
      $limit: Int!
      $cursor: String
      $metafieldKeys: [String!]
      $countMetafields: Int
      $searchQuery: String
      $includeCost: Boolean!
      $includeImage: Boolean!
      $includeInventoryItem: Boolean!
      $includeMetafields: Boolean!
      $includeOptions: Boolean!
      $includeProduct: Boolean!
      $includeWeight: Boolean!
    ) {
      productVariants(first: $limit, after: $cursor, query: $searchQuery) {
        nodes {
          ...ProductVariantFields
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [productVariantFieldsFragment, pageInfoFragment]
);

export const getSingleProductVariantQuery = graphql(
  `
    query GetSingleProductVariant(
      $id: ID!
      $metafieldKeys: [String!]
      $countMetafields: Int
      $includeCost: Boolean!
      $includeImage: Boolean!
      $includeInventoryItem: Boolean!
      $includeMetafields: Boolean!
      $includeOptions: Boolean!
      $includeProduct: Boolean!
      $includeWeight: Boolean!
    ) {
      productVariant(id: $id) {
        ...ProductVariantFields
      }
    }
  `,
  [productVariantFieldsFragment]
);
// #endregion

// #region Mutations
export const createProductVariantMutation = graphql(
  `
    mutation CreateProductVariant(
      $input: ProductVariantInput!
      $includeCost: Boolean!
      $includeImage: Boolean!
      $includeInventoryItem: Boolean!
      $includeMetafields: Boolean!
      $metafieldKeys: [String!]
      $countMetafields: Int
      $includeOptions: Boolean!
      $includeProduct: Boolean!
      $includeWeight: Boolean!
    ) {
      productVariantCreate(input: $input) {
        productVariant {
          ...ProductVariantFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [productVariantFieldsFragment]
);

export const updateProductVariantMutation = graphql(
  `
    mutation UpdateProductVariant(
      $input: ProductVariantInput!
      $includeCost: Boolean!
      $includeImage: Boolean!
      $includeInventoryItem: Boolean!
      $includeMetafields: Boolean!
      $metafieldKeys: [String!]
      $countMetafields: Int
      $includeOptions: Boolean!
      $includeProduct: Boolean!
      $includeWeight: Boolean!
    ) {
      productVariantUpdate(input: $input) {
        productVariant {
          ...ProductVariantFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [productVariantFieldsFragment]
);

export const deleteProductVariantMutation = graphql(
  `
    mutation DeleteProduct($id: ID!) {
      productVariantDelete(id: $id) {
        deletedProductVariantId

        userErrors {
          field
          message
        }
      }
    }
  `
);
// #endregion
