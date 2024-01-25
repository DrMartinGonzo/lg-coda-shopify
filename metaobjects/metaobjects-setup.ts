import * as coda from '@codahq/packs-sdk';

import { IDENTITY_METAOBJECT, OPTIONS_METAOBJECT_STATUS } from '../constants';
import {
  getMetaobjectSyncTableName,
  getMetaobjectSyncTableDynamicUrls,
  syncMetaObjects,
  getMetaobjectSyncTableDisplayUrl,
  autocompleteMetaobjectFieldkeyFromMetaobjectGid,
  getMetaobjectSyncTableSchema,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  getMetaObjectFieldDefinitionsByMetaobjectDefinition,
  deleteMetaObject,
  updateMetaObject,
  formatMetaobjectUpdateInput,
  formatMetaobjectCreateInputInput,
  createMetaObject,
} from './metaobjects-functions';
import { isString } from '../helpers';
import { MetaobjectFieldInput } from '../types/admin.types';
import { formatMetafieldValueForApi } from '../metafields/metafields-functions';

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
  status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    description: 'The status of the metaobject.',
    autocomplete: OPTIONS_METAOBJECT_STATUS,
  }),

  // TODO: We will need multiple InputFormat formulas to help format values for the user
  varArgsValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description: 'The field value.',
  }),
};

export const setupMetaObjects = (pack: coda.PackDefinitionBuilder) => {
  // #region SyncTables
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
        const metaobjectFieldDefinitions = await getMetaObjectFieldDefinitionsByMetaobjectDefinition(
          context.sync.dynamicUrl,
          context
        );

        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;

          const metaobjectGid = update.previousValue.id as string;
          const metaobjectFieldFromKeys = updatedFields.filter((key) => key !== 'handle' && key !== 'status');
          const handle = updatedFields['handle'];
          const status = updatedFields['status'];

          const fields = metaobjectFieldFromKeys.map((fromKey): MetaobjectFieldInput => {
            const value = update.newValue[fromKey] as string;
            const fieldDefinition = metaobjectFieldDefinitions.find((f) => f.key === fromKey);
            if (!fieldDefinition) throw new Error('MetaobjectFieldDefinition not found');
            return {
              key: fromKey,
              value: formatMetafieldValueForApi(fromKey, value, fieldDefinition),
            };
          });

          const metaobjectUpdateInput = formatMetaobjectUpdateInput(handle, status, fields);
          const response = await updateMetaObject(metaobjectGid, metaobjectUpdateInput, context);

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
  // #endregion

  // #region Actions
  // CreateMetaObject Action
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
      {
        ...parameters.status,
        description:
          'The status of the metaobject. Only useful if the metaobject has publishable capabilities. Defaults to DRAFT',
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
    execute: async function ([type, handle, status = 'DRAFT', ...varargs], context) {
      const fields: MetaobjectFieldInput[] = [];
      while (varargs.length > 0) {
        let key: string, value: string;
        // Pull the first set of varargs off the list, and leave the rest.
        [key, value, ...varargs] = varargs;
        fields.push({ key, value });
      }
      const metaobjectCreateInput = formatMetaobjectCreateInputInput(type, handle, status, fields);
      const response = await createMetaObject(metaobjectCreateInput, context);
      return response.body.data.metaobjectCreate.metaobject.id;
    },
  });

  // UpdateMetaObject Action
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
      {
        ...parameters.status,
        description: 'The new status of the metaobject. Only useful if the metaobject has publishable capabilities.',
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
    execute: async function ([metaobjectGid, handle, status, ...varargs], context) {
      const fields: MetaobjectFieldInput[] = [];
      while (varargs.length > 0) {
        let key: string, value: string;
        [key, value, ...varargs] = varargs;
        fields.push({
          key,
          // value should always be a string
          value: isString(value) ? value : JSON.stringify(value),
        });
      }

      const metaobjectUpdateInput = formatMetaobjectUpdateInput(handle, status, fields);
      const response = await updateMetaObject(metaobjectGid, metaobjectUpdateInput, context);
      return response.body.data.metaobjectUpdate.metaobject.id;
    },
  });

  // DeleteMetaObject Action
  pack.addFormula({
    name: 'DeleteMetaObject',
    description: 'Delete a metaobject.',
    parameters: [parameters.metaobjectGID],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([id], context) {
      const response = await deleteMetaObject(id, context);
      return response.body.data.metaobjectDelete.deletedId;
    },
  });
  // #endregion
};
