// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromMetaobjectRow, Metaobject } from '../../Resources/GraphQl/Metaobject';
import { PACK_IDENTITIES } from '../../constants';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import {
  autocompleteMetaobjectFieldkeyFromMetaobjectId,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  inputs,
} from '../coda-parameters';
import { GraphQlResourceNames } from '../../Resources/types/Resource.types';

// #endregion

// #region SyncTables
export const Sync_Metaobjects = coda.makeDynamicSyncTable({
  name: 'Metaobjects',
  description: 'Return Metaobjects with specified type from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Metaobject,
  defaultAddDynamicColumns: false,
  listDynamicUrls: Metaobject.listDynamicSyncTableUrls,
  getName: Metaobject.getDynamicSyncTableName,
  getDisplayUrl: Metaobject.getDynamicSyncTableDisplayUrl,
  getSchema: async (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) =>
    Metaobject.getDynamicSchema({ context }),
  formula: {
    name: 'SyncMetaObjects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function (params, context) {
      return Metaobject.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Metaobject.syncUpdate(params, updates, context);
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
  resultType: coda.ValueType.Number,
  execute: async function ([type, handle, status = 'DRAFT', ...varargs], context) {
    const metaobjectFields = Metaobject.parseMetaobjectFieldsFromVarArgs(varargs);
    const fromRow: FromMetaobjectRow = {
      row: {
        type,
        handle,
        status,
      },
      metaobjectFields,
    };

    const newMetaobject = new Metaobject({ context, fromRow });
    await newMetaobject.saveAndUpdate();
    return newMetaobject.restId;
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
  // schema: coda.withIdentity(MetaObjectBaseSchema, IdentitiesNew.metaobject),
  schema: MetaObjectSyncTableBaseSchema,
  execute: async function ([metaobjectId, handle, status, ...varargs], context) {
    const metaobjectFields = Metaobject.parseMetaobjectFieldsFromVarArgs(varargs);
    const fromRow: FromMetaobjectRow = {
      row: {
        id: metaobjectId,
        handle,
        status,
      },
      metaobjectFields,
    };

    const updatedMetaobject = new Metaobject({ context, fromRow });
    await updatedMetaobject.saveAndUpdate();
    return updatedMetaobject.formatToRow();
  },
});

export const Action_DeleteMetaObject = coda.makeFormula({
  name: 'DeleteMetaObject',
  description: 'Delete an existing Shopify metaobject and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.metafieldObject.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([metaobjectId], context) {
    await Metaobject.delete({ context, id: idToGraphQlGid(GraphQlResourceNames.Metaobject, metaobjectId) });
    return true;
  },
});
// #endregion
