// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NotFoundVisibleError } from '../../Errors/Errors';
import { File } from '../../Resources/GraphQl/File';
import { DEFAULT_THUMBNAIL_SIZE } from '../../config';
import { CACHE_DEFAULT, OPTIONS_FILE_TYPE, PACK_IDENTITIES } from '../../constants';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { makeDeleteGraphQlResourceAction } from '../../utils/coda-utils';
import { inputs } from '../coda-parameters';

// #endregion

// #region Sync Tables
export const Sync_Files = coda.makeSyncTable({
  name: 'Files',
  description: 'Return Files from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.File,
  schema: FileSyncTableSchema,
  formula: {
    name: 'SyncFiles',
    description: '<Help text for the sync formula, not shown to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link File.makeSyncTableManagerSyncFunction}
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
      const [type, previewSize] = params;
      File.setPreviewSize(previewSize);
      return File.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const [type, previewSize] = params;
      File.setPreviewSize(previewSize);
      return File.syncUpdate(params, updates, context);
    },
  },
});
// #endregion

// #region Actions
export const Action_DeleteFile = makeDeleteGraphQlResourceAction(File, inputs.file.gid, ({ context, id }) =>
  File.delete({ context, ids: [id as string] })
);
// #endregion

// #region Formulas
export const Formula_File = coda.makeFormula({
  name: 'File',
  description: 'Get a single file by its graphQL GID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.file.gid,
    { ...inputs.general.previewSize, suggestedValue: `${DEFAULT_THUMBNAIL_SIZE}`, optional: true },
  ],
  resultType: coda.ValueType.Object,
  schema: FileSyncTableSchema,
  cacheTtlSecs: CACHE_DEFAULT,
  execute: async function ([fileGid, previewSize = `${DEFAULT_THUMBNAIL_SIZE}`], context) {
    File.setPreviewSize(previewSize);
    const file = await File.find({ context, id: fileGid });
    if (file) {
      return file.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.File);
  },
});

export const Format_File: coda.Format = {
  name: 'File',
  instructions: 'Paste the graphQL GID of the file into the column.',
  formulaName: 'File',
};

// #endregion
