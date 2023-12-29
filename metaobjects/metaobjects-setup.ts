import * as coda from '@codahq/packs-sdk';

import { MetaObjectSchema } from './metaobjects-schema';
import {
  createMetaObject,
  deleteMetaObject,
  fetchAllMetaObjects,
  fetchMetaObjectFieldDefinition,
  updateMetaObject,
} from './metaobjects-functions';

export const setupMetaObjects = (pack) => {
  /**====================================================================================================================
   *    Formulas
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
        description: 'The id of the metaobject to update.',
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
        autocomplete: async function (context, search, { id, handle }) {
          if (!id || id === '') {
            throw new coda.UserVisibleError(
              'You need to define the ID of the metaobject first before setting the fields.'
            );
          }
          const results = await fetchMetaObjectFieldDefinition(id, context);
          return coda.autocompleteSearchObjects(search, results, 'name', 'key');
        },
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
        description: 'The id of the metaobject to delete.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: deleteMetaObject,
  });

  /**====================================================================================================================
   *    SyncTables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'MetaObjects',
    description: 'All metaobjects.',
    identityName: 'MetaObject',
    schema: MetaObjectSchema,
    formula: {
      name: 'SyncMetaObjects',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'type',
          description: 'The type of metaobject to fetch',
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'objectFieldName',
          description: 'the field to use as display name',
        }),
        coda.makeParameter({
          type: coda.ParameterType.StringArray,
          name: 'additionalFields',
          description: 'additional fields to fetch (defaut is id + name)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'limit',
          description:
            'limit of objects to return for each sync. (all objects will always be fetched, this is just to adjust for Shopify query cost)',
          optional: true,
        }),
      ],
      execute: fetchAllMetaObjects,
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
};
