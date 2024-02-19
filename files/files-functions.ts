import * as coda from '@codahq/packs-sdk';

import { getThumbnailUrlFromFullUrl } from '../helpers';
import { makeGraphQlRequest } from '../helpers-graphql';
import { deleteFiles, UpdateFile } from './files-graphql';
import { FormatFunction } from '../types/misc';
import { FileFieldsFragment, FileUpdateMutationVariables } from '../types/admin.generated';
import { FileSchema } from '../schemas/syncTable/FileSchema';
import { FileUpdateInput } from '../types/admin.types';

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

  const [updateJob] = await Promise.allSettled(subJobs);
  if (updateJob) {
    if (updateJob.status === 'fulfilled' && updateJob.value) {
      if (updateJob.value.body?.data?.fileUpdate?.files) {
        const file = updateJob.value.body.data.fileUpdate.files.find((file) => file.id === fileId);
        obj = {
          ...obj,
          ...formatFileNodeForSchema(file, context),
        };
      }
    } else if (updateJob.status === 'rejected') {
      throw new coda.UserVisibleError(updateJob.reason);
    }
  }

  return obj;
}
// #endregion

// #region Formatting functions
// TODO: rewrite this without looping over fromKeys but explicitly set FileUpdateInput props
function formatGraphQlFileUpdateInput(update: any, fromKeys: string[]): FileUpdateInput {
  const ret: FileUpdateInput = {
    id: update.previousValue.id,
  };
  if (!fromKeys.length) return ret;

  fromKeys.forEach((fromKey) => {
    const value = update.newValue[fromKey];
    let inputKey = fromKey;
    switch (fromKey) {
      case 'name':
        inputKey = 'filename';
        break;
      default:
        break;
    }

    if (fromKey === 'alt') {
      ret.alt = value;
    } else {
      ret[inputKey] = value !== undefined && value !== '' ? value : null;
    }
  });

  return ret;
}

export const formatFileNodeForSchema: FormatFunction = (file: FileFieldsFragment) => {
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
async function updateFileGraphQl(fileUpdateInput: FileUpdateInput, context: coda.ExecutionContext) {
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
    {
      payload,
      getUserErrors: (body) => body.data.fileUpdate.userErrors,
    },
    context
  );
  return response;
}

/**
 * Deletes a file with the given fileGid.
 * @param fileGid - The GraphQL GID of the file to be deleted.
 * @param context - The context object containing necessary information.
 */
export const deleteFileGraphQl = async (fileGid: string, context: coda.ExecutionContext): Promise<string> => {
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
