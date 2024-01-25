import * as coda from '@codahq/packs-sdk';

import { getThumbnailUrlFromFullUrl } from '../helpers';
import {
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { queryAllFiles, deleteFiles } from './files-graphql';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { FormatFunction } from '../types/misc';
import { FileFieldsFragment, GetFilesQuery, GetFilesQueryVariables } from '../types/admin.generated';

// #region Formatting functions
const formatFileNodeForSchema: FormatFunction = (file: FileFieldsFragment) => {
  const obj: any = {
    ...file,
    type: file.__typename,
    thumbnail: file.thumbnail?.image?.url ? getThumbnailUrlFromFullUrl(file.thumbnail.image.url) : undefined,
  };

  switch (file.__typename) {
    case 'GenericFile':
      obj.name = file.url.split('/').pop().split('?').shift();
      break;
    case 'MediaImage':
      obj.name = file.image.url.split('/').pop().split('?').shift();
      obj.fileSize = file.originalSource?.fileSize;
      obj.url = file.image?.url;
      obj.width = file.image?.width;
      obj.height = file.image?.height;
      break;
    case 'Video':
      obj.name = file.filename;
      obj.duration = file.duration;
      obj.fileSize = file.originalSource?.fileSize;
      obj.mimeType = file.originalSource?.mimeType;
      obj.url = file.originalSource?.url;
      obj.width = file.originalSource?.width;
      obj.height = file.originalSource?.height;
      break;

    default:
      break;
  }
  return obj;
};

// #endregion

// #region Pack functions
/**
 * Sync files using the GraphQL API.
 */
export const syncFiles = async ([type], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const defaultMaxEntriesPerRun = 50;
  const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
    defaultMaxEntriesPerRun,
    prevContinuation,
    context
  );
  if (shouldDeferBy > 0) {
    return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
  }

  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);

  let searchQuery = 'status:READY';
  if (type && type !== '') {
    searchQuery += ` AND media_type:${type}`;
  }

  const payload = {
    query: queryAllFiles,
    variables: {
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
      searchQuery,

      includeAlt: effectivePropertyKeys.includes('alt'),
      includeCreatedAt: effectivePropertyKeys.includes('createdAt'),
      includeDuration: effectivePropertyKeys.includes('duration'),
      includeFileSize: effectivePropertyKeys.includes('fileSize'),
      includeHeight: effectivePropertyKeys.includes('height'),
      includeMimeType: effectivePropertyKeys.includes('mimeType'),
      includeThumbnail: effectivePropertyKeys.includes('thumbnail'),
      includeUpdatedAt: effectivePropertyKeys.includes('updatedAt'),
      includeUrl: effectivePropertyKeys.includes('url'),
      includeWidth: effectivePropertyKeys.includes('width'),
    } as GetFilesQueryVariables,
  };

  const { response, continuation } = await makeSyncTableGraphQlRequest(
    {
      payload,
      maxEntriesPerRun,
      prevContinuation,
      getPageInfo: (data: any) => data.files?.pageInfo,
    },
    context
  );
  if (response && response.body.data?.files) {
    const data = response.body.data as GetFilesQuery;
    return {
      result: data.files.nodes.map((file) => formatFileNodeForSchema(file)),
      continuation,
    };
  } else {
    return {
      result: [],
      continuation,
    };
  }
};

/**
 * Deletes a file with the given fileGid.
 * @param fileGid - The GraphQL GID of the file to be deleted.
 * @param context - The context object containing necessary information.
 */
export const deleteFile = async ([fileGid], context: coda.ExecutionContext) => {
  const variables = {
    fileIds: [fileGid],
  };

  const payload = {
    query: deleteFiles,
    variables,
  };

  const { response } = await makeGraphQlRequest(
    {
      payload,
      getUserErrors: (body) => body.data.fileDelete.userErrors,
    },
    context
  );

  const { body } = response;
  return body.data.fileDelete.deletedFileIds[0];
};
// #endregion
