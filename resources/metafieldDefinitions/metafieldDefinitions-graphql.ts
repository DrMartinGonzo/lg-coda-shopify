// #region Fragments
export const MetafieldDefinitionFragment = /* GraphQL */ `
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
`;
// #endregion

// #region Queries
export const queryMetafieldDefinitions = /* GraphQL */ `
  ${MetafieldDefinitionFragment}

  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxEntriesPerRun: Int!, $cursor: String) {
    metafieldDefinitions(ownerType: $ownerType, first: $maxEntriesPerRun, after: $cursor) {
      nodes {
        ...MetafieldDefinition
      }
    }
  }
`;

export const QuerySingleMetafieldDefinition = /* GraphQL */ `
  ${MetafieldDefinitionFragment}

  query GetSingleMetafieldDefinition($id: ID!) {
    metafieldDefinition(id: $id) {
      ...MetafieldDefinition
    }
  }
`;
// #endregion

// #region Mutations

// #endregion
