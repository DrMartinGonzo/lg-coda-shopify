export function buildQueryAllFiles(effectivePropertyKeys: string[], type?: string) {
  let query = 'status:READY';
  if (type && type !== '') {
    query += ` AND media_type:${type}`;
  }

  return `#graphql
    query queryAllFiles($maxEntriesPerRun: Int!, $cursor: String) {
      files(first: $maxEntriesPerRun, after: $cursor, reverse:true, sortKey:CREATED_AT, query: "${query}") {
        nodes {
          __typename
          id
          ${effectivePropertyKeys.includes('alt') ? 'alt' : ''}
          ${effectivePropertyKeys.includes('createdAt') ? 'createdAt' : ''}
          ${effectivePropertyKeys.includes('updatedAt') ? 'updatedAt' : ''}
          ${effectivePropertyKeys.includes('thumbnail') ? `thumbnail: preview { image { url } }` : ''}

          ... on GenericFile {
            ${effectivePropertyKeys.includes('mimeType') ? 'mimeType' : ''}
            ${effectivePropertyKeys.includes('fileSize') ? 'originalFileSize' : ''}
            url
          }

          ... on MediaImage {
            image {
              url
              ${effectivePropertyKeys.includes('width') ? 'width' : ''}
              ${effectivePropertyKeys.includes('height') ? 'height' : ''}
            }
            ${effectivePropertyKeys.includes('mimeType') ? 'mimeType' : ''}
            ${effectivePropertyKeys.includes('fileSize') ? 'originalSource { fileSize }' : ''}
          }

          ... on Video {
            filename
            ${effectivePropertyKeys.includes('duration') ? 'duration' : ''}
            ${effectivePropertyKeys.includes('fileSize') ? 'originalSource { fileSize }' : ''}
            ${effectivePropertyKeys.includes('height') ? 'originalSource { height }' : ''}
            ${effectivePropertyKeys.includes('width') ? 'originalSource { width }' : ''}
            ${effectivePropertyKeys.includes('mimeType') ? 'originalSource { mimeType }' : ''}
            ${effectivePropertyKeys.includes('url') ? 'originalSource { url }' : ''}
          }
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`;
}

export const deleteFiles = `#graphql
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
