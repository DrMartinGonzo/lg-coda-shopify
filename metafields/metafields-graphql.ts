import { normalizeSchemaKey } from '@codahq/packs-sdk/schema';
import { capitalizeFirstChar } from '../helpers';
import { splitMetaFieldKeyAndNamespace } from './metafields-functions';

export const mutationSetResourceMetafields = `#graphql
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const queryProductMetafields = `#graphql
  query queryProductMetafields($keys: [String!]) {
    product(id: "gid://shopify/Product/4553713713267") {
      metafields(first: 10,  keys: $keys) {
        nodes {
          id
          key
          namespace
        }
      }
    }
  }
`;
export const metafieldFieldsFragment = `#graphql
  fragment metafieldFields on Metafield {
    id
    value
    type
    key
    namespace
    __typename
  }
`;

export const queryMetafieldDefinitions = `#graphql
  query QueryMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxMetafieldsPerResource: Int!) {
    metafieldDefinitions(ownerType: $ownerType, first: $maxMetafieldsPerResource) {
      nodes {
        key
        id
        namespace
        name
        description
        type {
          name
        }
        validations {
          name
          type
          value
        }
      }
    }
  }`;

// export const makeQueryShopMetafields = (optionalFieldsKeys) => {
//   console.log('optionalFieldsKeys', optionalFieldsKeys);
//   return `#graphql
//     query queryShopMetafields {
//       shop {
//         id
//         ${optionalFieldsKeys.map((key) => {
//           const { metaKey, metaNamespace } = getMetaFieldKeyAndNamespaceFromFromKey(key);
//           return `${normalizeSchemaKey(key)}: metafield(key: "${metaKey}", namespace: "${metaNamespace}") {
//           ...metafieldFields
//         }`;
//         })}
//       }
//     }

//     fragment metafieldFields on Metafield {
//       id
//       value
//       type
//     }
//   `;
// };

export const makeQueryMetafieldsAdmin = (graphQlResourceQuery: string, optionalFieldsKeys) => {
  return `#graphql
    query query${capitalizeFirstChar(graphQlResourceQuery)}Metafields($batchSize: Int!, $cursor: String){
      ${graphQlResourceQuery}(first: $batchSize, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          ${optionalFieldsKeys.map((key) => {
            const { metaKey, metaNamespace } = splitMetaFieldKeyAndNamespace(key);
            return `${normalizeSchemaKey(key)}: metafield(key: "${metaKey}", namespace: "${metaNamespace}") {
              ...metafieldFields
            }`;
          })}
        }
      }
    }

    ${metafieldFieldsFragment}
  `;
};
export const makeQueryMetafieldsStorefront = (type: string) => {
  return `#graphql
    query query${capitalizeFirstChar(
      type
    )}Metafields($metafieldsIdentifiers: [HasMetafieldsIdentifier!]!, $cursor: String) {
      ${type}(first: 200, after: $cursor) {

        nodes {
          id
          metafields(identifiers: $metafieldsIdentifiers) {
            ...metafieldFields
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }

    ${metafieldFieldsFragment}
  `;
};

export const makeQueryVariantMetafieldsStorefront = () => {
  return `#graphql
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
          endCursor
          hasNextPage
        }
      }
    }

    ${metafieldFieldsFragment}

    fragment variantFields on ProductVariant {
      id
      metafields(identifiers: $metafieldsIdentifiers) {
        ...metafieldFields
      }
    }
  `;
};
