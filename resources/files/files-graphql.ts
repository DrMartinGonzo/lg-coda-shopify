import { graphql } from '../../utils/graphql';

// #region Fragments
export const GenericFileFieldsFragment = graphql(`
  fragment GenericFileFields on GenericFile {
    mimeType @include(if: $includeMimeType)
    originalFileSize @include(if: $includeFileSize)
    url
  }
`);

export const MediaImageFieldsFragment = graphql(`
  fragment MediaImageFields on MediaImage {
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

export const VideoFieldsFragment = graphql(`
  fragment VideoFields on Video {
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

export const FileFieldsFragment = graphql(
  `
    fragment FileFields on File {
      __typename
      id
      updatedAt
      alt @include(if: $includeAlt)
      createdAt @include(if: $includeCreatedAt)
      updatedAt @include(if: $includeUpdatedAt)
      thumbnail: preview @include(if: $includeThumbnail) {
        image {
          url
        }
      }
      ...GenericFileFields
      ...MediaImageFields
      ...VideoFields
    }
  `,
  [GenericFileFieldsFragment, MediaImageFieldsFragment, VideoFieldsFragment]
);
// #endregion

// #region Queries
export const queryAllFiles = graphql(
  `
    query GetFiles(
      $maxEntriesPerRun: Int!
      $cursor: String
      $searchQuery: String
      $includeAlt: Boolean!
      $includeCreatedAt: Boolean!
      $includeDuration: Boolean!
      $includeFileSize: Boolean!
      $includeHeight: Boolean!
      $includeMimeType: Boolean!
      $includeThumbnail: Boolean!
      $includeUpdatedAt: Boolean!
      $includeUrl: Boolean!
      $includeWidth: Boolean!
    ) {
      files(first: $maxEntriesPerRun, after: $cursor, reverse: true, sortKey: CREATED_AT, query: $searchQuery) {
        nodes {
          ...FileFields
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  [FileFieldsFragment]
);

export const querySingleFile = graphql(
  `
    query GetSingleFile(
      $id: ID!
      $includeAlt: Boolean!
      $includeCreatedAt: Boolean!
      $includeDuration: Boolean!
      $includeFileSize: Boolean!
      $includeHeight: Boolean!
      $includeMimeType: Boolean!
      $includeThumbnail: Boolean!
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
  [FileFieldsFragment]
);
// #endregion

// #region Mutations
export const UpdateFile = graphql(
  `
    mutation fileUpdate(
      $files: [FileUpdateInput!]!
      $includeAlt: Boolean!
      $includeCreatedAt: Boolean!
      $includeDuration: Boolean!
      $includeFileSize: Boolean!
      $includeHeight: Boolean!
      $includeMimeType: Boolean!
      $includeThumbnail: Boolean!
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
  [FileFieldsFragment]
);

export const deleteFiles = graphql(
  `
    mutation fileDelete($fileIds: [ID!]!) {
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
