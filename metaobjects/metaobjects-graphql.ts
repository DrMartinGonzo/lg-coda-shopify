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

const MetaobjectDefinitionFragment = /* GraphQL */ `
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

// TODO: https://stackoverflow.com/a/65271603 to avoid the error ?
function buildOptionalFieldsFragment(fieldsKey: string[]) {
  // no GraphQL tag as it confuses graphql codegen */
  return `
    fragment OptionalFieldsFragment on Metaobject {
      ${fieldsKey
        .map((key) => {
          // handle is a special case
          if (key === 'handle') return key;
          return `${key}: field(key: "${key}") { value }`;
        })
        .join('\n')}
    }
  `;
}

// #endregion

// #region Queries
export function buildQueryAllMetaObjectsWithFields(fieldsKey: string[]) {
  // no GraphQL tag as it confuses graphql codegen */
  return `
    ${buildOptionalFieldsFragment(fieldsKey)}

    query GetMetaobjects($type: String!, $maxEntriesPerRun: Int!, $cursor: String) {
      metaobjects(type: $type, first: $maxEntriesPerRun, after: $cursor, reverse: true) {
        nodes {
          id
          # TODO: only add if requested as it increases query cost
          capabilities {
            publishable {
              status
            }
          }
          ...OptionalFieldsFragment
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
}

export const queryMetaObjectDefinitionFieldDefinitions = /* GraphQL */ `
  ${MetaobjectFieldDefinitionFragment}

  query GetMetaObjectFieldDefinitionsFromMetaobjectDefinition($id: ID!) {
    metaobjectDefinition(id: $id) {
      fieldDefinitions {
        ...MetaobjectFieldDefinition
      }
    }
  }
`;

export const queryMetaObjectFieldDefinitions = /* GraphQL */ `
  ${MetaobjectFieldDefinitionFragment}

  query GetMetaObjectFieldDefinitions($id: ID!) {
    metaobject(id: $id) {
      definition {
        fieldDefinitions {
          ...MetaobjectFieldDefinition
        }
      }
    }
  }
`;

export const queryMetaobjectDefinitionByType = /* GraphQL */ `
  ${MetaobjectDefinitionFragment}

  query GetMetaobjectDefinitionByType(
    $type: String!
    $includeCapabilities: Boolean!
    $includeFieldDefinitions: Boolean!
  ) {
    metaobjectDefinitionByType(type: $type) {
      ...MetaobjectDefinition
    }
  }
`;

export const queryMetaobjectDefinition = /* GraphQL */ `
  ${MetaobjectDefinitionFragment}

  query GetMetaobjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {
    metaobjectDefinition(id: $id) {
      ...MetaobjectDefinition
    }
  }
`;

export const queryAllMetaobjectDefinitions = /* GraphQL */ `
  ${MetaobjectDefinitionFragment}

  query GetMetaobjectDefinitions(
    $batchSize: Int!
    $cursor: String
    $includeCapabilities: Boolean!
    $includeFieldDefinitions: Boolean!
  ) {
    metaobjectDefinitions(first: $batchSize, after: $cursor) {
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

// #region Mutations
export const createMetaobjectMutation = /* GraphQL */ `
  mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
      }

      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const updateMetaobjectMutation = /* GraphQL */ `
  mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
      }

      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const deleteMetaobjectMutation = /* GraphQL */ `
  mutation DeleteMetaobject($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId

      userErrors {
        field
        message
        code
      }
    }
  }
`;
// #endregion
