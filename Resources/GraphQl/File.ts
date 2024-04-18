// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { BaseContext } from '../../Clients/Client.types';
import { UnsupportedActionError } from '../../Errors/Errors';
import { SyncTableManagerGraphQl } from '../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import { SyncTableSyncResult } from '../../SyncTableManager/types/SyncTable.types';
import { Sync_Files } from '../../coda/setup/files-setup';
import { DEFAULT_THUMBNAIL_SIZE } from '../../config';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
import {
  deleteFilesMutation,
  fileFieldsFragment,
  genericFileFieldsFragment,
  getFilesQuery,
  getSingleFileQuery,
  mediaImageFieldsFragment,
  updateFilesMutation,
  videoFieldsFragment,
} from '../../graphql/files-graphql';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import {
  deleteUndefinedInObject,
  extractNameFromFileUrl,
  getThumbnailUrlFromFullUrl,
  isNullishOrEmpty,
} from '../../utils/helpers';
import { FindAllResponse, GraphQlResourcePath, SaveArgs } from '../Abstract/GraphQl/AbstractGraphQlResource';
import {
  AbstractSyncedGraphQlResource,
  MakeSyncGraphQlFunctionArgs,
  SyncGraphQlFunction,
} from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { CodaSyncParams, FromRow } from '../Abstract/Rest/AbstractSyncedRestResource';

// #endregion

// #region Types
interface FieldsArgs {
  alt?: boolean;
  createdAt?: boolean;
  duration?: boolean;
  fileSize?: boolean;
  height?: boolean;
  mimeType?: boolean;
  preview?: boolean;
  updatedAt?: boolean;
  url?: boolean;
  width?: boolean;
}
interface FindArgs extends BaseContext {
  id: string;
  fields?: FieldsArgs;
}
interface DeleteArgs extends BaseContext {
  ids: Array<string>;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  maxEntriesPerRun?: number;
  cursor?: string;
  type?: string;
  fields?: FieldsArgs;
}
// #endregion

export class File extends AbstractSyncedGraphQlResource {
  public apiData: ResultOf<typeof fileFieldsFragment> &
    ResultOf<typeof genericFileFieldsFragment> &
    ResultOf<typeof videoFieldsFragment> &
    ResultOf<typeof mediaImageFieldsFragment>;

  public static readonly displayName: Identity = PACK_IDENTITIES.File;
  // TODO
  // protected static readonly graphQlName = GraphQlResourceName.GenericFile;

  protected static readonly defaultMaxEntriesPerRun: number = 50;
  protected static readonly paths: Array<GraphQlResourcePath> = ['node', 'files', 'fileUpdate.files'];

  public static getStaticSchema() {
    return FileSyncTableSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncGraphQlFunctionArgs<File, typeof Sync_Files>): SyncGraphQlFunction<File> {
    const [type] = codaSyncParams;

    const fields = {};
    ['alt', 'createdAt', 'duration', 'fileSize', 'height', 'mimeType', 'preview', 'updatedAt', 'url', 'width'].forEach(
      (key) => {
        fields[key] = syncTableManager.effectiveStandardFromKeys.includes(key);
      }
    );

    return ({ cursor = null, maxEntriesPerRun }) =>
      this.all({
        context,
        fields,
        type,
        cursor,
        maxEntriesPerRun,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
  }

  // TODO: rewriting the whole function shouldn't be necessary
  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const [type, previewSize] = codaSyncParams;
    const syncTableManager = (await this.getSyncTableManager(context, codaSyncParams)) as SyncTableManagerGraphQl<File>;
    const syncFunction = this.makeSyncTableManagerSyncFunction({
      codaSyncParams: codaSyncParams as CodaSyncParams<typeof Sync_Files>,
      context,
      syncTableManager,
    });

    const { response, continuation } = await syncTableManager.executeSync({
      sync: syncFunction,
      defaultMaxEntriesPerRun: this.defaultMaxEntriesPerRun,
    });
    return {
      result: response.data.map((data: AbstractSyncedGraphQlResource) => data.formatToRow(previewSize)),
      continuation,
    };
  }

  public static async find({ id, fields = {}, context, options }: FindArgs): Promise<File | null> {
    const result = await this.baseFind<File, typeof getSingleFileQuery>({
      documentNode: getSingleFileQuery,
      variables: {
        id,

        includeAlt: fields?.alt ?? true,
        includeCreatedAt: fields?.createdAt ?? true,
        includeDuration: fields?.duration ?? true,
        includeFileSize: fields?.fileSize ?? true,
        includeHeight: fields?.height ?? true,
        includeMimeType: fields?.mimeType ?? true,
        includePreview: fields?.preview ?? true,
        includeUpdatedAt: fields?.updatedAt ?? true,
        includeUrl: fields?.url ?? true,
        includeWidth: fields?.width ?? true,
      },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ ids, context, options }: DeleteArgs) {
    return this.baseDelete<typeof deleteFilesMutation>({
      documentNode: deleteFilesMutation,
      variables: {
        fileIds: ids,
      },
      context,
      options,
    });
  }

  public static async all({
    context,
    maxEntriesPerRun = null,
    cursor = null,
    type = null,
    fields = {},
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<File>> {
    let searchQuery = 'status:READY';
    if (type && type !== '') {
      searchQuery += ` AND media_type:${type}`;
    }

    const response = await this.baseFind<File, typeof getFilesQuery>({
      documentNode: getFilesQuery,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,

        includeAlt: fields?.alt ?? true,
        includeCreatedAt: fields?.createdAt ?? true,
        includeDuration: fields?.duration ?? true,
        includeFileSize: fields?.fileSize ?? true,
        includeHeight: fields?.height ?? true,
        includeMimeType: fields?.mimeType ?? true,
        includePreview: fields?.preview ?? true,
        includeUpdatedAt: fields?.updatedAt ?? true,
        includeUrl: fields?.url ?? true,
        includeWidth: fields?.width ?? true,

        ...otherArgs,
      },
      context,
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  formatFileUpdateInput(): VariablesOf<typeof updateFilesMutation>['files'][number] | undefined {
    let input: VariablesOf<typeof updateFilesMutation>['files'][number] = {
      id: this.apiData.id,
      filename: this.apiData.filename,
      alt: this.apiData.alt,
    };

    input = deleteUndefinedInObject(input);

    // No input, we have nothing to update.
    if (Object.keys(input).length === 0) return undefined;
    return input;
  }

  public async save({ update = false }: SaveArgs): Promise<void> {
    const { primaryKey } = File;
    const isUpdate = this.apiData[primaryKey];

    if (isUpdate) {
      const fileUpdateInput = this.formatFileUpdateInput();

      if (fileUpdateInput) {
        const documentNode = updateFilesMutation;
        const variables = {
          files: [fileUpdateInput],
          includeAlt: true,
          includeCreatedAt: true,
          includeDuration: true,
          includeFileSize: true,
          includeHeight: true,
          includeMimeType: true,
          includePreview: true,
          includeUpdatedAt: true,
          includeUrl: true,
          includeWidth: true,
        } as VariablesOf<typeof updateFilesMutation>;

        await this._baseSave<typeof documentNode>({ documentNode, variables, update });
        // We are only updating a single file
        this.apiData = this.apiData[0];
      }
    } else {
      throw new UnsupportedActionError('Creating Files');
    }
  }

  protected formatToApi({ row }: FromRow<FileRow>) {
    let apiData: Partial<typeof this.apiData> = {
      __typename: row.type as any,
      id: row.id,
      alt: row.alt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    if (row.type === 'GenericFile') {
      apiData.mimeType = row.mimeType;
      apiData.originalFileSize = row.fileSize;
      apiData.url = row.url;
    }

    if (apiData.__typename === 'MediaImage') {
      apiData.image = {
        height: row.height,
        width: row.width,
        url: row.url,
      };
      apiData.mimeType = row.mimeType;
      apiData.originalSource = {
        fileSize: row.fileSize,
      };
    }

    if (apiData.__typename === 'Video') {
      apiData.duration = row.duration;
      apiData.originalSource = {
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
      apiData.filename = row.name;
    }

    return apiData;
  }

  // TODO: handle thumbnailSize config
  public formatToRow(thumbnailSize = DEFAULT_THUMBNAIL_SIZE): FileRow {
    const { apiData } = this;

    let obj: FileRow = {
      id: apiData.id,
      alt: apiData.alt,
      createdAt: apiData.createdAt,
      name: '',
      preview: apiData.preview?.image.url
        ? thumbnailSize !== undefined
          ? getThumbnailUrlFromFullUrl(apiData.preview.image.url, thumbnailSize)
          : apiData.preview.image.url
        : undefined,
      type: apiData.__typename,
      updatedAt: apiData.updatedAt,
    };

    if (apiData.__typename === 'GenericFile') {
      obj.fileSize = apiData.originalFileSize;
      obj.mimeType = apiData.mimeType;
      obj.name = apiData.url ? extractNameFromFileUrl(apiData.url) : '';
      obj.url = apiData.url;
    }

    if (apiData.__typename === 'MediaImage') {
      obj.fileSize = apiData.originalSource?.fileSize;
      obj.height = apiData.image?.height;
      obj.mimeType = apiData.mimeType;
      obj.name = apiData.image?.url ? extractNameFromFileUrl(apiData.image.url) : '';
      obj.url = apiData.image?.url;
      obj.width = apiData.image?.width;
    }

    if (apiData.__typename === 'Video') {
      obj.duration = apiData.duration;
      obj.fileSize = apiData.originalSource?.fileSize;
      obj.height = apiData.originalSource?.height;
      obj.mimeType = apiData.originalSource?.mimeType;
      obj.name = apiData.filename;
      obj.url = apiData.originalSource?.url;
      obj.width = apiData.originalSource?.width;
    }

    return obj;
  }
}
