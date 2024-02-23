// #region Fragments
const FileFieldsFragment = /* GraphQL */ `
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

    ... on GenericFile {
      mimeType @include(if: $includeMimeType)
      originalFileSize @include(if: $includeFileSize)
      url
    }

    ... on MediaImage {
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

    ... on Video {
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
  }
`;
// #endregion

// #region Queries
export const queryAllFiles = /* GraphQL */ `
  ${FileFieldsFragment}

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
`;

export const querySingleFile = /* GraphQL */ `
  ${FileFieldsFragment}

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
      id
      ...FileFields
    }
  }
`;
// #endregion

// #region Mutations
export const UpdateFile = /* GraphQL */ `
  ${FileFieldsFragment}

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
`;

export const deleteFiles = /* GraphQL */ `
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
`;

// #endregion
