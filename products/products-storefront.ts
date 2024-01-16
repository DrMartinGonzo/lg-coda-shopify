import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';
import { MAX_OPTIONS_PER_PRODUCT } from './products-graphql';

const metafieldStorefrontNodes = `
  metafields(identifiers: $metafieldsIdentifiers) {
    ...metafieldFields
  }`;

const makeProductFieldsFragmentStorefront = (includeMetafields: boolean = false) => `
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
    ${includeMetafields ? `metafields(identifiers: $metafieldsIdentifiers) { ...metafieldFields }` : ''}
    options(first: ${MAX_OPTIONS_PER_PRODUCT}) {
      name
      #values
    }
  }

  ${includeMetafields ? MetafieldFieldsFragment : ''}
`;

// Storefront query to list max 50 available product types
export const queryAvailableProductTypes = `
  query QueryAvailableProductTypes{
    productTypes(first: 50) {
      edges {
        node
      }
    }
  }
`;

export const makeQueryProductsStorefront = `
  query queryProducts($cursor: String) {
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
