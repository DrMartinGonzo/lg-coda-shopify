import * as coda from '@codahq/packs-sdk';

import { graphQlRequest, handleGraphQlError, handleGraphQlUserError, maybeDelayNextExecution } from '../helpers';
import { buildQueryAllFiles, deleteFiles } from './files-graphql';

export const syncAllFiles = async ([maxEntriesPerRun = 180, type], context: coda.SyncExecutionContext) => {
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);

  const payload = {
    query: buildQueryAllFiles(effectivePropertyKeys, type),
    variables: {
      maxEntriesPerRun,
      cursor: context.sync.continuation,
    },
  };

  const response = await graphQlRequest(context, payload, undefined, '2023-07');

  const { body } = response;
  const { errors, extensions } = body;

  handleGraphQlError(errors);
  // TODO: need to be more robust
  maybeDelayNextExecution(extensions.cost, errors);

  const { pageInfo, nodes } = body.data.files;

  const files = nodes.map((node) => {
    const file = {
      ...node,
      type: node.__typename,
      thumbnail: node.thumbnail?.image?.url
        ? coda.withQueryParams(node.thumbnail.image.url, {
            width: 64,
            height: 64,
            crop: 'center',
          })
        : undefined,
    };

    switch (node.__typename) {
      case 'GenericFile':
        file.name = node.url.split('/').pop().split('?').shift();
        break;
      case 'MediaImage':
        file.name = node.image.url.split('/').pop().split('?').shift();
        file.fileSize = node.originalSource?.fileSize;
        file.url = node.image?.url;
        file.width = node.image?.width;
        file.height = node.image?.height;
        break;
      case 'Video':
        file.name = node.filename;
        file.duration = node.duration;
        file.fileSize = node.originalSource?.fileSize;
        file.mimeType = node.originalSource?.mimeType;
        file.url = node.originalSource?.url;
        file.width = node.originalSource?.width;
        file.height = node.originalSource?.height;
        break;

      default:
        break;
    }
    return file;
  });

  return {
    result: files,
    continuation: pageInfo.hasNextPage ? pageInfo.endCursor : null,
  };
};

/**
 * Deletes an image with the given fileId.
 * @param fileId - The ID of the file to be deleted.
 * @param context - The context object containing necessary information.
 */
export const deleteFile = async ([fileId], context: coda.SyncExecutionContext) => {
  const variables = {
    fileIds: [fileId],
  };

  const payload = {
    query: deleteFiles,
    variables,
  };

  const response = await graphQlRequest(context, payload, undefined, '2023-07');
  const { body } = response;

  handleGraphQlError(body.errors);
  handleGraphQlUserError(body.data.fileDelete.userErrors);

  return body.data.fileDelete.deletedFileIds[0];
};
