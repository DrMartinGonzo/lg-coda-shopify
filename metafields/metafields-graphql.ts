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

const MetafieldDefinitionFragment = /* GraphQL */ `
  fragment MetafieldDefinition on MetafieldDefinition {
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
`;
// #endregion

// #region Queries
export const queryMetafieldDefinitions = /* GraphQL */ `
  ${MetafieldDefinitionFragment}

  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxMetafieldsPerResource: Int!) {
    metafieldDefinitions(ownerType: $ownerType, first: $maxMetafieldsPerResource) {
      nodes {
        ...MetafieldDefinition
      }
    }
  }
`;

/**
 * Create a GraphQl query to get all or some metafields from a specific ressource (except Shop)
 */
export const makeQuerySingleResourceMetafieldsByKeys = (graphQlQueryOperation: string) => {
  const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;

  return `
    ${MetafieldFieldsFragment}

    query ${queryName}($ownerGid: ID!, $metafieldKeys: [String!], $countMetafields: Int!) {
      ${graphQlQueryOperation}(id: $ownerGid) {
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
};

/**
 * Create a GraphQl query to get metafields by their keys from resources (except Shop)
 */
export const makeQueryResourceMetafieldsByKeys = (graphQlQueryOperation: string) => {
  const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;

  return `
    ${MetafieldFieldsFragment}

    query ${queryName}($metafieldKeys: [String!], $countMetafields: Int!, $maxEntriesPerRun: Int!, $cursor: String) {
      ${graphQlQueryOperation}(first: $maxEntriesPerRun, after: $cursor) {
        nodes {
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
