import * as coda from '@codahq/packs-sdk';

import {
  createMetaObject,
  deleteMetaObject,
  getMetaobjectSyncTableName,
  listMetaobjectDynamicUrls,
  updateMetaObject,
  fetchAllMetaObjects,
  getMetaobjectSyncTableDisplayUrl,
  autocompleteMetaobjectFieldkey,
  getMetaobjectSyncTableSchema,
} from './metaobjects-functions';
import { IDENTITY_METAOBJECT_NEW } from '../constants';
import { sharedParameters } from '../shared-parameters';

export const setupMetaObjects = (pack) => {
  /**====================================================================================================================
   *    SyncTables
   *===================================================================================================================== */
  // MetaObjects Dynamic SyncTable
  pack.addDynamicSyncTable({
    name: 'Metaobjects',
    description: 'All Metaobjects.',
    identityName: IDENTITY_METAOBJECT_NEW,
    listDynamicUrls: listMetaobjectDynamicUrls,
    getName: getMetaobjectSyncTableName,
    getDisplayUrl: getMetaobjectSyncTableDisplayUrl,
    getSchema: getMetaobjectSyncTableSchema,
    formula: {
      name: 'SyncMetaObjects',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [sharedParameters.maxEntriesPerRun],
      execute: fetchAllMetaObjects,
    },
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // An action to create a metaobject
  pack.addFormula({
    name: 'CreateMetaObject',
    description: 'Create a metaobject.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'type',
        description: 'The type of the metaobject.',
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the field.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'the field value.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: createMetaObject,
  });

  // an action to update a metaobject
  pack.addFormula({
    name: 'UpdateMetaObject',
    description: 'Update a metaobject.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'id',
        description: 'The GraphQl ID of the metaobject to update.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'handle',
        description: 'The new handle of the metaobject. A blank value will leave the handle unchanged.',
        optional: true,
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the field.',
        autocomplete: async (context, search, { id }) => autocompleteMetaobjectFieldkey(id, context, search),
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'the field value.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: updateMetaObject,
  });

  // an action to delete a metaobject
  pack.addFormula({
    name: 'DeleteMetaObject',
    description: 'Delete a metaobject.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'id',
        description: 'The GraphQl ID of the metaobject to delete.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: deleteMetaObject,
  });
};
