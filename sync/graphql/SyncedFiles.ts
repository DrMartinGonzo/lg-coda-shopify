// #region Imports

import { ListFilesArgs } from '../../Clients/GraphQlClients';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Files } from '../../coda/setup/files-setup';
import { FileModel } from '../../models/graphql/FileModel';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncFilesParams = CodaSyncParams<typeof Sync_Files>;
// #endregion

export class SyncedFiles extends AbstractSyncedGraphQlResources<FileModel> {
  public static staticSchema = FileSyncTableSchema;

  public get codaParamsMap() {
    const [type, previewSize] = this.codaParams as SyncFilesParams;
    return {
      type,
      previewSize,
    };
  }

  protected codaParamsToListArgs() {
    const { type } = this.codaParamsMap;
    const fields = Object.fromEntries(
      ['alt', 'createdAt', 'duration', 'fileSize', 'height', 'mimeType', 'preview', 'updatedAt', 'url', 'width'].map(
        (key) => [key, this.syncedStandardFields.includes(key)]
      )
    );
    return { fields, type } as ListFilesArgs;
  }

  protected async createInstanceFromData(data: any) {
    const instance = await super.createInstanceFromData(data);
    return this.setInstancePreviewSize(instance);
  }
  protected async createInstanceFromRow(row: FileRow) {
    const instance = await super.createInstanceFromRow(row);
    return this.setInstancePreviewSize(instance);
  }
  private setInstancePreviewSize(instance: FileModel) {
    const { previewSize } = this.codaParamsMap;
    instance.previewSize = parseInt(previewSize);
    return instance;
  }
}
