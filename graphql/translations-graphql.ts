// #region Imports
import { graphql } from '../utils/tada-utils';
import { metafieldFieldsFragment } from './metafields-graphql';
import { pageInfoFragment } from './sharedFragments-graphql';

// #endregion

// #region Queries
export const getTranslationsQuery = graphql(
  `
    query GetTranslations($limit: Int!, $cursor: String, $locale: String!, $resourceType: TranslatableResourceType!) {
      translatableResources(first: $limit, after: $cursor, resourceType: $resourceType) {
        nodes {
          resourceId
          translatableContent {
            locale
            key
            type
            value
            digest
          }
          translations(locale: $locale) {
            value
            key
            outdated
            updatedAt
          }
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [pageInfoFragment]
);

export const getSingleTranslationQuery = graphql(
  `
    query GetSingleTranslation($id: ID!, $locale: String!) {
      translatableResource(resourceId: $id) {
        resourceId
        translatableContent {
          locale
          key
          type
          value
          digest
        }
        translations(locale: $locale) {
          value
          key
          outdated
          updatedAt
        }
      }
    }
  `
);

export const getTranslatableResources = graphql(
  `
    query GetTranslatableResources($limit: Int!, $cursor: String, $resourceType: TranslatableResourceType!) {
      translatableResources(first: $limit, after: $cursor, resourceType: $resourceType) {
        nodes {
          resourceId
          translatableContent {
            locale
            key
            type
            value
            digest
          }
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [pageInfoFragment]
);
// #endregion

// #region Mutations
export const registerTranslationMutation = graphql(`
  mutation RegisterTranslations($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      userErrors {
        message
        field
      }
      translations {
        locale
        key
        value
        outdated
        updatedAt
      }
    }
  }
`);

export const removeTranslationsMutation = graphql(`
  mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!) {
    translationsRemove(resourceId: $resourceId, translationKeys: $translationKeys, locales: $locales) {
      userErrors {
        message
        field
      }
      translations {
        key
        value
      }
    }
  }
`);

/*
mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!) {
  translationsRemove(resourceId: $resourceId, translationKeys: $translationKeys, locales: $locales) {
    userErrors {
      message
      field
    }
    translations {
      key
      value
    }
  }
}
*/
// #endregion
