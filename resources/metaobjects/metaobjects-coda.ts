// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { Identity } from '../../constants';
import { idToGraphQlGid } from '../../helpers-graphql';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { handleDynamicSchemaForCli } from '../../schemas/schema-helpers';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import {
  autocompleteMetaobjectFieldkeyFromMetaobjectId,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  inputs,
} from '../../shared-parameters';
import { readFragment, readFragmentArray } from '../../utils/graphql';
import { MetaobjectGraphQlFetcher } from './MetaobjectGraphQlFetcher';
import { MetaobjectSyncTable } from './MetaobjectSyncTable';
import { fetchSingleMetaObjectDefinition, parseMetaobjectFieldInputsFromVarArgs } from './metaobjects-functions';
import { metaobjectFieldDefinitionFragment, metaobjectFragment } from './metaobjects-graphql';

// #endregion

// #region SyncTables
export const Sync_Metaobjects = coda.makeDynamicSyncTable({
  name: 'Metaobjects',
  description: 'Return Metaobjects with specified type from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Metaobject,
  defaultAddDynamicColumns: false,
  listDynamicUrls: MetaobjectSyncTable.listDynamicUrls,
  getName: MetaobjectSyncTable.getName,
  getDisplayUrl: MetaobjectSyncTable.getDisplayUrl,
  getSchema: MetaobjectSyncTable.getSchema,
  formula: {
    name: 'SyncMetaObjects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function (params, context) {
      const schema = await handleDynamicSchemaForCli(MetaobjectSyncTable.getSchema, context, params);
      const metaobjectFetcher = new MetaobjectGraphQlFetcher(context);
      const metaobjectSyncTable = new MetaobjectSyncTable(metaobjectFetcher, params);
      return metaobjectSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const definition = await fetchSingleMetaObjectDefinition(
        { gid: context.sync.dynamicUrl, includeFieldDefinitions: true },
        context
      );
      const fieldDefinitions = readFragmentArray(metaobjectFieldDefinitionFragment, definition.fieldDefinitions);

      const jobs = updates.map(async (update) => {
        const originalRow = update.previousValue as unknown as MetaobjectRow;
        const updatedRow = Object.fromEntries(
          Object.entries(update.newValue).filter(([key]) => update.updatedFields.includes(key) || key == 'id')
        ) as MetaobjectRow;

        const metaobjectGid = idToGraphQlGid(GraphQlResourceName.Metaobject, originalRow.id);
        const metaobjectFetcher = new MetaobjectGraphQlFetcher(context);
        const metaobjectFieldInputs = await metaobjectFetcher.formatMetaobjectFieldInputs(updatedRow, fieldDefinitions);

        const metaobjectUpdateInput = metaobjectFetcher.formatMetaobjectUpdateInput(updatedRow, metaobjectFieldInputs);
        const response = await metaobjectFetcher.update({
          gid: metaobjectGid,
          updateInput: metaobjectUpdateInput,
        });

        const metaobject = readFragment(metaobjectFragment, response.body.data.metaobjectUpdate.metaobject);
        return {
          ...update.previousValue,
          ...metaobjectFetcher.formatApiToRow(metaobject),
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
export const Action_CreateMetaObject = coda.makeFormula({
  name: 'CreateMetaObject',
  description: 'Create a metaobject.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'type',
      description: 'The type of the metaobject.',
      autocomplete: autocompleteMetaobjectType,
    }),
    {
      ...inputs.metafieldObject.handle,
      optional: true,
    },
    {
      ...inputs.metafieldObject.status,
      description:
        'The status of the metaobject. Only useful if the metaobject has publishable capabilities. Defaults to DRAFT',
      optional: true,
    },
  ],
  varargParameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'key',
      description: 'The metaobject property to update (metaobject type must be provided for autocomplete to work).',
      autocomplete: autocompleteMetaobjectFieldkeyFromMetaobjectType,
    }),
    inputs.general.varArgsPropValue,
  ],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function ([type, handle, status = 'DRAFT', ...varargs], context) {
    let newRow: Omit<MetaobjectRow, 'id'> = {
      handle,
      status,
    };

    const fieldInputs = parseMetaobjectFieldInputsFromVarArgs(varargs);
    const metaobjectFetcher = new MetaobjectGraphQlFetcher(context);
    const metaobjectCreateInput = metaobjectFetcher.formatMetaobjectCreateInput(type, newRow, fieldInputs);

    const response = await metaobjectFetcher.create({ createInput: metaobjectCreateInput });
    return response.body.data.metaobjectCreate.metaobject.id;
  },
});

// TODO: We will need multiple InputFormat formulas to help format values for the user
export const Action_UpdateMetaObject = coda.makeFormula({
  name: 'UpdateMetaObject',
  description: 'Update an existing metaobject and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.metafieldObject.id,
    {
      ...inputs.metafieldObject.handle,
      description: 'The new handle of the metaobject. A blank value will leave the handle unchanged.',
      optional: true,
    },
    {
      ...inputs.metafieldObject.status,
      description: 'The new status of the metaobject. Only useful if the metaobject has publishable capabilities.',
      optional: true,
    },
  ],
  varargParameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'key',
      description:
        'The metaobject property to update (ID of the metaobject must be provided for autocomplete to work).',
      autocomplete: autocompleteMetaobjectFieldkeyFromMetaobjectId,
    }),
    inputs.general.varArgsPropValue,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(MetaObjectBaseSchema, Identity.Metaobject),
  schema: MetaObjectSyncTableBaseSchema,
  execute: async function ([metaobjectId, handle, status, ...varargs], context) {
    let newRow: Omit<MetaobjectRow, 'id'> = {
      handle,
      status,
    };

    const metaobjectGid = idToGraphQlGid(GraphQlResourceName.Metaobject, metaobjectId);
    const fieldInputs = parseMetaobjectFieldInputsFromVarArgs(varargs);
    const metaobjectFetcher = new MetaobjectGraphQlFetcher(context);
    const metaobjectUpdateInput = metaobjectFetcher.formatMetaobjectUpdateInput(newRow, fieldInputs);

    const response = await metaobjectFetcher.update({
      gid: metaobjectGid,
      updateInput: metaobjectUpdateInput,
    });
    if (response?.body?.data?.metaobjectUpdate?.metaobject) {
      const metaobject = readFragment(metaobjectFragment, response.body.data.metaobjectUpdate.metaobject);
      return metaobjectFetcher.formatApiToRow(metaobject);
    }
  },
});

export const Action_DeleteMetaObject = coda.makeFormula({
  name: 'DeleteMetaObject',
  description: 'Delete a metaobject.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.metafieldObject.id],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function ([metaobjectId], context) {
    const metaobjectGid = idToGraphQlGid(GraphQlResourceName.Metaobject, metaobjectId);
    const metaobjectFetcher = new MetaobjectGraphQlFetcher(context);
    const response = await metaobjectFetcher.delete(metaobjectGid);
    return response.body.data.metaobjectDelete.deletedId;
  },
});
// #endregion
