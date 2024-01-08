import * as coda from '@codahq/packs-sdk';

import {
  createMetaObject,
  deleteMetaObject,
  getMetaobjectSyncTableName,
  getMetaobjectSyncTableDynamicUrls,
  syncMetaObjects,
  getMetaobjectSyncTableDisplayUrl,
  autocompleteMetaobjectFieldkeyFromMetaobjectGid,
  getMetaobjectSyncTableSchema,
  formatMetaobjectFieldForApi,
  updateMetaObject,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  getMetaObjectFieldDefinitionsByMetaobjectDefinition,
} from './metaobjects-functions';
import { IDENTITY_METAOBJECT } from '../constants';
import { getObjectSchemaItemProp, isString } from '../helpers';

const parameters = {
  metaobjectGID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'metaobjectGid',
    description: 'The GraphQL GID of the metaobject.',
  }),
  handle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: 'The handle of the metaobject.',
  }),

  // TODO: We will need multiple InputFormat formulas to help format values for the user
  varArgsValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description: 'The field value.',
  }),
};

export const setupMetaObjects = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    SyncTables
   *===================================================================================================================== */
  // MetaObjects Dynamic SyncTable
  pack.addDynamicSyncTable({
    name: 'Metaobjects',
    description: 'All Metaobjects.',
    identityName: IDENTITY_METAOBJECT,
    listDynamicUrls: getMetaobjectSyncTableDynamicUrls,
    getName: getMetaobjectSyncTableName,
    getDisplayUrl: getMetaobjectSyncTableDisplayUrl,
    getSchema: getMetaobjectSyncTableSchema,
    formula: {
      name: 'SyncMetaObjects',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [],
      execute: syncMetaObjects,
      maxUpdateBatchSize: 10,
      executeUpdate: async function ([], updates, context: coda.SyncExecutionContext) {
        const fieldDefinitions = await getMetaObjectFieldDefinitionsByMetaobjectDefinition(
          context.sync.dynamicUrl,
          context
        );

        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;
          const metaobjectGid = update.previousValue.id as string;
          let handle: string;
          const fields = [];

          updatedFields.forEach((key: string) => {
            const value = update.newValue[key] as string;
            // Edge case: handle
            if (key === 'handle') {
              handle = value;
              return;
            }

            const fieldDefinition = fieldDefinitions.find((f) => f.key === key);
            if (!fieldDefinition) throw new Error('fieldDefinition not found');
            fields.push({
              key,
              value: formatMetaobjectFieldForApi(key, value, fieldDefinition, context.sync.schema),
            });
          });

          await updateMetaObject(metaobjectGid, handle, fields, context);

          // Return previous values merged with new values, assuming there are no side effects
          // TODO: return real data from Shopify
          return {
            ...update.previousValue,
            ...update.newValue,
          };
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
        autocomplete: autocompleteMetaobjectType,
      }),
      {
        ...parameters.handle,
        optional: true,
      },
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The field key (metaobject type must be provided for autocomplete to work).',
        autocomplete: autocompleteMetaobjectFieldkeyFromMetaobjectType,
      }),
      parameters.varArgsValue,
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
      parameters.metaobjectGID,
      {
        ...parameters.handle,
        description: 'The new handle of the metaobject. A blank value will leave the handle unchanged.',
        optional: true,
      },
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The field key (GraphQl GID of the metaobject must be provided for autocomplete to work).',
        autocomplete: autocompleteMetaobjectFieldkeyFromMetaobjectGid,
      }),
      parameters.varArgsValue,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([metaobjectGid, handle, ...varargs], context) {
      const fields = [];
      while (varargs.length > 0) {
        let key: string, value: string;
        [key, value, ...varargs] = varargs;
        fields.push({
          key,
          // value should always be a string
          value: isString(value) ? value : JSON.stringify(value),
        });
      }
      return updateMetaObject(metaobjectGid, handle, fields, context);
    },
  });

  // an action to delete a metaobject
  pack.addFormula({
    name: 'DeleteMetaObject',
    description: 'Delete a metaobject.',
    parameters: [parameters.metaobjectGID],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: deleteMetaObject,
  });
};
