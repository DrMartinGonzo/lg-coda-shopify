// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { FragmentOf, ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { CACHE_DEFAULT, Identity, OPTIONS_FILE_TYPE } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { inputs } from '../../shared-parameters';
import { FileGraphQlFetcher } from './FileGraphQlFetcher';
import { handleFileUpdateJob } from './files-functions';
import { FileFieldsFragment, queryAllFiles } from './files-graphql';

// #endregion

// #region Sync Tables
export const Sync_Files = coda.makeSyncTable({
  name: 'Files',
  description: 'Return Files from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.File,
  schema: FileSyncTableSchema,
  formula: {
    name: 'SyncFiles',
    description: '<Help text for the sync formula, not shown to the user>',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'type',
        description: 'Return only files of the specific type',
        optional: true,
        autocomplete: OPTIONS_FILE_TYPE,
      }),
      { ...inputs.general.previewSize, optional: true },
    ],
    execute: async function ([type, previewSize], context: coda.SyncExecutionContext) {
      const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
      const defaultMaxEntriesPerRun = 50;
      const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        defaultMaxEntriesPerRun,
        prevContinuation,
        context
      );
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
      }

      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);

      let searchQuery = 'status:READY';
      if (type && type !== '') {
        searchQuery += ` AND media_type:${type}`;
      }

      const payload = {
        query: printGql(queryAllFiles),
        variables: {
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
          searchQuery,

          includeAlt: effectivePropertyKeys.includes('alt'),
          includeCreatedAt: effectivePropertyKeys.includes('createdAt'),
          includeDuration: effectivePropertyKeys.includes('duration'),
          includeFileSize: effectivePropertyKeys.includes('fileSize'),
          includeHeight: effectivePropertyKeys.includes('height'),
          includeMimeType: effectivePropertyKeys.includes('mimeType'),
          includeThumbnail: effectivePropertyKeys.includes('preview'),
          includeUpdatedAt: effectivePropertyKeys.includes('updatedAt'),
          includeUrl: effectivePropertyKeys.includes('url'),
          includeWidth: effectivePropertyKeys.includes('width'),
        } as VariablesOf<typeof queryAllFiles>,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof queryAllFiles>>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.files?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.files?.nodes) {
        const fileFetcher = new FileGraphQlFetcher(context);
        const files = readFragment(FileFieldsFragment, response.body.data.files.nodes);
        return {
          result: files.map((file) => fileFetcher.formatApiToRow(file, previewSize)),
          continuation,
        };
      } else {
        return {
          result: [],
          continuation,
        };
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const jobs = updates.map((update) => {
        return handleFileUpdateJob(
          {
            original: update.previousValue as unknown as FileRow,
            updated: Object.fromEntries(
              Object.entries(update.newValue).filter(([key]) => update.updatedFields.includes(key) || key == 'id')
            ) as FileRow,
          },
          params,
          context
        );
      });

      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
    },
  },
});
// #endregion

// #region Actions
export const Action_DeleteFile = coda.makeFormula({
  name: 'DeleteFile',
  description: 'Delete an existing Shopify File and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...inputs.file.gid, description: 'The GraphQl GID of the file to delete.' }],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([fileGid], context) {
    const fileFetcher = new FileGraphQlFetcher(context);
    const response = await fileFetcher.delete([fileGid]);
    const deletedFileId = response?.body?.data?.fileDelete?.deletedFileIds[0];
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_File = coda.makeFormula({
  name: 'File',
  description: 'Get a single file by its graphQL GID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.file.gid],
  resultType: coda.ValueType.Object,
  schema: FileSyncTableSchema,
  cacheTtlSecs: CACHE_DEFAULT,
  execute: async function ([fileGid], context) {
    const fileFetcher = new FileGraphQlFetcher(context);
    const response = await fileFetcher.fetch(fileGid, { cacheTtlSecs: CACHE_DEFAULT });
    return fileFetcher.formatApiToRow(response.body.data.node);
  },
});

export const Format_File: coda.Format = {
  name: 'File',
  instructions: 'Paste the graphQL GID of the file into the column.',
  formulaName: 'File',
};

// #endregion
