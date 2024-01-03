import * as coda from '@codahq/packs-sdk';

import { getThumbnailUrlFromFullUrl } from '../helpers';
import {
  graphQlRequest,
  handleGraphQlError,
  handleGraphQlUserError,
  calcSyncTableMaxEntriesPerRun,
  syncTableGraphQlRequest,
} from '../helpers-graphql';
import { buildQueryAllFiles, deleteFiles } from './files-graphql';
import { SyncTableGraphQlContinuation } from '../types/tableSync';

/**====================================================================================================================
 *    Formatting functions
 *===================================================================================================================== */
function formatFileNode(fileNode: any) {
  const file = {
    ...fileNode,
    type: fileNode.__typename,
    thumbnail: fileNode.thumbnail?.image?.url ? getThumbnailUrlFromFullUrl(fileNode.thumbnail.image.url) : undefined,
  };

  switch (fileNode.__typename) {
    case 'GenericFile':
      file.name = fileNode.url.split('/').pop().split('?').shift();
      break;
    case 'MediaImage':
      file.name = fileNode.image.url.split('/').pop().split('?').shift();
      file.fileSize = fileNode.originalSource?.fileSize;
      file.url = fileNode.image?.url;
      file.width = fileNode.image?.width;
      file.height = fileNode.image?.height;
      break;
    case 'Video':
      file.name = fileNode.filename;
      file.duration = fileNode.duration;
      file.fileSize = fileNode.originalSource?.fileSize;
      file.mimeType = fileNode.originalSource?.mimeType;
      file.url = fileNode.originalSource?.url;
      file.width = fileNode.originalSource?.width;
      file.height = fileNode.originalSource?.height;
      break;

    default:
      break;
  }
  return file;
}

/**====================================================================================================================
 *    Pack functions
 *===================================================================================================================== */
/**
 * Sync files using the GraphQL API.
 */
export const syncFiles = async ([type], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);

  const initialEntriesPerRun = 50;
  let maxEntriesPerRun =
    prevContinuation?.reducedMaxEntriesPerRun ??
    (prevContinuation?.lastThrottleStatus ? calcSyncTableMaxEntriesPerRun(prevContinuation) : initialEntriesPerRun);

  const payload = {
    query: buildQueryAllFiles(effectivePropertyKeys, type),
    variables: {
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
    },
  };

  return syncTableGraphQlRequest(context, {
    apiVersion: '2023-07',
    formatFunction: formatFileNode,
    maxEntriesPerRun,
    payload,
    prevContinuation,
    mainDataKey: 'files',
  });
};

/**
 * Deletes a file with the given fileGid.
 * @param fileGid - The GraphQL GID of the file to be deleted.
 * @param context - The context object containing necessary information.
 */
export const deleteFile = async ([fileGid], context: coda.SyncExecutionContext) => {
  const variables = {
    fileIds: [fileGid],
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
