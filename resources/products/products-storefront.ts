import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';
import { MAX_OPTIONS_PER_PRODUCT } from './products-graphql';

const metafieldStorefrontNodes = `
  metafields(identifiers: $metafieldsIdentifiers) {
    ...metafieldFields
  }`;

const makeProductFieldsFragmentStorefront = (includeMetafields: boolean = false) => `
  ${MetafieldFieldsFragment}

  fragment productFields on Product {
    availableForSale
    createdAt
    handle
    id
    descriptionHtml
    productType
    publishedAt
    seo {
      description
      title
    }
    tags
    title
    featuredImage {
      url
    }
    #trackingParameters
    updatedAt
    vendor
    isGiftCard
    media(first: 10) {
      nodes {
        mediaContentType
      }
    }
    options(first: ${MAX_OPTIONS_PER_PRODUCT}) {
      name
      #values
    }

    metafields(identifiers: $metafieldsIdentifiers) @include(if: $includeMetafields) {
      ...MetafieldFields
    }
  }
`;

// Storefront query to list max 50 available product types
export const queryAvailableProductTypes = `
  query QueryAvailableProductTypes{
    productTypes(first: 250) {
      edges {
        node
      }
    }
  }
`;

export const makeQueryProductsStorefront = `
  query queryProducts($cursor: String, $metafieldsIdentifiers: [HasMetafieldsIdentifier!]!, $includeMetafields: Boolean!) {
    products(first: 200, after: $cursor) {
      nodes {
        ...productFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${makeProductFieldsFragmentStorefront()}
`;
