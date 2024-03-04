import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT } from '../constants';
import { getThumbnailUrlFromFullUrl, isNullOrEmpty } from '../helpers';
import { makeGraphQlRequest } from '../helpers-graphql';
import { deleteFiles, querySingleFile, UpdateFile } from './files-graphql';
import { FileUpdateInput } from '../types/admin.types';
import { SimpleGraphQl } from '../Fetchers/SimpleGraphQl';
import { GraphQlResource } from '../types/RequestsGraphQl';

import type { FileRow } from '../types/CodaRows';
import type { FetchRequestOptions } from '../types/Requests';
import type {
  FileDeleteMutation,
  FileFields_GenericFile_Fragment,
  FileFields_MediaImage_Fragment,
  FileFields_Video_Fragment,
  FileFieldsFragment,
  FileUpdateMutation,
  FileUpdateMutationVariables,
  GetSingleFileQuery,
  GetSingleFileQueryVariables,
} from '../types/admin.generated';

// #region Helpers
export async function handleFileUpdateJob(
  row: {
    original?: FileRow;
    updated: FileRow;
  },
  context: coda.ExecutionContext
) {
  let obj = row.original ?? {};

  const fileUpdateInput = formatGraphQlFileUpdateInput(row.updated);
  console.log('row.updated', row.updated);
  if (fileUpdateInput !== undefined) {
    const updateJob = await updateFileGraphQl(fileUpdateInput, context);
    if (updateJob?.body?.data?.fileUpdate?.files) {
      const file = updateJob.body.data.fileUpdate.files.find((file) => file.id === fileUpdateInput.id);
      obj = {
        ...obj,
        ...formatFileNodeForSchema(file),
      };
    }
  }
  return obj as FileRow;
}
// #endregion

// #region Formatting functions
export function formatGraphQlFileUpdateInput(row: FileRow): FileUpdateInput | undefined {
  const ret: FileUpdateInput = {
    id: row.id,
  };

  if (row.name !== undefined) {
    if (isNullOrEmpty(row.name)) {
      throw new coda.UserVisibleError("File name can't be empty");
    }
    ret.filename = row.name;
  }
  // alt is the only value that can be an empty string
  if (row.alt !== undefined) {
    ret.alt = row.alt;
  }

  // Means we have nothing to update
  if (Object.keys(ret).length <= 1) return undefined;
  return ret;
}

function formatFileNodeCommonProps(file: FileFieldsFragment, previewSize?: number): FileRow {
  const obj: FileRow = {
    alt: file.alt,
    id: file.id,
    createdAt: file.createdAt,
    name: '', // can be determined later when knowing specific type of file
    preview: file.thumbnail?.image?.url
      ? previewSize !== undefined
        ? getThumbnailUrlFromFullUrl(file.thumbnail.image.url, previewSize)
        : file.thumbnail.image.url
      : undefined,
    type: file.__typename,
    updatedAt: file.updatedAt,
  };

  return obj;
}
function formatGenericFileNodeForSchema(file: FileFields_GenericFile_Fragment, previewSize?: number): FileRow {
  const obj: FileRow = {
    ...formatFileNodeCommonProps(file, previewSize),

    fileSize: file.originalFileSize,
    mimeType: file.mimeType,
    name: file.url ? file.url.split('/').pop().split('?').shift() : '',
    url: file.url,
  };

  return obj;
}
function formatMediaImageNodeForSchema(file: FileFields_MediaImage_Fragment, previewSize?: number): FileRow {
  const obj: FileRow = {
    ...formatFileNodeCommonProps(file, previewSize),

    fileSize: file.originalSource?.fileSize,
    height: file.image?.height,
    mimeType: file.mimeType,
    name: file.image?.url ? file.image.url.split('/').pop().split('?').shift() : '',
    url: file.image?.url,
    width: file.image?.width,
  };

  return obj;
}
function formatVideoNodeForSchema(file: FileFields_Video_Fragment, previewSize?: number): FileRow {
  const obj: FileRow = {
    ...formatFileNodeCommonProps(file, previewSize),

    duration: file.duration,
    fileSize: file.originalSource?.fileSize,
    height: file.originalSource?.height,
    mimeType: file.originalSource?.mimeType,
    name: file.filename,
    url: file.originalSource?.url,
    width: file.originalSource?.width,
  };

  return obj;
}

export const formatFileNodeForSchema = (file: FileFieldsFragment, previewSize?: number): FileRow => {
  switch (file.__typename) {
    case 'GenericFile':
      return formatGenericFileNodeForSchema(file, previewSize);

    case 'MediaImage':
      return formatMediaImageNodeForSchema(file, previewSize);

    case 'Video':
      return formatVideoNodeForSchema(file, previewSize);
  }

  return formatFileNodeCommonProps(file, previewSize);
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

  const { response } = await makeGraphQlRequest<GetSingleFileQuery>(
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

  const { response } = await makeGraphQlRequest<FileUpdateMutation>(
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
  const payload = {
    query: deleteFiles,
    variables: {
      fileIds: [fileGid],
    },
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.fileDelete.userErrors },
    context
  );

  const { body } = response;
  return body.data.fileDelete.deletedFileIds[0];
};
// #endregion
