import { METAOBJECT_CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import { MetaobjectDefinitionFragment } from '../metaobjectDefinitions/metaobjectDefinitions-graphql';

// #region Fragments
function buildMetaobjectFragment(fieldsKey: string[]) {
  return `
    ${MetaobjectDefinitionFragment}

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
          return `${METAOBJECT_CUSTOM_FIELD_PREFIX_KEY}${key}: field(key: "${key}") {
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
