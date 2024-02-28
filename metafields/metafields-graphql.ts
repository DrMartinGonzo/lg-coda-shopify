import { capitalizeFirstChar } from '../helpers';

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
export const makeQuerySingleResourceMetafieldsByKeys = (graphQlQueryOperation: string) => {
  const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;
  /* Ca nous sert à récupérer l'ID de la ressource parente
  (exemple: le produit parent d'une variante) pour pouvoir générer l'admin url */
  let parentOwnerQuery = '';
  if (graphQlQueryOperation === 'productVariant') {
    parentOwnerQuery = 'parentOwner : product { id }';
  }

  return `
    ${MetafieldFieldsFragment}

    query ${queryName}($ownerGid: ID!, $metafieldKeys: [String!], $countMetafields: Int!) {
      ${graphQlQueryOperation}(id: $ownerGid) {
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
    }
  `;
};

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

  const queryArgs = ['$countMetafields: Int!', '$maxEntriesPerRun: Int!', '$cursor: String'];
  if (!requestAllMetafields) {
    queryArgs.push('$metafieldKeys: [String!]');
  }
  const metafieldArgs = ['first: $countMetafields'];
  if (!requestAllMetafields) {
    metafieldArgs.push('keys: $metafieldKeys');
  }

  return `
    ${MetafieldFieldsFragment}

    query ${queryName}(${queryArgs.join(', ')}) {
      ${graphQlQueryOperation}(first: $maxEntriesPerRun, after: $cursor) {
        nodes {
          id
          ${parentOwnerQuery}
          metafields(${metafieldArgs.join(', ')}) {
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

// Edge case for Shop
export const QueryShopMetafieldsByKeys = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  query GetShopMetafields($metafieldKeys: [String!], $countMetafields: Int!) {
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
