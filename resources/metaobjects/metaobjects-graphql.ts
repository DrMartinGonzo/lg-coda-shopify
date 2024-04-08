import { graphql } from '../../utils/graphql';

// #region Fragments
export const metaobjectFieldDefinitionFragment = graphql(`
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

export const metaobjectDefinitionFragment = graphql(
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
  [metaobjectFieldDefinitionFragment]
);

export const metaobjectFragment = graphql(
  `
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
      fields {
        key
        type
        value
      }
    }
  `,
  [metaobjectDefinitionFragment]
);
// #endregion

// #region Queries
export const getMetaobjectDefinitionsQuery = graphql(
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
  [metaobjectDefinitionFragment]
);

export const getSingleMetaObjectDefinitionQuery = graphql(
  `
    query GetSingleMetaObjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {
      metaobjectDefinition(id: $id) {
        ...MetaobjectDefinition
      }
    }
  `,
  [metaobjectDefinitionFragment]
);

export const getSingleMetaobjectDefinitionByTypeQuery = graphql(
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
  [metaobjectDefinitionFragment]
);

export const getMetaObjectsWithFieldsQuery = graphql(
  `
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
  `,
  [metaobjectFragment]
);

export const getSingleMetaObjectWithFieldsQuery = graphql(
  `
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
  `,
  [metaobjectFragment]
);
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

export const updateMetaObjectMutation = graphql(
  `
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
  `,
  [metaobjectFragment]
);

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
