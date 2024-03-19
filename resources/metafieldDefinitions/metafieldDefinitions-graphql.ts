import { graphql } from '../../utils/graphql';

// #region Fragments
export const MetafieldDefinitionFragment = graphql(`
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
export const queryMetafieldDefinitions = graphql(
  `
    query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxEntriesPerRun: Int!, $cursor: String) {
      metafieldDefinitions(ownerType: $ownerType, first: $maxEntriesPerRun, after: $cursor) {
        nodes {
          ...MetafieldDefinition
        }
      }
    }
  `,
  [MetafieldDefinitionFragment]
);

export const QuerySingleMetafieldDefinition = graphql(
  `
    query GetSingleMetafieldDefinition($id: ID!) {
      metafieldDefinition(id: $id) {
        ...MetafieldDefinition
      }
    }
  `,
  [MetafieldDefinitionFragment]
);
// #endregion

// #region Mutations

// #endregion
