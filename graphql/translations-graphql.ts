// #region Imports
import { graphql } from './utils/graphql-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #endregion

// #region Fragments
export const translationFieldsFragment = graphql(`
  fragment TranslationFields on Translation @_unmask {
    value
    key
    outdated
    updatedAt
    market @include(if: $includeMarket) {
      id
    }
  }
`);
// #endregion

// #region Queries
export const getTranslationsQuery = graphql(
  `
    query GetTranslations(
      $limit: Int!
      $cursor: String
      $locale: String!
      $marketId: ID
      $resourceType: TranslatableResourceType!
      $includeMarket: Boolean!
    ) {
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
          translations(locale: $locale, marketId: $marketId) {
            ...TranslationFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [pageInfoFragment, translationFieldsFragment]
);

export const LocaleFieldsFragment = graphql(`
  fragment LocaleFields on Locale @_unmask {
    isoCode
    name
  }
`);
export const getAvailableLocalesQuery = graphql(
  `
    query GetAvailableLocales {
      availableLocales {
        ...LocaleFields
      }
    }
  `,
  [LocaleFieldsFragment]
);

export const getSingleTranslationQuery = graphql(
  `
    query GetSingleTranslation($id: ID!, $locale: String!, $marketId: ID, $includeMarket: Boolean!) {
      translatableResource(resourceId: $id) {
        resourceId
        translatableContent {
          locale
          key
          type
          value
          digest
        }
        translations(locale: $locale, marketId: $marketId) {
          ...TranslationFields
        }
      }
    }
  `,
  [translationFieldsFragment]
);

export const getTranslatableResourcesQuery = graphql(
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
export const registerTranslationMutation = graphql(
  `
    mutation RegisterTranslations($resourceId: ID!, $translations: [TranslationInput!]!, $includeMarket: Boolean!) {
      translationsRegister(resourceId: $resourceId, translations: $translations) {
        userErrors {
          message
          field
        }
        translations {
          locale
          ...TranslationFields
        }
      }
    }
  `,
  [translationFieldsFragment]
);

export const removeTranslationsMutation = graphql(`
  mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!, $marketIds: [ID!]) {
    translationsRemove(
      resourceId: $resourceId
      translationKeys: $translationKeys
      locales: $locales
      marketIds: $marketIds
    ) {
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
