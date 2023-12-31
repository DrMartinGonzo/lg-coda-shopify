import * as coda from '@codahq/packs-sdk';

import { FileSchema } from './files-schema';
import { syncAllFiles, deleteFile } from './files-functions';
import { IDENTITY_FILE, OPTIONS_FILE_TYPE } from '../constants';
import { sharedParameters } from '../shared-parameters';

export const setupFiles = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  // Sync all Shopify files
  pack.addSyncTable({
    name: 'Files',
    description: 'Sync all Shopify files',
    identityName: IDENTITY_FILE,
    schema: FileSchema,

    formula: {
      name: 'SyncFiles',
      description: '<Help text for the sync formula, not shown to the user>',
      parameters: [
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'type',
          description: 'Return only files of the specific type',
          optional: true,
          autocomplete: OPTIONS_FILE_TYPE,
        }),
      ],
      execute: syncAllFiles,
    },
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // Delete single File
  pack.addFormula({
    name: 'DeleteFile',
    description: 'Delete file.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'id',
        description: 'The GraphQl ID of the file to delete.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: deleteFile,
  });
};
