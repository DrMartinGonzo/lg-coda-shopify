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

export const MetafieldDefinitionFragment = /* GraphQL */ `
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
 * Query all or some metafields from a specific ressource
 */
export const makeQueryMetafieldsByKeys = (graphQlQueryOperation: string) => {
  const queryName = `Get${capitalizeFirstChar(graphQlQueryOperation)}Metafields`;
  let declaredArgs = ['$metafieldKeys: [String!]', '$countMetafields: Int!'];
  let operationMaybeWithArgs: string;

  if (graphQlQueryOperation === 'shop') {
    operationMaybeWithArgs = graphQlQueryOperation;
  } else {
    declaredArgs.push('$ownerGid: ID!');
    operationMaybeWithArgs = `${graphQlQueryOperation}(id: $ownerGid)`;
  }

  return `
    ${MetafieldFieldsFragment}

    query ${queryName}(${declaredArgs.join(', ')}) {
      ${operationMaybeWithArgs} {
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
// #endregion

// #region Mutations
export const MutationSetMetafields = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  mutation SetMetafields($metafieldsSetInputs: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafieldsSetInputs) {
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
