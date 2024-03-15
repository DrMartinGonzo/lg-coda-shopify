import { capitalizeFirstChar } from '../../helpers';

// #region Fragments
export const MetafieldFieldsFragment = /* GraphQL */ `
  fragment MetafieldFields on Metafield {
    id
    namespace
    key
    type
    value
    ownerType
    createdAt
    updatedAt
    __typename
  }
`;
// #endregion

// #region Queries
/**
 * Create a GraphQl query to get all or some metafields from a specific ressource (except Shop)
 */
// export const makeQuerySingleResourceMetafieldsByKeys = (graphQlQueryOperation: string) => {
//   const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;
//   /* Ca nous sert à récupérer l'ID de la ressource parente
//   (exemple: le produit parent d'une variante) pour pouvoir générer l'admin url */
//   let parentOwnerQuery = '';
//   if (graphQlQueryOperation === 'productVariant') {
//     parentOwnerQuery = 'parentOwner : product { id }';
//   }

//   return `
//     ${MetafieldFieldsFragment}

//     query ${queryName}($ownerGid: ID!, $metafieldKeys: [String!], $countMetafields: Int!) {
//       ${graphQlQueryOperation}(id: $ownerGid) {
//         id
//         ${parentOwnerQuery}
//         metafields(keys: $metafieldKeys, first: $countMetafields) {
//           nodes {
//             ...MetafieldFields
//             definition {
//               id
//             }
//           }
//         }
//       }
//     }
//   `;
// };

// ${parentOwnerQuery}
// TODO: rewrite
export const makeQuerySingleMetafield = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  query GetSingleMetafield($gid: ID!) {
    node(id: $gid) {
      ... on Metafield {
        ...MetafieldFields
        owner {
          __typename
          ... on Node {
            id
          }
          ... on Product {
            id
          }
          ... on Collection {
            id
          }
          ... on Customer {
            id
          }
          ... on DraftOrder {
            id
          }
          ... on Location {
            id
          }
          ... on Order {
            id
          }
          ... on ProductVariant {
            id
            owner: product {
              id
            }
          }
          ... on Shop {
            id
          }
        }
        definition {
          id
        }
      }
    }
  }
`;

/**
 * Get Metafields from multiple nodes by their keys.
 * There is a maximum of 250 ids and 250 metafields keys per request.
 */
export const queryNodesMetafieldsByKey = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  query GetNodesMetafieldsByKey($ids: [ID!]!, $metafieldKeys: [String!], $countMetafields: Int) {
    nodes(ids: $ids) {
      id
      __typename
      ... on HasMetafields {
        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldFields
          }
        }
      }
    }
  }
`;

/**
 * Get Metafields from a single node by their keys.
 * There is a maximum of 250 metafields keys per request.
 */
export const querySingleNodeMetafieldsByKey = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  query GetSingleNodeMetafieldsByKey($ownerGid: ID!, $metafieldKeys: [String!], $countMetafields: Int!) {
    node(id: $ownerGid) {
      id
      __typename
      ... on ProductVariant {
        parentOwner: product {
          id
        }
      }
      ... on HasMetafields {
        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldFields
            definition {
              id
            }
          }
        }
      }
    }
  }
`;

/**
 * Edge case: Same as querySingleNodeMetafieldsByKey but for Shop, which don't require a Gid.
 * There is a maximum of 250 metafields keys per request.
 */
export const queryShopMetafieldsByKeys = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  query GetShopMetafieldsByKey($metafieldKeys: [String!], $countMetafields: Int!) {
    shop {
      id
      metafields(keys: $metafieldKeys, first: $countMetafields) {
        nodes {
          ...MetafieldFields
          definition {
            id
          }
        }
      }
    }
  }
`;

/**
 * Create a GraphQl query to get metafields by their keys from resources (except Shop)
 */
export const makeQueryResourceMetafieldsByKeys = (graphQlQueryOperation: string, requestAllMetafields = false) => {
  const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;
  /* Ca nous sert à récupérer l'ID de la ressource parente
  (exemple: le produit parent d'une variante) pour pouvoir générer l'admin url */
  let parentOwnerQuery = '';
  if (graphQlQueryOperation === 'productVariants') {
    parentOwnerQuery = 'parentOwner : product { id }';
  }

  return `
    ${MetafieldFieldsFragment}

    query ${queryName}($metafieldKeys: [String!], $countMetafields: Int!, $maxEntriesPerRun: Int!, $cursor: String) {
      ${graphQlQueryOperation}(first: $maxEntriesPerRun, after: $cursor) {
        nodes {
          id
          ${parentOwnerQuery}
          metafields(keys: $metafieldKeys, first: $countMetafields) {
            nodes {
              ...MetafieldFields
              definition {
                id
              }
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
};

// #endregion

// #region Mutations
export const MutationSetMetafields = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  mutation SetMetafields($inputs: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $inputs) {
      metafields {
        ...MetafieldFields
        definition {
          id
        }
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
