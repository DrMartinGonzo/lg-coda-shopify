import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';

import { SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { VariablesOf } from '../../utils/graphql';
import { FileGraphQlFetcher } from './FileGraphQlFetcher';
import { File, fileResource } from './fileResource';
import { Sync_Files } from './files-coda';
import { queryAllFiles } from './files-graphql';

export class FileSyncTable extends SyncTableGraphQl<File> {
  constructor(fetcher: FileGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(fileResource, fetcher, params);
  }

  setPayload(): void {
    const [type, previewSize] = this.codaParams as SyncTableParamValues<typeof Sync_Files>;

    let searchQuery = 'status:READY';
    if (type && type !== '') {
      searchQuery += ` AND media_type:${type}`;
    }

    this.payload = {
      query: printGql(queryAllFiles),
      variables: {
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
      } as VariablesOf<typeof queryAllFiles>,
    };
  }

  // afterSync(response: MultipleFetchResponse<File>) {
  //   this.extraContinuationData = { blogIdsLeft: this.blogIdsLeft };
  //   let { restItems, continuation } = super.afterSync(response);
  //   // If we still have blogs left to fetch files from, we create a
  //   // continuation object to force the next sync
  //   if (this.blogIdsLeft && this.blogIdsLeft.length && !continuation?.nextUrl) {
  //     // @ts-ignore
  //     continuation = {
  //       ...(continuation ?? {}),
  //       extraContinuationData: this.extraContinuationData,
  //     };
  //   }
  //   return { restItems, continuation };
  // }
}
