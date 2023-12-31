export const queryMetaobjectDynamicUrls = `#graphql
  query queryMetaobjectDynamicUrls($cursor: String) {
    shop {
      myshopifyDomain
    }

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

export function buildQueryAllMetaObjectsWithFields(fieldsKey: string[]) {
  return `#graphql
    query ($type: String!, $maxEntriesPerRun: Int!, $cursor: String) {
      metaobjects(type: $type, first: $maxEntriesPerRun, after: $cursor, reverse:true) {
        nodes {
          id
          ...optionalFieldsFragment
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }

    fragment optionalFieldsFragment on Metaobject {
      ${fieldsKey
        .map((key) => {
          // handle is a special case
          if (key === 'handle') return key;
          return `${key}: field(key: "${key}") { value }`;
        })
        .join('\n')}
    }`;
}

export const querySyncTableDetails = `#graphql
  query metaobjectDefinitionAndShopifyDomain($id: ID!) {
    shop {
      myshopifyDomain
    }
    metaobjectDefinition(id: $id) {
      type
    }
  }
`;

export const queryMetaobjectDefinitionByType = `#graphql
  query metaobjectDefinitionByType($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      displayNameKey
      fieldDefinitions {
        description
        key
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
    }
  }
`;
export const queryAllMetaobjectDefinitions = `#graphql
  query queryAllMetaobjectDefinitions($batchSize: Int!, $cursor: String) {
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
  }`;

export const createMetaobjectMutation = `#graphql
  mutation createMetaobject($metaobject: MetaobjectCreateInput!) {
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

export const updateMetaobjectMutation = `#graphql
  mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
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

export const deleteMetaobjectMutation = `#graphql
  mutation metaobjectDelete($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;
