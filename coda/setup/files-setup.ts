// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FileClient } from '../../Clients/GraphQlApiClientBase';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { DEFAULT_THUMBNAIL_SIZE } from '../../config';
import { CACHE_DEFAULT, OPTIONS_FILE_TYPE, PACK_IDENTITIES, optionValues } from '../../constants';
import { FileModel } from '../../models/graphql/FileModel';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { SyncedFiles } from '../../sync/graphql/SyncedFiles';
import { assertAllowedValue, isNullishOrEmpty } from '../../utils/helpers';
import { inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedFiles(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedFiles({
    context,
    codaSyncParams,
    model: FileModel,
    client: FileClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({ type }: { type?: string }) {
  const invalidMsg: string[] = [];
  if (!isNullishOrEmpty(type) && !assertAllowedValue(type, optionValues(OPTIONS_FILE_TYPE))) {
    invalidMsg.push(`type: ${type}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync Tables
export const Sync_Files = coda.makeSyncTable({
  name: 'Files',
  description: 'Return Files from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.File,
  schema: SyncedFiles.staticSchema,
  formula: {
    name: 'SyncFiles',
    description: '<Help text for the sync formula, not shown to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedFiles.codaParamsMap}
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
    execute: async (codaSyncParams, context) => createSyncedFiles(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedFiles(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
// TODO: make helper function
export const Action_DeleteFile = coda.makeFormula({
  name: `DeleteFile`,
  description: `Delete an existing Shopify File and return \`true\` on success.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.file.gid],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async ([itemId], context) => {
    await FileClient.createInstance(context).delete({ id: itemId });
    return true;
  },
});
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
    const response = await FileClient.createInstance(context).single({ id: fileGid });
    const file = FileModel.createInstance(context, response.body);
    file.previewSize = parseInt(previewSize);
    return file.toCodaRow();
  },
});

export const Format_File: coda.Format = {
  name: 'File',
  instructions: 'Paste the graphQL GID of the file into the column.',
  formulaName: 'File',
};

// #endregion
