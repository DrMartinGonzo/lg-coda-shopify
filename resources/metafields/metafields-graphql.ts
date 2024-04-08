import { print as printGql } from '@0no-co/graphql.web';
import { ResultOf, graphql } from '../../utils/graphql';
import { capitalizeFirstChar } from '../../utils/helpers';

// #region Fragments
export const metafieldFieldsFragment = graphql(`
  fragment MetafieldFields on Metafield {
    __typename
    id
    namespace
    key
    type
    value
    ownerType
    createdAt
    updatedAt
  }
`);

export const metafieldFieldsFragmentWithDefinition = graphql(
  `
    fragment MetafieldWithDefinitionFields on Metafield {
      __typename
      id
      namespace
      key
      type
      value
      ownerType
      createdAt
      updatedAt
      definition {
        id
      }
    }
  `
);
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

/**
 * Get Metafields from multiple nodes by their keys.
 * There is a maximum of 250 ids and 250 metafields keys per request.
 */
export const getNodesMetafieldsByKeyQuery = graphql(
  `
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
  `,
  [metafieldFieldsFragment]
);

/**
 * Get Metafields from a single node by their keys.
 * There is a maximum of 250 metafields keys per request.
 */
export const getSingleNodeMetafieldsByKeyQuery = graphql(
  `
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
              ...MetafieldWithDefinitionFields
            }
          }
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);
export type SingleNodeMetafieldsByKeyResult = ResultOf<typeof getSingleNodeMetafieldsByKeyQuery>;

/**
 * Edge case: Same as querySingleNodeMetafieldsByKey but for Shop, which don't require a Gid.
 * There is a maximum of 250 metafields keys per request.
 */
export const getShopMetafieldsByKeysQuery = graphql(
  `
    query GetShopMetafieldsByKey($metafieldKeys: [String!], $countMetafields: Int!) {
      shop {
        id
        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldWithDefinitionFields
          }
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);
export type ShopMetafieldsByKeysResult = ResultOf<typeof getShopMetafieldsByKeysQuery>;

/**
 * Create a GraphQl query to get metafields by their keys from resources (except Shop)
 */
export const buildQueryResourceMetafieldsByKeys = (graphQlQueryOperation: string, requestAllMetafields = false) => {
  const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;
  /* Ca nous sert à récupérer l'ID de la ressource parente
  (exemple: le produit parent d'une variante) pour pouvoir générer l'admin url */
  let parentOwnerQuery = '';
  if (graphQlQueryOperation === 'productVariants') {
    parentOwnerQuery = 'parentOwner : product { id }';
  }

  return `
    ${printGql(metafieldFieldsFragmentWithDefinition)}

    query ${queryName}($metafieldKeys: [String!], $countMetafields: Int!, $maxEntriesPerRun: Int!, $cursor: String) {
      ${graphQlQueryOperation}(first: $maxEntriesPerRun, after: $cursor) {
        nodes {
          id
          ${parentOwnerQuery}
          metafields(keys: $metafieldKeys, first: $countMetafields) {
            nodes {
              ...MetafieldWithDefinitionFields
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
export const setMetafieldsMutation = graphql(
  `
    mutation SetMetafields($inputs: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $inputs) {
        metafields {
          ...MetafieldWithDefinitionFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);

export const deleteMetafieldMutation = graphql(
  `
    mutation metafieldDelete($input: MetafieldDeleteInput!) {
      metafieldDelete(input: $input) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }
  `
);
// #endregion
