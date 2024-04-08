import * as coda from '@codahq/packs-sdk';

import { ClientGraphQl } from '../../Fetchers/ClientGraphQl';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResponse } from '../../helpers-graphql';
import { FileRow } from '../../schemas/CodaRows.types';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';
import { extractNameFromFileUrl, getThumbnailUrlFromFullUrl, isNullOrEmpty } from '../../utils/helpers';
import { File, fileResource } from './fileResource';
import {
  fileFieldsFragment,
  genericFileFieldsFragment,
  mediaImageFieldsFragment,
  updateFilesMutation,
  videoFieldsFragment,
  deleteFilesMutation,
  getSingleFileQuery,
} from './files-graphql';

export class FileGraphQlFetcher extends ClientGraphQl<File> {
  constructor(context: coda.ExecutionContext) {
    super(fileResource, context);
  }

  formatFileNodeCommonProps(file: ResultOf<typeof fileFieldsFragment>, previewSize?: number): FileRow {
    return {
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
  }
  formatGenericFileFragmentForSchema(file: ResultOf<typeof genericFileFieldsFragment>) {
    return {
      fileSize: file.originalFileSize,
      mimeType: file.mimeType,
      name: file.url ? extractNameFromFileUrl(file.url) : '',
      url: file.url,
    };
  }
  formatMediaImageFragmentForSchema(file: ResultOf<typeof mediaImageFieldsFragment>) {
    return {
      fileSize: file.originalSource?.fileSize,
      height: file.image?.height,
      mimeType: file.mimeType,
      name: file.image?.url ? extractNameFromFileUrl(file.image.url) : '',
      url: file.image?.url,
      width: file.image?.width,
    };
  }
  formatVideoFragmentForSchema(file: ResultOf<typeof videoFieldsFragment>) {
    return {
      duration: file.duration,
      fileSize: file.originalSource?.fileSize,
      height: file.originalSource?.height,
      mimeType: file.originalSource?.mimeType,
      name: file.filename,
      url: file.originalSource?.url,
      width: file.originalSource?.width,
    };
  }

  formatApiToRow(file: ResultOf<typeof fileFieldsFragment>, previewSize?: number): FileRow {
    const baseFormattedFile = this.formatFileNodeCommonProps(file, previewSize);

    switch (file.__typename) {
      case 'GenericFile':
        const genericFile = readFragment(genericFileFieldsFragment, file);
        return {
          ...baseFormattedFile,
          ...this.formatGenericFileFragmentForSchema(genericFile),
        };

      case 'MediaImage':
        const mediaImageFile = readFragment(mediaImageFieldsFragment, file);
        return {
          ...baseFormattedFile,
          ...this.formatMediaImageFragmentForSchema(mediaImageFile),
        };

      case 'Video':
        const videoFile = readFragment(videoFieldsFragment, file);
        return {
          ...baseFormattedFile,
          ...this.formatVideoFragmentForSchema(videoFile),
        };

      default:
        return baseFormattedFile;
    }
  }

  formatRowToApi(row: FileRow, metafieldKeyValueSets?: any[]) {
    const ret: VariablesOf<typeof updateFilesMutation>['files'][0] = {
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

  async fetch(fileGid: string, requestOptions: FetchRequestOptions = {}) {
    const variables = {
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
    } as VariablesOf<typeof getSingleFileQuery>;

    // TODO
    return this.makeRequest(getSingleFileQuery, variables, requestOptions) as unknown as coda.FetchResponse<
      GraphQlResponse<{ node: ResultOf<typeof fileFieldsFragment> }>
    >;
  }

  async update(
    fileUpdateInput: VariablesOf<typeof updateFilesMutation>['files'],
    requestOptions: FetchRequestOptions = {}
  ) {
    const variables = {
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
    } as VariablesOf<typeof updateFilesMutation>;

    return this.makeRequest(updateFilesMutation, variables, requestOptions);
  }

  /**
   * Delete files with the given file GIDs.
   * @param fileGids - The GraphQL GIDs of the files to be deleted.
   * @param requestOptions - The fetch request options. See {@link FetchRequestOptions}
   */
  async delete(fileGids: Array<string>, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      fileIds: fileGids,
    } as VariablesOf<typeof deleteFilesMutation>;

    return this.makeRequest(deleteFilesMutation, variables, requestOptions);
  }
}
