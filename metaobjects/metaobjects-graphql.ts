// #region Helpers

// #endregion

// #region Fragments
const MetaobjectFieldDefinitionFieldsFragment = /* GraphQL */ `
  fragment MetaobjectFieldDefinitionFields on MetaobjectFieldDefinition {
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

// TODO: https://stackoverflow.com/a/65271603 to avoid the error ?
function buildOptionalFieldsFragment(fieldsKey: string[]) {
  return /* GraphQL */ `
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
export const queryMetaobjectDynamicUrls = /* GraphQL */ `
  query GetMetaobjectDynamicUrls($cursor: String) {
    metaobjectDefinitions(first: 20, after: $cursor) {
      nodes {
        id
        name
        displayNameKey
        type
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const queryMetaobjectTypes = /* GraphQL */ `
  query queryMetaobjectTypes($cursor: String) {
    metaobjectDefinitions(first: 20, after: $cursor) {
      nodes {
        name
        type
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export function buildQueryAllMetaObjectsWithFields(fieldsKey: string[]) {
  return /* GraphQL */ `
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

export const querySyncTableDetails = /* GraphQL */ `
  query GetMetaobjectDefinitionType($id: ID!) {
    metaobjectDefinition(id: $id) {
      type
    }
  }
`;

export const queryMetaObjectFieldDefinitionsFromMetaobjectDefinition = /* GraphQL */ `
  ${MetaobjectFieldDefinitionFieldsFragment}

  query GetMetaObjectFieldDefinitionsFromMetaobjectDefinition($id: ID!) {
    metaobjectDefinition(id: $id) {
      fieldDefinitions {
        ...MetaobjectFieldDefinitionFields
      }
    }
  }
`;

export const queryMetaObjectFieldDefinitions = /* GraphQL */ `
  ${MetaobjectFieldDefinitionFieldsFragment}

  query GetMetaObjectFieldDefinitions($id: ID!) {
    metaobject(id: $id) {
      definition {
        fieldDefinitions {
          ...MetaobjectFieldDefinitionFields
        }
      }
    }
  }
`;

export const queryMetaobjectDefinitionsByType = /* GraphQL */ `
  ${MetaobjectFieldDefinitionFieldsFragment}

  query GetMetaobjectDefinitionByType($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      displayNameKey
      capabilities {
        publishable {
          enabled
        }
      }
      fieldDefinitions {
        ...MetaobjectFieldDefinitionFields
      }
    }
  }
`;

export const queryAllMetaobjectDefinitions = /* GraphQL */ `
  query GetMetaobjectDefinitions($batchSize: Int!, $cursor: String) {
    metaobjectDefinitions(first: $batchSize, after: $cursor) {
      nodes {
        id
        name
        displayNameKey
        type
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
