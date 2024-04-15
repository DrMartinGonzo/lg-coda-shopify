import { metafieldFieldsFragment } from './metafields-graphql';

const makeQueryMetafieldsStorefront = (type: string) => {
  return `
    query GetResourceMetafields($metafieldsIdentifiers: [HasMetafieldsIdentifier!]!, $cursor: String) {
      ${type}(first: 200, after: $cursor) {
        nodes {
          id
          metafields(identifiers: $metafieldsIdentifiers) {
            ...metafieldFields
          }
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }

    ${metafieldFieldsFragment}
  `;
};

const makeQueryVariantMetafieldsStorefront = /* GraphQL */ `
  ${metafieldFieldsFragment}

  fragment variantFields on ProductVariant {
    id
    metafields(identifiers: $metafieldsIdentifiers) {
      ...metafieldFields
    }
  }

  query queryVariantMetafields($metafieldsIdentifiers: [HasMetafieldsIdentifier!]!, $cursor: String) {
    products(first: 200, after: $cursor) {
      nodes {
        title
        variants(first: 200) {
          nodes {
            ...variantFields
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
