// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetaobjectClient, MetaobjectDefinitionClient } from '../../Clients/GraphQlClients';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { MetaobjectModel } from '../../models/graphql/MetaobjectModel';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { SyncedMetaobjects } from '../../sync/graphql/SyncedMetaobjects';
import { makeDeleteGraphQlResourceAction } from '../utils/coda-utils';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { capitalizeFirstChar, compareByDisplayKey } from '../../utils/helpers';
import {
  autocompleteMetaobjectFieldkeyFromMetaobjectId,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  inputs,
} from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedMetaobjects(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedMetaobjects({
    context,
    codaSyncParams,
    model: MetaobjectModel,
    client: MetaobjectClient.createInstance(context),
  });
}

async function getSyncTableMetaobjectType(context: coda.ExecutionContext) {
  const response = await MetaobjectDefinitionClient.createInstance(context).single({
    id: SyncedMetaobjects.decodeDynamicUrl(context.sync.dynamicUrl).id,
  });
  return response?.body?.type;
}
// #endregion

// #region SyncTables
export const Sync_Metaobjects = coda.makeDynamicSyncTable({
  name: 'Metaobjects',
  description: 'Return Metaobjects with specified type from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Metaobject,
  defaultAddDynamicColumns: false,
  listDynamicUrls: async (context) => {
    const metaobjectDefinitions = await MetaobjectDefinitionClient.createInstance(context).listAllLoop({});
    return metaobjectDefinitions.length
      ? metaobjectDefinitions
          .map((definition) => ({
            display: definition.name,
            /** Use id instead of type as an identifier because
             * its easier to link back to the metaobject dynamic sync table while using {@link getMetaobjectReferenceSchema} */
            value: SyncedMetaobjects.encodeDynamicUrl(definition),
          }))
          .sort(compareByDisplayKey)
      : [];
  },
  getName: async function (context) {
    const type = await getSyncTableMetaobjectType(context);
    return `${capitalizeFirstChar(type)} Metaobjects`;
  },
  getDisplayUrl: async function (context) {
    const type = await getSyncTableMetaobjectType(context);
    return `${context.endpoint}/admin/content/entries/${type}`;
  },
  getSchema: async (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) =>
    SyncedMetaobjects.getDynamicSchema({ context }),
  formula: {
    name: 'SyncMetaObjects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async (codaSyncParams, context) => createSyncedMetaobjects(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedMetaobjects(codaSyncParams, context).executeSyncUpdate(updates),
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
      ...inputs.metaobject.handle,
      optional: true,
    },
    {
      ...inputs.metaobject.status,
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
    inputs.metaobject.varArgsPropValue,
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function ([type, handle, status = 'DRAFT', ...varargs], context) {
    const row: MetaobjectRow = {
      id: undefined,
      type,
      handle,
      status,
    };
    const customFields = MetaobjectModel.parseCustomFieldsFromVarArgs(varargs);

    const metaobject = MetaobjectModel.createInstanceFromRow(context, row);
    metaobject.setCustomFields(customFields);
    await metaobject.save();
    return metaobject.restId;
  },
});

export const Action_UpdateMetaObject = coda.makeFormula({
  name: 'UpdateMetaObject',
  description: 'Update an existing metaobject and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.metaobject.id,
    {
      ...inputs.metaobject.handle,
      description: 'The new handle of the metaobject. A blank value will leave the handle unchanged.',
      optional: true,
    },
    {
      ...inputs.metaobject.status,
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
    inputs.metaobject.varArgsPropValue,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(MetaObjectBaseSchema, IdentitiesNew.metaobject),
  schema: MetaObjectSyncTableBaseSchema,
  execute: async function ([metaobjectId, handle, status, ...varargs], context) {
    const row: MetaobjectRow = {
      id: metaobjectId,
      handle,
      status,
    };
    const customFields = MetaobjectModel.parseCustomFieldsFromVarArgs(varargs);

    const metaobject = MetaobjectModel.createInstanceFromRow(context, row);
    metaobject.setCustomFields(customFields);
    await metaobject.save();
    return metaobject.toCodaRow();
  },
});

export const Action_DeleteMetaObject = makeDeleteGraphQlResourceAction({
  modelName: MetaobjectModel.displayName,
  IdParameter: inputs.metaobject.id,
  execute: async ([itemId], context) => {
    await MetaobjectClient.createInstance(context).delete({
      id: idToGraphQlGid(GraphQlResourceNames.Metaobject, itemId as number),
    });
    return true;
  },
});
// #endregion
