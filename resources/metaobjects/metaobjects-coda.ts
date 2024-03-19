// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';

import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { Identity, OPTIONS_METAOBJECT_STATUS } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { mapMetaFieldToSchemaProperty } from '../../schemas/schema-helpers';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { inputs } from '../../shared-parameters';
import { MetaobjectFieldInput } from '../../types/admin.types';
import { readFragment, readFragmentArray } from '../../utils/graphql';
import {
  capitalizeFirstChar,
  compareByDisplayKey,
  isString,
  retrieveObjectSchemaEffectiveKeys,
} from '../../utils/helpers';
import { AllMetafieldTypeValue } from '../metafields/metafields-constants';
import { formatMetafieldValueForApi } from '../metafields/metafields-functions';
import { MetaobjectWithFields } from './Metaobject.types';
import {
  autocompleteMetaobjectFieldkeyFromMetaobjectId,
  autocompleteMetaobjectFieldkeyFromMetaobjectType,
  autocompleteMetaobjectType,
  createMetaObjectGraphQl,
  deleteMetaObjectGraphQl,
  fetchAllMetaObjectDefinitions,
  fetchSingleMetaObjectDefinition,
  formatMetaobjectCreateInputInput,
  formatMetaobjectForSchemaFromGraphQlApi,
  formatMetaobjectUpdateInput,
  requireMatchingMetaobjectFieldDefinition,
  updateMetaObjectGraphQl,
} from './metaobjects-functions';
import { MetaobjectFieldDefinitionFragment, buildQueryAllMetaObjectsWithFields } from './metaobjects-graphql';

// #endregion

async function getMetaobjectSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const metaobjectDefinition = await fetchSingleMetaObjectDefinition(
    { gid: context.sync.dynamicUrl, includeCapabilities: true, includeFieldDefinitions: true },
    context
  );
  const { displayNameKey } = metaobjectDefinition;
  const fieldDefinitions = readFragment(MetaobjectFieldDefinitionFragment, metaobjectDefinition.fieldDefinitions);
  const isPublishable = metaobjectDefinition.capabilities?.publishable?.enabled;
  let defaultDisplayProperty = 'handle';

  let augmentedSchema = MetaObjectSyncTableBaseSchema;

  if (isPublishable) {
    augmentedSchema.properties['status'] = {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'status',
      description: `The status of the metaobject`,
      mutable: true,
      options: OPTIONS_METAOBJECT_STATUS.filter((s) => s.value !== '*').map((s) => s.value),
      requireForUpdates: true,
    };
  }

  fieldDefinitions.forEach((fieldDefinition) => {
    const name = accents.remove(fieldDefinition.name);
    const property = mapMetaFieldToSchemaProperty(fieldDefinition);
    if (property) {
      property.displayName = fieldDefinition.name;
      augmentedSchema.properties[name] = property;

      if (displayNameKey === fieldDefinition.key) {
        // @ts-ignore
        augmentedSchema.displayProperty = name;
        augmentedSchema.properties[name].required = true;
        // @ts-ignore
        augmentedSchema.featuredProperties[augmentedSchema.featuredProperties.indexOf(defaultDisplayProperty)] = name;
      }
    }
  });

  // @ts-ignore: admin_url should always be the last featured property, regardless of any custom field keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region SyncTables
export const Sync_Metaobjects = coda.makeDynamicSyncTable({
  name: 'Metaobjects',
  description: 'All Metaobjects.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Metaobject,
  defaultAddDynamicColumns: false,
  listDynamicUrls: async function (context) {
    const metaobjectDefinitions = await fetchAllMetaObjectDefinitions({}, context);
    return metaobjectDefinitions.length
      ? metaobjectDefinitions
          .map((definition) => ({
            display: definition.name,
            value: definition.id,
          }))
          .sort(compareByDisplayKey)
      : [];
  },
  getName: async function getMetaobjectSyncTableName(context: coda.SyncExecutionContext) {
    const { type } = await fetchSingleMetaObjectDefinition({ gid: context.sync.dynamicUrl }, context);
    return `Metaobjects_${capitalizeFirstChar(type)}`;
  },
  getDisplayUrl: async function getMetaobjectSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
    const { type } = await fetchSingleMetaObjectDefinition({ gid: context.sync.dynamicUrl }, context);
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

      const { type } =
        prevContinuation?.extraContinuationData ??
        (await fetchSingleMetaObjectDefinition({ gid: context.sync.dynamicUrl }, context));

      // Separate constant fields keys from the custom ones
      const constantKeys = retrieveObjectSchemaEffectiveKeys(MetaObjectSyncTableBaseSchema).concat('status');
      const optionalFieldsKeys = effectivePropertyKeys.filter((key) => !constantKeys.includes(key));

      const payload = {
        query: buildQueryAllMetaObjectsWithFields(optionalFieldsKeys),
        variables: {
          type,
          maxEntriesPerRun,
          includeCapabilities: effectivePropertyKeys.includes('status'),
          includeDefinition: false,
          includeFieldDefinitions: false,
          cursor: prevContinuation?.cursor ?? null,
        },
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<{
        metaobjects: {
          nodes: Array<MetaobjectWithFields>;
          pageInfo: {
            endCursor: string;
            hasNextPage: boolean;
          };
        };
      }>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          extraContinuationData: { type },
          getPageInfo: (data: any) => data.metaobjects?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.metaobjects?.nodes) {
        return {
          result: response.body.data.metaobjects.nodes.map((metaobject) =>
            formatMetaobjectForSchemaFromGraphQlApi(metaobject, context)
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
      const metaobjectDefinition = await fetchSingleMetaObjectDefinition(
        { gid: context.sync.dynamicUrl, includeFieldDefinitions: true },
        context
      );
      const metaobjectFieldDefinitions = readFragmentArray(
        MetaobjectFieldDefinitionFragment,
        metaobjectDefinition.fieldDefinitions
      );

      const jobs = updates.map(async (update) => {
        const { updatedFields } = update;

        const handle = update.newValue['handle'];
        const status = update.newValue['status'];
        const metaobjectGid = idToGraphQlGid(GraphQlResourceName.Metaobject, update.previousValue.id as number);
        const metaobjectFieldFromKeys = updatedFields.filter((key) => key !== 'handle' && key !== 'status');

        const fields = await Promise.all(
          metaobjectFieldFromKeys.map(async (fromKey): Promise<MetaobjectFieldInput> => {
            const value = update.newValue[fromKey] as string;
            const fieldDefinition = requireMatchingMetaobjectFieldDefinition(fromKey, metaobjectFieldDefinitions);

            let formattedValue: string;
            try {
              formattedValue = await formatMetafieldValueForApi(
                value,
                fieldDefinition.type.name as AllMetafieldTypeValue,
                context,
                fieldDefinition.validations
              );
            } catch (error) {
              throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
            }

            return {
              key: fromKey,
              value: formattedValue ?? '',
            };
          })
        );

        const metaobjectUpdateInput = formatMetaobjectUpdateInput(handle, status, fields);
        const response = await updateMetaObjectGraphQl(
          {
            gid: metaobjectGid,
            updateInput: metaobjectUpdateInput,
          },
          context
        );

        return {
          ...update.previousValue,
          ...formatMetaobjectForSchemaFromGraphQlApi(response.body.data.metaobjectUpdate.metaobject, context),
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
    const fields: Array<MetaobjectFieldInput> = [];
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
    const fields: Array<MetaobjectFieldInput> = [];
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
      {
        gid: idToGraphQlGid(GraphQlResourceName.Metaobject, metaobjectId),
        updateInput: metaobjectUpdateInput,
      },
      context
    );

    if (response?.body?.data?.metaobjectUpdate?.metaobject) {
      return formatMetaobjectForSchemaFromGraphQlApi(response.body.data.metaobjectUpdate.metaobject, context);
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
    const response = await deleteMetaObjectGraphQl(
      idToGraphQlGid(GraphQlResourceName.Metaobject, metaobjectId),
      context
    );
    return response.body.data.metaobjectDelete.deletedId;
  },
});
// #endregion
