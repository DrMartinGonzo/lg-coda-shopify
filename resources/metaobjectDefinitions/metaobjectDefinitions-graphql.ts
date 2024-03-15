// #region Fragments
const MetaobjectFieldDefinitionFragment = /* GraphQL */ `
  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {
    key
    description
    name
    required
    type {
      category
      name
      supportedValidations {
        name
        type
      }
      supportsDefinitionMigrations
    }
    validations {
      name
      type
      value
    }
  }
`;

export const MetaobjectDefinitionFragment = /* GraphQL */ `
  ${MetaobjectFieldDefinitionFragment}

  fragment MetaobjectDefinition on MetaobjectDefinition {
    id
    name
    displayNameKey
    type
    capabilities @include(if: $includeCapabilities) {
      publishable {
        enabled
      }
    }
    fieldDefinitions @include(if: $includeFieldDefinitions) {
      ...MetaobjectFieldDefinition
    }
  }
`;
// #endregion

// #region Queries
export const querySingleMetaObjectDefinition = /* GraphQL */ `
  ${MetaobjectDefinitionFragment}

  query GetSingleMetaObjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {
    metaobjectDefinition(id: $id) {
      ...MetaobjectDefinition
    }
  }
`;

export const querySingleMetaobjectDefinitionByType = /* GraphQL */ `
  ${MetaobjectDefinitionFragment}

  query GetSingleMetaObjectDefinitionByType(
    $type: String!
    $includeCapabilities: Boolean!
    $includeFieldDefinitions: Boolean!
  ) {
    metaobjectDefinitionByType(type: $type) {
      ...MetaobjectDefinition
    }
  }
`;

export const queryAllMetaobjectDefinitions = /* GraphQL */ `
  ${MetaobjectDefinitionFragment}

  query GetMetaobjectDefinitions(
    $maxEntriesPerRun: Int!
    $cursor: String
    $includeCapabilities: Boolean!
    $includeFieldDefinitions: Boolean!
  ) {
    metaobjectDefinitions(first: $maxEntriesPerRun, after: $cursor) {
      nodes {
        ...MetaobjectDefinition
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
// #endregion
