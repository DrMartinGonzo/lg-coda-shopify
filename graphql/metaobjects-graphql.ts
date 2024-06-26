import { graphql } from './utils/graphql-utils';
import { metaobjectDefinitionFragment } from './metaobjectDefinition-graphql';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Fragments
export const metaobjectFragment = graphql(
  `
    fragment MetaobjectFragment on Metaobject @_unmask {
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
export const getMetaObjectsWithFieldsQuery = graphql(
  `
    query GetMetaobjects(
      $type: String!
      $limit: Int!
      $cursor: String
      $includeDefinition: Boolean!
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobjects(type: $type, first: $limit, after: $cursor, reverse: true) {
        nodes {
          ...MetaobjectFragment
        }

        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [metaobjectFragment, pageInfoFragment]
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
