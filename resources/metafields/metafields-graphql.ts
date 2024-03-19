import { print as printGql } from '@0no-co/graphql.web';
import { ResultOf, graphql } from '../../types/graphql';
import { capitalizeFirstChar } from '../../utils/helpers';

// #region Fragments
export const MetafieldFieldsFragment = graphql(`
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

export const MetafieldFieldsFragmentWithDefinition = graphql(
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
export const queryNodesMetafieldsByKey = graphql(
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
  [MetafieldFieldsFragment]
);

/**
 * Get Metafields from a single node by their keys.
 * There is a maximum of 250 metafields keys per request.
 */
export const querySingleNodeMetafieldsByKey = graphql(
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
  [MetafieldFieldsFragmentWithDefinition]
);
export type SingleNodeMetafieldsByKeyResult = ResultOf<typeof querySingleNodeMetafieldsByKey>;

/**
 * Edge case: Same as querySingleNodeMetafieldsByKey but for Shop, which don't require a Gid.
 * There is a maximum of 250 metafields keys per request.
 */
export const queryShopMetafieldsByKeys = graphql(
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
  [MetafieldFieldsFragmentWithDefinition]
);
export type ShopMetafieldsByKeysResult = ResultOf<typeof queryShopMetafieldsByKeys>;

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
    ${printGql(MetafieldFieldsFragmentWithDefinition)}

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
export const MutationSetMetafields = graphql(
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
  [MetafieldFieldsFragmentWithDefinition]
);

export const MutationDeleteMetafield = graphql(
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
