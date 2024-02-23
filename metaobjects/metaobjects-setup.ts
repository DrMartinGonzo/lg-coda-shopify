// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';

import { IDENTITY_METAOBJECT, OPTIONS_METAOBJECT_STATUS } from '../constants';
import { AllMetafieldTypeValue } from '../types/Metafields';
import {
  autocompleteMetaobjectFieldkeyFromMetaobjectGid,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  fetchMetaObjectFieldDefinitionsByMetaobjectDefinition,
  deleteMetaObjectGraphQl,
  updateMetaObjectGraphQl,
  formatMetaobjectUpdateInput,
  formatMetaobjectCreateInputInput,
  createMetaObjectGraphQl,
  formatMetaobjectForSchemaFromGraphQlApi,
  fetchSingleMetaObjectDefinitionById,
} from './metaobjects-functions';
import { capitalizeFirstChar, isString } from '../helpers';
import { MetaobjectFieldInput } from '../types/admin.types';
import { formatMetafieldValueForApi, mapMetaFieldToSchemaProperty } from '../metafields/metafields-functions';
import { MetaObjectBaseSchema } from '../schemas/syncTable/MetaObjectSchema';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  idToGraphQlGid,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { buildQueryAllMetaObjectsWithFields, queryAllMetaobjectDefinitions } from './metaobjects-graphql';
import { GetMetaobjectDefinitionsQueryVariables } from '../types/admin.generated';
import { sharedParameters } from '../shared-parameters';
import { GraphQlResource } from '../types/RequestsGraphQl';

// #endregion

async function getMetaobjectSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const metaobjectDefinition = await fetchSingleMetaObjectDefinitionById(context.sync.dynamicUrl, true, true, context);
  const { displayNameKey, fieldDefinitions } = metaobjectDefinition;
  const isPublishable = metaobjectDefinition.capabilities?.publishable?.enabled;
  let displayProperty = 'handle';

  const properties: coda.ObjectSchemaProperties = {
    ...MetaObjectBaseSchema.properties,
  };
  if (isPublishable) {
    properties['status'] = {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'status',
      description: `The status of the metaobject`,
      mutable: true,
      options: OPTIONS_METAOBJECT_STATUS.filter((s) => s.value !== '*').map((s) => s.value),
      requireForUpdates: true,
    };
  }

  const featuredProperties = ['id', 'handle'];

  fieldDefinitions.forEach((fieldDefinition) => {
    const name = accents.remove(fieldDefinition.name);
    const property = mapMetaFieldToSchemaProperty(fieldDefinition);
    if (property) {
      property.displayName = fieldDefinition.name;
      properties[name] = property;

      if (displayNameKey === fieldDefinition.key) {
        displayProperty = name;
        properties[name].required = true;
        featuredProperties.unshift(displayProperty);
      }
    }
  });

  featuredProperties.push('admin_url');
  return coda.makeObjectSchema({
    properties,
    displayProperty,
    idProperty: MetaObjectBaseSchema.idProperty,
    featuredProperties,
  });
}

const parameters = {
  metaobjectID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'metaobjectId',
    description: 'The ID of the metaobject.',
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
};

// #region SyncTables
export const Sync_Metaobjects = coda.makeDynamicSyncTable({
  name: 'Metaobjects',
  description: 'All Metaobjects.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_METAOBJECT,
  defaultAddDynamicColumns: false,
  // TODO: fetch all and not only first 20
  listDynamicUrls: async function getMetaobjectSyncTableDynamicUrls(context: coda.SyncExecutionContext) {
    const payload = {
      query: queryAllMetaobjectDefinitions,
      variables: {
        cursor: context.sync.continuation as unknown as string,
        batchSize: 20,
        includeCapabilities: false,
        includeFieldDefinitions: false,
      } as GetMetaobjectDefinitionsQueryVariables,
    };

    const { response } = await makeGraphQlRequest({ payload }, context);

    const metaobjectDefinitions = response.body.data.metaobjectDefinitions.nodes;
    if (metaobjectDefinitions) {
      return (
        metaobjectDefinitions
          // .sort(sortUpdatedAt)
          .map((definition) => ({
            display: definition.name,
            value: definition.id,
          }))
      );
    }
  },
  getName: async function getMetaobjectSyncTableName(context: coda.SyncExecutionContext) {
    const { type } = await fetchSingleMetaObjectDefinitionById(context.sync.dynamicUrl, false, false, context);
    return `Metaobjects_${capitalizeFirstChar(type)}`;
  },
  getDisplayUrl: async function getMetaobjectSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
    const { type } = await fetchSingleMetaObjectDefinitionById(context.sync.dynamicUrl, false, false, context);
    return `${context.endpoint}/admin/content/entries/${type}`;
  },
  getSchema: getMetaobjectSyncTableSchema,
  formula: {
    name: 'SyncMetaObjects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function ([], context) {
      const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
      // TODO: get an approximation for first run by using count of relation columns ?
      const defaultMaxEntriesPerRun = 50;
      const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        defaultMaxEntriesPerRun,
        prevContinuation,
        context
      );
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
      }

      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);

      // TODO: get type & fieldDefinitions in one GraphQL call
      const { type } =
        prevContinuation?.extraContinuationData ??
        (await fetchSingleMetaObjectDefinitionById(context.sync.dynamicUrl, false, false, context));
      const fieldDefinitions =
        prevContinuation?.extraContinuationData?.fieldDefinitions ??
        (await fetchMetaObjectFieldDefinitionsByMetaobjectDefinition(context.sync.dynamicUrl, context));

      // TODO: separate 'metafields' keys from others
      const constantFieldsKeys = ['id']; // will always be fetched
      const nonFieldKeys = ['status']; // will always be fetched
      // TODO, like with field dependencies, we should have an array below each schema defining the things that can be queried via graphql, with maybe a translation of keys between rest and graphql …
      const calculatedKeys = ['admin_url']; // will never be fetched
      const optionalFieldsKeys = effectivePropertyKeys.filter(
        (key) => !constantFieldsKeys.includes(key) && !calculatedKeys.includes(key) && !nonFieldKeys.includes(key)
      );

      const payload = {
        query: buildQueryAllMetaObjectsWithFields(optionalFieldsKeys),
        variables: {
          type: type,
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
        },
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          extraContinuationData: { type, fieldDefinitions },
          getPageInfo: (data: any) => data.metaobjects?.pageInfo,
        },
        context
      );
      if (response && response.body.data?.metaobjects) {
        const data = response.body.data;
        return {
          result: data.metaobjects.nodes.map((metaobject) =>
            formatMetaobjectForSchemaFromGraphQlApi(metaobject, type, optionalFieldsKeys, fieldDefinitions, context)
          ),
          continuation,
        };
      } else {
        return {
          result: [],
          continuation,
        };
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function ([], updates, context: coda.SyncExecutionContext) {
      const metaobjectFieldDefinitions = await fetchMetaObjectFieldDefinitionsByMetaobjectDefinition(
        context.sync.dynamicUrl,
        context
      );

      const jobs = updates.map(async (update) => {
        const { updatedFields } = update;

        const metaobjectGid = idToGraphQlGid(GraphQlResource.Metaobject, update.previousValue.id as number);
        const metaobjectFieldFromKeys = updatedFields.filter((key) => key !== 'handle' && key !== 'status');
        const handle = updatedFields['handle'];
        const status = updatedFields['status'];

        const fields = metaobjectFieldFromKeys.map((fromKey): MetaobjectFieldInput => {
          const value = update.newValue[fromKey] as string;
          const fieldDefinition = metaobjectFieldDefinitions.find((f) => f.key === fromKey);
          if (!fieldDefinition) throw new Error('MetaobjectFieldDefinition not found');

          let formattedValue;
          try {
            formattedValue = formatMetafieldValueForApi(
              value,
              fieldDefinition.type.name as AllMetafieldTypeValue,
              fieldDefinition.validations
            );
          } catch (error) {
            throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
          }

          return {
            key: fromKey,
            value: formattedValue,
          };
        });

        const metaobjectUpdateInput = formatMetaobjectUpdateInput(handle, status, fields);
        const response = await updateMetaObjectGraphQl(metaobjectGid, metaobjectUpdateInput, context);

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
      description: 'The metaobject property to update (metaobject type must be provided for autocomplete to work).',
      autocomplete: autocompleteMetaobjectFieldkeyFromMetaobjectType,
    }),
    sharedParameters.varArgsPropValue,
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
    const response = await createMetaObjectGraphQl(metaobjectCreateInput, context);
    return response.body.data.metaobjectCreate.metaobject.id;
  },
});

export const Action_UpdateMetaObject = coda.makeFormula({
  name: 'UpdateMetaObject',
  // TODO: return full metaobject data upon update
  description: 'Update a metaobject. Returns metaobject ID when successful.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    parameters.metaobjectID,
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
      description:
        'The metaobject property to update (ID of the metaobject must be provided for autocomplete to work).',
      autocomplete: autocompleteMetaobjectFieldkeyFromMetaobjectGid,
    }),
    sharedParameters.varArgsPropValue,
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function ([metaobjectId, handle, status, ...varargs], context) {
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
    const response = await updateMetaObjectGraphQl(
      idToGraphQlGid(GraphQlResource.Metaobject, metaobjectId),
      metaobjectUpdateInput,
      context
    );

    if (response?.body?.data?.metaobjectUpdate?.metaobject?.id) {
      return graphQlGidToId(response.body.data.metaobjectUpdate.metaobject.id);
    }
  },
});

export const Action_DeleteMetaObject = coda.makeFormula({
  name: 'DeleteMetaObject',
  description: 'Delete a metaobject.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.metaobjectID],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function ([metaobjectId], context) {
    const response = await deleteMetaObjectGraphQl(idToGraphQlGid(GraphQlResource.Metaobject, metaobjectId), context);
    return response.body.data.metaobjectDelete.deletedId;
  },
});
// #endregion
