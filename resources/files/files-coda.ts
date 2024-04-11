// #region Imports
import * as coda from '@codahq/packs-sdk';

import { File } from '../../Fetchers/NEW/Resources/File';
import { CACHE_DEFAULT, Identity, OPTIONS_FILE_TYPE } from '../../constants';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { inputs } from '../../shared-parameters';

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
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link File.sync}
     *  - {@link File.makeSyncFunction}
     */
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
    execute: async function (params, context) {
      return File.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return File.syncUpdate(params, updates, context);
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
    const response = await File.delete({ context, ids: [fileGid] });
    const deletedFileId = response?.fileDelete?.deletedFileIds[0];
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
    const file = await File.find({ context, id: fileGid });
    return file.formatToRow();
  },
});

export const Format_File: coda.Format = {
  name: 'File',
  instructions: 'Paste the graphQL GID of the file into the column.',
  formulaName: 'File',
};

// #endregion
