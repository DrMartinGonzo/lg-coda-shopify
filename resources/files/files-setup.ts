// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import {
  deleteFileGraphQl,
  handleFileUpdateJob,
  formatFileNodeForSchema,
  fetchSingleFileGraphQl,
} from './files-functions';
import { CACHE_DEFAULT, OPTIONS_FILE_TYPE } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { queryAllFiles } from './files-graphql';
import { inputs } from '../../shared-parameters';
import { Identity } from '../../constants';

import type { FileRow } from '../../types/CodaRows';
import type { FileFieldsFragment, GetFilesQuery, GetFilesQueryVariables } from '../../types/generated/admin.generated';
import type { SyncTableGraphQlContinuation } from '../../types/SyncTable';

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
        query: queryAllFiles,
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
        } as GetFilesQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<GetFilesQuery>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.files?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.files) {
        const data = response.body.data as GetFilesQuery;
        return {
          result: data.files.nodes.map((file) => formatFileNodeForSchema(file, previewSize)),
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
    await deleteFileGraphQl(fileGid, context);
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
    const response = await fetchSingleFileGraphQl(fileGid, context);
    if (response?.body?.data?.node) {
      return formatFileNodeForSchema(response.body.data.node as FileFieldsFragment);
    }
  },
});

export const Format_File: coda.Format = {
  name: 'File',
  instructions: 'Paste the graphQL GID of the file into the column.',
  formulaName: 'File',
};

// #endregion