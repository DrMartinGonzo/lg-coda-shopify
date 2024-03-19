import { print as printGql } from '@0no-co/graphql.web';
import { CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import { graphql } from '../../utils/graphql';

// #region Fragments
export const MetaobjectFieldDefinitionFragment = graphql(`
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
`);

export const MetaobjectDefinitionFragment = graphql(
  `
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
  `,
  [MetaobjectFieldDefinitionFragment]
);

function buildMetaobjectFragment(fieldsKey: string[]) {
  return `
    ${printGql(MetaobjectDefinitionFragment)}

    fragment MetaobjectFragment on Metaobject {
      id
      handle
      type
      updatedAt
      capabilities @include(if: $includeCapabilities) {
        publishable {
          status
        }
      }
      definition @include(if: $includeDefinition) {
        ...MetaobjectDefinition
      }
      ${fieldsKey
        .map((key) => {
          // handle is a special case
          if (key === 'handle') return;
          // include prefix to easiy identify custom fields key later when formatting the returned data
          return `${CUSTOM_FIELD_PREFIX_KEY}${key}: field(key: "${key}") {
            key
            type
            value
          }`;
        })
        .filter(Boolean)
        .join('\n')}
    }
  `;
}
// #endregion

// #region Queries
export const querySingleMetaObjectDefinition = graphql(
  `
    query GetSingleMetaObjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {
      metaobjectDefinition(id: $id) {
        ...MetaobjectDefinition
      }
    }
  `,
  [MetaobjectDefinitionFragment]
);

export const querySingleMetaobjectDefinitionByType = graphql(
  `
    query GetSingleMetaObjectDefinitionByType(
      $type: String!
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobjectDefinitionByType(type: $type) {
        ...MetaobjectDefinition
      }
    }
  `,
  [MetaobjectDefinitionFragment]
);

export const queryAllMetaobjectDefinitions = graphql(
  `
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
  `,
  [MetaobjectDefinitionFragment]
);

export function buildQueryAllMetaObjectsWithFields(fieldsKey: string[]) {
  return `
    ${buildMetaobjectFragment(fieldsKey)}

    query GetMetaobjects(
      $type: String!
      $maxEntriesPerRun: Int!
      $cursor: String
      $includeDefinition: Boolean!
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobjects(type: $type, first: $maxEntriesPerRun, after: $cursor, reverse: true) {
        nodes {
          ...MetaobjectFragment
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
}

export function buildQuerySingleMetaObjectWithFields(fieldsKey: string[]) {
  return `
    ${buildMetaobjectFragment(fieldsKey)}

    query GetSingleMetaobject(
      $id: ID!
      $includeDefinition: Boolean!
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobject(id: $id) {
        ...MetaobjectFragment
      }
    }
  `;
}
// #endregion

// #region Mutations
export const createMetaobjectMutation = graphql(
  `
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
  `
);

export function buildUpdateMetaObjectMutation(fieldsKey: string[]) {
  return `
    ${buildMetaobjectFragment(fieldsKey)}

    mutation UpdateMetaobject(
      $id: ID!
      $metaobject: MetaobjectUpdateInput!
      $includeDefinition: Boolean!
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject {
          ...MetaobjectFragment
        }

        userErrors {
          field
          message
          code
        }
      }
    }
  `;
}

export const deleteMetaobjectMutation = graphql(
  `
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
  `
);
// #endregion
