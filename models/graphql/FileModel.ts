// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../graphql/utils/graphql-utils';

import { FileClient } from '../../Clients/GraphQlClients';
import { DEFAULT_THUMBNAIL_SIZE } from '../../config';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlFileTypes } from '../../constants/resourceNames-constants';
import { FULL_SIZE } from '../../constants/strings-constants';
import {
  fileFieldsFragment,
  genericFileFieldsFragment,
  mediaImageFieldsFragment,
  videoFieldsFragment,
} from '../../graphql/files-graphql';
import { FileRow } from '../../schemas/CodaRows.types';
import { isNullishOrEmpty, safeToString } from '../../utils/helpers';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export type FileApiData = BaseApiDataGraphQl &
  ResultOf<typeof fileFieldsFragment> &
  ResultOf<typeof genericFileFieldsFragment> &
  ResultOf<typeof videoFieldsFragment> &
  ResultOf<typeof mediaImageFieldsFragment>;

export type FileModelData = BaseModelDataGraphQl & FileApiData;
// #endregion

export class FileModel extends AbstractModelGraphQl {
  public data: FileModelData;
  public previewSize: number = DEFAULT_THUMBNAIL_SIZE;

  public static readonly displayName: Identity = PACK_IDENTITIES.File;

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    { duration, fileSize, height, width, name, mimeType, preview, type, url, ...row }: FileRow
  ) {
    let data: Partial<FileModelData> = {
      ...row,
      __typename: type as GraphQlFileTypes,
      createdAt: safeToString(row.createdAt),
      updatedAt: safeToString(row.updatedAt),
    };

    if (type === 'GenericFile') {
      data = { ...data, originalFileSize: fileSize, mimeType, url };
    }

    if (type === 'MediaImage') {
      data = { ...data, image: { height, width, url }, mimeType, originalSource: { fileSize } };
    }

    if (type === 'Video') {
      data = { ...data, duration, originalSource: { fileSize, height, width, mimeType, url } };
    }

    if (name !== undefined) {
      if (isNullishOrEmpty(name)) {
        throw new coda.UserVisibleError("File name can't be empty");
      }
      data.filename = name;
    }

    return FileModel.createInstance(context, data);
  }

  private static getNameFromUrl(url: string) {
    return url ? url.split('/').pop().split('?').shift() : '';
  }

  private static getThumbnailUrl(url: string, thumbnailSize: string | number) {
    if (!url) return undefined;

    const parsedPreviewSize =
      typeof thumbnailSize === 'number'
        ? Math.floor(thumbnailSize)
        : thumbnailSize === FULL_SIZE
        ? undefined
        : parseInt(thumbnailSize, 10);

    if (parsedPreviewSize === undefined) {
      return url;
    }

    return coda.withQueryParams(url, {
      width: thumbnailSize,
      height: thumbnailSize,
      crop: 'center',
    });
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return FileClient.createInstance(this.context);
  }

  public toCodaRow(): FileRow {
    const { image, originalFileSize, duration, filename, originalSource, preview, mimeType, url, __typename, ...data } =
      this.data;

    let obj: FileRow = {
      ...data,
      name: '',
      preview: FileModel.getThumbnailUrl(preview?.image.url, this.previewSize),
      type: __typename,
    };

    if (__typename === 'GenericFile') {
      obj.fileSize = originalFileSize;
      obj.mimeType = mimeType;
      obj.name = FileModel.getNameFromUrl(url);
      obj.url = url;
    }

    if (__typename === 'MediaImage') {
      obj.fileSize = originalSource?.fileSize;
      obj.height = image?.height;
      obj.mimeType = mimeType;
      obj.name = FileModel.getNameFromUrl(image?.url);
      obj.url = image?.url;
      obj.width = image?.width;
    }

    if (__typename === 'Video') {
      obj.duration = duration;
      obj.fileSize = originalSource?.fileSize;
      obj.height = originalSource?.height;
      obj.mimeType = originalSource?.mimeType;
      obj.name = filename;
      obj.url = originalSource?.url;
      obj.width = originalSource?.width;
    }

    return obj as FileRow;
  }
}
