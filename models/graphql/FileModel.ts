// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../graphql/utils/graphql-utils';

import { FileClient } from '../../Clients/GraphQlClients';
import { DEFAULT_THUMBNAIL_SIZE } from '../../config';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { FULL_SIZE } from '../../constants/strings-constants';
import {
  fileFieldsFragment,
  genericFileFieldsFragment,
  mediaImageFieldsFragment,
  videoFieldsFragment,
} from '../../graphql/files-graphql';
import { FileRow } from '../../schemas/CodaRows.types';
import { isNullishOrEmpty } from '../../utils/helpers';
import { ModelWithDeletedFlag } from '../AbstractModel';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export type FileApiData = BaseApiDataGraphQl &
  ResultOf<typeof fileFieldsFragment> &
  ResultOf<typeof genericFileFieldsFragment> &
  ResultOf<typeof videoFieldsFragment> &
  ResultOf<typeof mediaImageFieldsFragment>;

export type FileModelData = BaseModelDataGraphQl & FileApiData & ModelWithDeletedFlag;
// #endregion

export class FileModel extends AbstractModelGraphQl {
  public data: FileModelData;
  public previewSize: number = DEFAULT_THUMBNAIL_SIZE;

  public static readonly displayName: Identity = PACK_IDENTITIES.File;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: FileRow) {
    let data: Partial<FileModelData> = {
      __typename: row.type as any,
      id: row.id,
      alt: row.alt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    if (row.type === 'GenericFile') {
      data.mimeType = row.mimeType;
      data.originalFileSize = row.fileSize;
      data.url = row.url;
    }

    if (data.__typename === 'MediaImage') {
      data.image = {
        height: row.height,
        width: row.width,
        url: row.url,
      };
      data.mimeType = row.mimeType;
      data.originalSource = {
        fileSize: row.fileSize,
      };
    }

    if (data.__typename === 'Video') {
      data.duration = row.duration;
      data.originalSource = {
        fileSize: row.fileSize,
        height: row.height,
        width: row.width,
        mimeType: row.mimeType,
        url: row.url,
      };
    }

    if (row.name !== undefined) {
      if (isNullishOrEmpty(row.name)) {
        throw new coda.UserVisibleError("File name can't be empty");
      }
      data.filename = row.name;
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
    const { data } = this;

    let obj: Partial<FileRow> = {
      id: data.id,
      alt: data.alt,
      createdAt: data.createdAt,
      name: '',
      preview: FileModel.getThumbnailUrl(data.preview?.image.url, this.previewSize),
      type: data.__typename,
      updatedAt: data.updatedAt,
    };

    if (data.__typename === 'GenericFile') {
      obj.fileSize = data.originalFileSize;
      obj.mimeType = data.mimeType;
      obj.name = FileModel.getNameFromUrl(data.url);
      obj.url = data.url;
    }

    if (data.__typename === 'MediaImage') {
      obj.fileSize = data.originalSource?.fileSize;
      obj.height = data.image?.height;
      obj.mimeType = data.mimeType;
      obj.name = FileModel.getNameFromUrl(data.image.url);
      obj.url = data.image?.url;
      obj.width = data.image?.width;
    }

    if (data.__typename === 'Video') {
      obj.duration = data.duration;
      obj.fileSize = data.originalSource?.fileSize;
      obj.height = data.originalSource?.height;
      obj.mimeType = data.originalSource?.mimeType;
      obj.name = data.filename;
      obj.url = data.originalSource?.url;
      obj.width = data.originalSource?.width;
    }

    return obj as FileRow;
  }
}
