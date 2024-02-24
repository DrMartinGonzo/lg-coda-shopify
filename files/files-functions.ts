import * as coda from '@codahq/packs-sdk';

import { getThumbnailUrlFromFullUrl } from '../helpers';
import { makeGraphQlRequest } from '../helpers-graphql';
import { deleteFiles, querySingleFile, UpdateFile } from './files-graphql';
import { FetchRequestOptions } from '../types/Requests';
import { FileFieldsFragment, FileUpdateMutationVariables, GetSingleFileQueryVariables } from '../types/admin.generated';
import { FileSchema } from '../schemas/syncTable/FileSchema';
import { FileUpdateInput } from '../types/admin.types';
import { CACHE_DEFAULT } from '../constants';

// #region Helpers
export async function handleFileUpdateJob(
  update: coda.SyncUpdate<string, string, typeof FileSchema>,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const subJobs: Promise<any>[] = [];
  const fileId = update.previousValue.id as number;

  if (updatedFields.length) {
    const fileUpdateInput = formatGraphQlFileUpdateInput(update, updatedFields);
    subJobs.push(updateFileGraphQl(fileUpdateInput, context));
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob] = await Promise.all(subJobs);
  if (updateJob?.body?.data?.fileUpdate?.files) {
    const file = updateJob.body.data.fileUpdate.files.find((file) => file.id === fileId);
    obj = {
      ...obj,
      ...formatFileNodeForSchema(file),
    };
  }
  return obj;
}
// #endregion

// #region Formatting functions
function formatGraphQlFileUpdateInput(update: any, fromKeys: string[]): FileUpdateInput {
  const ret: FileUpdateInput = {
    id: update.previousValue.id,
  };
  if (!fromKeys.length) return ret;

  fromKeys.forEach((fromKey) => {
    const value = update.newValue[fromKey];
    let inputKey = fromKey;
    let inputValue = value !== undefined && value !== '' ? value : null;

    if (fromKey === 'name') {
      inputKey = 'filename';
    }
    // alt is the only value that can be null
    if (inputKey === 'alt') {
      inputValue = value;
    }

    ret[inputKey] = inputValue;
  });

  return ret;
}

export const formatFileNodeForSchema = (file: FileFieldsFragment) => {
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

// #region GraphQL Requests
export async function fetchSingleFileGraphQl(
  fileGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: querySingleFile,
    variables: {
      id: fileGid,
      includeAlt: true,
      includeCreatedAt: true,
      includeDuration: true,
      includeFileSize: true,
      includeHeight: true,
      includeMimeType: true,
      includeThumbnail: true,
      includeUpdatedAt: true,
      includeUrl: true,
      includeWidth: true,
    } as GetSingleFileQueryVariables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response;
}

async function updateFileGraphQl(
  fileUpdateInput: FileUpdateInput,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: UpdateFile,
    variables: {
      files: fileUpdateInput,
      includeAlt: true,
      includeCreatedAt: true,
      includeDuration: true,
      includeFileSize: true,
      includeHeight: true,
      includeMimeType: true,
      includeThumbnail: true,
      includeUpdatedAt: true,
      includeUrl: true,
      includeWidth: true,
    } as FileUpdateMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.fileUpdate.userErrors },
    context
  );
  return response;
}

/**
 * Deletes a file with the given fileGid.
 * @param fileGid - The GraphQL GID of the file to be deleted.
 * @param context - The context object containing necessary information.
 */
export const deleteFileGraphQl = async (
  fileGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<string> => {
  const variables = {
    fileIds: [fileGid],
  };

  const payload = {
    query: deleteFiles,
    variables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.fileDelete.userErrors },
    context
  );

  const { body } = response;
  return body.data.fileDelete.deletedFileIds[0];
};
// #endregion
