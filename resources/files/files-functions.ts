import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../types/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { SimpleGraphQl } from '../../Fetchers/SimpleGraphQl';
import { CACHE_DEFAULT } from '../../constants';
import { makeGraphQlRequest } from '../../helpers-graphql';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { getThumbnailUrlFromFullUrl, isNullOrEmpty } from '../../utils/helpers';
import {
  FileFieldsFragment,
  GenericFileFieldsFragment,
  MediaImageFieldsFragment,
  UpdateFile,
  VideoFieldsFragment,
  deleteFiles,
  querySingleFile,
} from './files-graphql';

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
  if (fileUpdateInput !== undefined) {
    const updateJob = await updateFileGraphQl([fileUpdateInput], context);
    if (updateJob?.body?.data?.fileUpdate?.files) {
      const files = readFragment(FileFieldsFragment, updateJob.body.data.fileUpdate.files);
      const file = files.find((file) => file.id === fileUpdateInput.id);
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
function formatGraphQlFileUpdateInput(row: FileRow): VariablesOf<typeof UpdateFile>['files'][0] | undefined {
  const ret: VariablesOf<typeof UpdateFile>['files'][0] = {
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

function formatFileNodeCommonProps(file: ResultOf<typeof FileFieldsFragment>, previewSize?: number): FileRow {
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
function formatGenericFileFragmentForSchema(file: ResultOf<typeof GenericFileFieldsFragment>) {
  const obj = {
    fileSize: file.originalFileSize,
    mimeType: file.mimeType,
    name: file.url ? file.url.split('/').pop().split('?').shift() : '',
    url: file.url,
  };

  return obj;
}
function formatMediaImageFragmentForSchema(file: ResultOf<typeof MediaImageFieldsFragment>) {
  const obj = {
    fileSize: file.originalSource?.fileSize,
    height: file.image?.height,
    mimeType: file.mimeType,
    name: file.image?.url ? file.image.url.split('/').pop().split('?').shift() : '',
    url: file.image?.url,
    width: file.image?.width,
  };

  return obj;
}
function formatVideoFragmentForSchema(file: ResultOf<typeof VideoFieldsFragment>) {
  const obj = {
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

export const formatFileNodeForSchema = (file: ResultOf<typeof FileFieldsFragment>, previewSize?: number): FileRow => {
  const baseFile = formatFileNodeCommonProps(file, previewSize);

  switch (file.__typename) {
    case 'GenericFile':
      const genericFile = readFragment(GenericFileFieldsFragment, file);
      return {
        ...baseFile,
        ...formatGenericFileFragmentForSchema(genericFile),
      };

    case 'MediaImage':
      const mediaImageFile = readFragment(MediaImageFieldsFragment, file);
      return {
        ...baseFile,
        ...formatMediaImageFragmentForSchema(mediaImageFile),
      };

    case 'Video':
      const videoFile = readFragment(VideoFieldsFragment, file);
      return {
        ...baseFile,
        ...formatVideoFragmentForSchema(videoFile),
      };
  }

  return baseFile;
};

// #endregion

// #region GraphQL Requests
export async function fetchSingleFileGraphQl(
  fileGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(querySingleFile),
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
    } as VariablesOf<typeof querySingleFile>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof querySingleFile>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response;
}

async function updateFileGraphQl(
  fileUpdateInput: VariablesOf<typeof UpdateFile>['files'],
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(UpdateFile),
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
    } as VariablesOf<typeof UpdateFile>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof UpdateFile>>(
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
    query: printGql(deleteFiles),
    variables: {
      fileIds: [fileGid],
    },
  };

  const fileFetcher = new SimpleGraphQl(GraphQlResourceName.GenericFile, FileSyncTableSchema, context);
  const response = await fileFetcher.delete(payload, requestOptions);

  // const { response } = await makeGraphQlRequest<FileDeleteMutation>(
  //   { ...requestOptions, payload, getUserErrors: (body) => body.data.fileDelete.userErrors },
  //   context
  // );

  // const { body } = response;
  return response?.body?.data?.fileDelete?.deletedFileIds[0];
};
// #endregion
