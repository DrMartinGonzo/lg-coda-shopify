import { normalizeSchemaKey } from '@codahq/packs-sdk/schema';

import { splitMetaFieldFullKey } from './metafields-functions';

// #region Fragments
export const MetafieldFieldsFragment = /* GraphQL */ `
  fragment MetafieldFields on Metafield {
    id
    value
    type
    key
    namespace
    __typename
  }
`;
// #endregion

// #region Queries
export const queryMetafieldDefinitions = /* GraphQL */ `
  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxMetafieldsPerResource: Int!) {
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
  }
`;

export const makeQueryMetafieldsAdmin = (graphQlResourceQuery: string, optionalFieldsKeys: string[]) => {
  return `
    query GetResourceMetafields($batchSize: Int!, $cursor: String){
      ${graphQlResourceQuery}(first: $batchSize, after: $cursor) {
        nodes {
          id
          ${optionalFieldsKeys.map((key) => {
            const { metaKey, metaNamespace } = splitMetaFieldFullKey(key);
            return `${normalizeSchemaKey(key)}: metafield(key: "${metaKey}", namespace: "${metaNamespace}") {
              ...metafieldFields
            }`;
          })}
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }

    ${MetafieldFieldsFragment}
  `;
};
// #endregion

// #region Mutations
export const MutationSetMetafields = /* GraphQL */ `
  mutation SetMetafields($metafieldsSetInputs: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafieldsSetInputs) {
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
  }
`;

export const MutationDeleteMetafield = /* GraphQL */ `
  mutation metafieldDelete($input: MetafieldDeleteInput!) {
    metafieldDelete(input: $input) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;
// #endregion

// export const makeQueryShopMetafields = (optionalFieldsKeys) => {
//   console.log('optionalFieldsKeys', optionalFieldsKeys);
//   return `
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
