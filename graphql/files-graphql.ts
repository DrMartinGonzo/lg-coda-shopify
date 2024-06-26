import { graphql } from './utils/graphql-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Fragments
export const genericFileFieldsFragment = graphql(`
  fragment GenericFileFields on GenericFile {
    mimeType @include(if: $includeMimeType)
    originalFileSize @include(if: $includeFileSize)
    url
  }
`);

export const mediaImageFieldsFragment = graphql(`
  fragment MediaImageFields on MediaImage @_unmask {
    image {
      url
      width @include(if: $includeWidth)
      height @include(if: $includeHeight)
    }
    mimeType @include(if: $includeMimeType)
    originalSource @include(if: $includeFileSize) {
      fileSize
    }
  }
`);

export const videoFieldsFragment = graphql(`
  fragment VideoFields on Video @_unmask {
    filename
    duration @include(if: $includeDuration)
    originalSource {
      fileSize @include(if: $includeFileSize)
      height @include(if: $includeHeight)
      width @include(if: $includeWidth)
      mimeType @include(if: $includeMimeType)
      url @include(if: $includeUrl)
    }
  }
`);

export const fileFieldsFragment = graphql(
  `
    fragment FileFields on File @_unmask {
      __typename
      id
      updatedAt
      alt @include(if: $includeAlt)
      createdAt @include(if: $includeCreatedAt)
      updatedAt @include(if: $includeUpdatedAt)
      preview @include(if: $includePreview) {
        image {
          url
        }
      }
      ...GenericFileFields
      ...MediaImageFields
      ...VideoFields
    }
  `,
  [genericFileFieldsFragment, mediaImageFieldsFragment, videoFieldsFragment]
);
// #endregion

// #region Queries
export const getFilesQuery = graphql(
  `
    query GetFiles(
      $limit: Int!
      $cursor: String
      $searchQuery: String
      $includeAlt: Boolean!
      $includeCreatedAt: Boolean!
      $includeDuration: Boolean!
      $includeFileSize: Boolean!
      $includeHeight: Boolean!
      $includeMimeType: Boolean!
      $includePreview: Boolean!
      $includeUpdatedAt: Boolean!
      $includeUrl: Boolean!
      $includeWidth: Boolean!
    ) {
      files(first: $limit, after: $cursor, reverse: true, sortKey: CREATED_AT, query: $searchQuery) {
        nodes {
          ...FileFields
        }

        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [fileFieldsFragment, pageInfoFragment]
);

export const getSingleFileQuery = graphql(
  `
    query GetSingleFile(
      $id: ID!
      $includeAlt: Boolean!
      $includeCreatedAt: Boolean!
      $includeDuration: Boolean!
      $includeFileSize: Boolean!
      $includeHeight: Boolean!
      $includeMimeType: Boolean!
      $includePreview: Boolean!
      $includeUpdatedAt: Boolean!
      $includeUrl: Boolean!
      $includeWidth: Boolean!
    ) {
      node(id: $id) {
        __typename
        #id
        # ... on File {
        ...FileFields
        # }
        # ...FileFields
      }
    }
  `,
  [fileFieldsFragment]
);
// #endregion

// #region Mutations
export const updateFilesMutation = graphql(
  `
    mutation UpdateFiles(
      $files: [FileUpdateInput!]!
      $includeAlt: Boolean!
      $includeCreatedAt: Boolean!
      $includeDuration: Boolean!
      $includeFileSize: Boolean!
      $includeHeight: Boolean!
      $includeMimeType: Boolean!
      $includePreview: Boolean!
      $includeUpdatedAt: Boolean!
      $includeUrl: Boolean!
      $includeWidth: Boolean!
    ) {
      fileUpdate(files: $files) {
        files {
          ...FileFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [fileFieldsFragment]
);

export const deleteFilesMutation = graphql(
  `
    mutation DeleteFiles($fileIds: [ID!]!) {
      fileDelete(fileIds: $fileIds) {
        deletedFileIds

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
