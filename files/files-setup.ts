// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FileSchema } from '../schemas/syncTable/FileSchema';
import {
  deleteFileGraphQl,
  handleFileUpdateJob,
  formatFileNodeForSchema,
  fetchSingleFileGraphQl,
} from './files-functions';
import { CACHE_DEFAULT, IDENTITY_FILE, OPTIONS_FILE_TYPE } from '../constants';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { queryAllFiles } from './files-graphql';
import { GetFilesQuery, GetFilesQueryVariables } from '../types/admin.generated';

// #endregion

const parameters = {
  fileGid: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fileGid',
    description: 'The GraphQl GID of the file.',
  }),
};

// #region Sync Tables
export const Sync_Files = coda.makeSyncTable({
  name: 'Files',
  description: 'Return Files from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_FILE,
  schema: FileSchema,
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
    ],
    execute: async function ([type], context: coda.SyncExecutionContext) {
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
          includeThumbnail: effectivePropertyKeys.includes('thumbnail'),
          includeUpdatedAt: effectivePropertyKeys.includes('updatedAt'),
          includeUrl: effectivePropertyKeys.includes('url'),
          includeWidth: effectivePropertyKeys.includes('width'),
        } as GetFilesQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.files?.pageInfo,
        },
        context
      );
      if (response && response.body.data?.files) {
        const data = response.body.data as GetFilesQuery;
        return {
          result: data.files.nodes.map((file) => formatFileNodeForSchema(file)),
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
      const jobs = updates.map((update) => handleFileUpdateJob(update, context));
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
  description: 'Delete an existing Shopify File and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...parameters.fileGid, description: 'The GraphQl GID of the file to delete.' }],
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
  parameters: [parameters.fileGid],
  resultType: coda.ValueType.Object,
  schema: FileSchema,
  cacheTtlSecs: CACHE_DEFAULT,
  execute: async function ([fileGid], context) {
    const response = await fetchSingleFileGraphQl(fileGid, context);
    if (response?.body?.data?.node) {
      return formatFileNodeForSchema(response.body.data.node);
    }
  },
});

export const Format_File: coda.Format = {
  name: 'File',
  instructions: 'Paste the graphQL GID of the file into the column.',
  formulaName: 'File',
};

// #endregion
