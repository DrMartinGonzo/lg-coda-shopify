import { graphql } from '../utils/tada-utils';

// #region Fragments
export const metafieldDefinitionFragment = graphql(`
  fragment MetafieldDefinition on MetafieldDefinition {
    key
    id
    namespace
    name
    description
    metafieldsCount
    ownerType
    pinnedPosition
    type {
      name
    }
    validations {
      name
      type
      value
    }
    validationStatus
    visibleToStorefrontApi
  }
`);
// #endregion

// #region Queries
export const getMetafieldDefinitionsQuery = graphql(
  `
    query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $limit: Int!, $cursor: String) {
      metafieldDefinitions(ownerType: $ownerType, first: $limit, after: $cursor) {
        nodes {
          ...MetafieldDefinition
        }
      }
    }
  `,
  [metafieldDefinitionFragment]
);

export const getSingleMetafieldDefinitionQuery = graphql(
  `
    query GetSingleMetafieldDefinition($id: ID!) {
      metafieldDefinition(id: $id) {
        ...MetafieldDefinition
      }
    }
  `,
  [metafieldDefinitionFragment]
);
// #endregion

// #region Mutations

// #endregion
