// #region Imports
import { graphql } from './utils/graphql-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #endregion

// #region Fragments
export const shopLocaleFieldsFragment = graphql(`
  fragment ShopLocaleFields on ShopLocale @_unmask {
    locale
    primary
    published
  }
`);

export const translatableContentFieldsFragment = graphql(`
  fragment TranslatableContentFields on TranslatableContent @_unmask {
    locale
    key
    type
    value
    digest
  }
`);

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
export const getAvailableLocalesQuery = graphql(
  `
    query GetAvailableLocales {
      shopLocales {
        ...ShopLocaleFields
      }
    }
  `,
  [shopLocaleFieldsFragment]
);

export const getTranslatableContentKeys = graphql(
  `
    query GetTranslatableContentKeys($resourceType: TranslatableResourceType!) {
      translatableResources(first: 1, resourceType: $resourceType) {
        nodes {
          resourceId
          translatableContent {
            ...TranslatableContentFields
          }
        }
      }
    }
  `,
  [translatableContentFieldsFragment]
);

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
            ...TranslatableContentFields
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
  [pageInfoFragment, translatableContentFieldsFragment, translationFieldsFragment]
);

export const getSingleTranslationQuery = graphql(
  `
    query GetSingleTranslation($id: ID!, $locale: String!, $marketId: ID, $includeMarket: Boolean!) {
      translatableResource(resourceId: $id) {
        resourceId
        translatableContent {
          ...TranslatableContentFields
        }
        translations(locale: $locale, marketId: $marketId) {
          ...TranslationFields
        }
      }
    }
  `,
  [translatableContentFieldsFragment, translationFieldsFragment]
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
