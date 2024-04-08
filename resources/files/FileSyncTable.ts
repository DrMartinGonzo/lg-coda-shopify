import * as coda from '@codahq/packs-sdk';

import { SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { VariablesOf } from '../../utils/graphql';
import { FileGraphQlFetcher } from './FileGraphQlFetcher';
import { File, fileResource } from './fileResource';
import { Sync_Files } from './files-coda';
import { getFilesQuery } from './files-graphql';

export class FileSyncTable extends SyncTableGraphQl<File> {
  constructor(fetcher: FileGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(fileResource, fetcher, params);
    // TODO: get an approximation for first run by using count of relation columns ?
    this.initalMaxEntriesPerRun = 50;
  }

  setPayload(): void {
    const [type, previewSize] = this.codaParams as SyncTableParamValues<typeof Sync_Files>;

    let searchQuery = 'status:READY';
    if (type && type !== '') {
      searchQuery += ` AND media_type:${type}`;
    }

    this.documentNode = getFilesQuery;
    this.variables = {
      maxEntriesPerRun: this.maxEntriesPerRun,
      cursor: this.prevContinuation?.cursor ?? null,
      searchQuery,

      includeAlt: this.effectivePropertyKeys.includes('alt'),
      includeCreatedAt: this.effectivePropertyKeys.includes('createdAt'),
      includeDuration: this.effectivePropertyKeys.includes('duration'),
      includeFileSize: this.effectivePropertyKeys.includes('fileSize'),
      includeHeight: this.effectivePropertyKeys.includes('height'),
      includeMimeType: this.effectivePropertyKeys.includes('mimeType'),
      includeThumbnail: this.effectivePropertyKeys.includes('preview'),
      includeUpdatedAt: this.effectivePropertyKeys.includes('updatedAt'),
      includeUrl: this.effectivePropertyKeys.includes('url'),
      includeWidth: this.effectivePropertyKeys.includes('width'),
    } as VariablesOf<typeof getFilesQuery>;
  }
}
