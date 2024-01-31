import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';

import { capitalizeFirstChar, getObjectSchemaItemProp } from '../helpers';
import {
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  graphQlGidToId,
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { CACHE_DAY, CACHE_SINGLE_FETCH, OPTIONS_METAOBJECT_STATUS } from '../constants';
import {
  buildQueryAllMetaObjectsWithFields,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  queryMetaObjectFieldDefinitions,
  queryMetaObjectFieldDefinitionsFromMetaobjectDefinition,
  queryMetaobjectDefinitionsByType,
  queryMetaobjectDynamicUrls,
  queryMetaobjectTypes,
  querySyncTableDetails,
  updateMetaobjectMutation,
} from './metaobjects-graphql';
import { mapMetaFieldToSchemaProperty } from './metaobjects-schema';
import { formatMetaFieldValueForSchema } from '../metafields/metafields-functions';

import { SyncTableGraphQlContinuation } from '../types/tableSync';
import type {
  MetaobjectCreateInput,
  MetaobjectDefinition,
  MetaobjectFieldDefinition,
  MetaobjectFieldInput,
  MetaobjectStatus,
  MetaobjectUpdateInput,
} from '../types/admin.types';
import { MetaobjectFieldDefinitionFieldsFragment } from '../types/admin.generated';

// #region Autocomplete functions
export async function autocompleteMetaobjectFieldkeyFromMetaobjectGid(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.metaobjectGid || args.metaobjectGid === '') {
    throw new coda.UserVisibleError(
      'You need to define the GraphQl GID of the metaobject first for autocomplete to work.'
    );
  }
  const results = await getMetaObjectFieldDefinitionsByMetaobject(args.metaobjectGid, context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'key');
}
export async function autocompleteMetaobjectFieldkeyFromMetaobjectType(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.type || args.type === '') {
    throw new coda.UserVisibleError('You need to define the type of the metaobject first for autocomplete to work.');
  }
  const results = await getMetaObjectFieldDefinitionsByType(args.type, context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'key');
}
export async function autocompleteMetaobjectType(context: coda.ExecutionContext, search: string, args: any) {
  const results = await getMetaObjectTypes(context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'type');
}
// #endregion

// #region Formatting functions
export function formatMetaobjectUpdateInput(
  handle: string,
  status: string,
  metaobjectFieldInput: MetaobjectFieldInput[]
): MetaobjectUpdateInput {
  const metaobjectUpdateInput: MetaobjectUpdateInput = {};

  if (handle && handle !== '') {
    metaobjectUpdateInput.handle = handle;
  }
  if (status && status !== '') {
    metaobjectUpdateInput.capabilities = { publishable: { status: status as MetaobjectStatus } };
  }
  if (metaobjectFieldInput && metaobjectFieldInput.length) {
    metaobjectUpdateInput.fields = metaobjectFieldInput;
  }

  return metaobjectUpdateInput;
}

export function formatMetaobjectCreateInputInput(
  type: string,
  handle: string,
  status: string,
  metaobjectFieldInput: MetaobjectFieldInput[]
): MetaobjectCreateInput {
  const metaobjectCreateInput: MetaobjectCreateInput = { type };

  if (handle && handle !== '') {
    metaobjectCreateInput.handle = handle;
  }
  if (status && status !== '') {
    metaobjectCreateInput.capabilities = { publishable: { status: status as MetaobjectStatus } };
  }
  if (metaobjectFieldInput && metaobjectFieldInput.length) {
    metaobjectCreateInput.fields = metaobjectFieldInput;
  }

  return metaobjectCreateInput;
}

function formatMetaobjectForSchemaFromGraphQlApi(
  node: any,
  type: string,
  optionalFieldsKeys: string[],
  fieldDefinitions: MetaobjectFieldDefinitionFieldsFragment[],
  context: coda.SyncExecutionContext
) {
  let data = {
    ...node,
    admin_url: `${context.endpoint}/admin/content/entries/${type}/${graphQlGidToId(node.id)}`,
    status: node.capabilities?.publishable?.status,
  };

  optionalFieldsKeys
    // edge case for handle field
    .filter((k) => k !== 'handle')
    .forEach((key) => {
      if (!node[key]) return;

      // check if node[key] has 'value' property
      const value = node[key].hasOwnProperty('value') ? node[key].value : node[key];

      const schemaItemProp = getObjectSchemaItemProp(context.sync.schema, key);
      const fieldDefinition = fieldDefinitions.find((f) => f.key === key);
      if (!fieldDefinition) throw new Error('MetaobjectFieldDefinition not found');

      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        // console.log('not a parsable json string');
      }

      data[key] =
        schemaItemProp.type === coda.ValueType.Array && Array.isArray(parsedValue)
          ? parsedValue.map((v) => formatMetaFieldValueForSchema(v, fieldDefinition))
          : formatMetaFieldValueForSchema(parsedValue, fieldDefinition);
    });

  return data;
}
// #endregion

// #region Dynamic SyncTable definition functions
// TODO: fetch all and not only first 20
export async function getMetaobjectSyncTableDynamicUrls(context: coda.SyncExecutionContext) {
  const payload = {
    query: queryMetaobjectDynamicUrls,
    variables: {
      cursor: context.sync.continuation,
    },
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
}

export async function getMetaobjectSyncTableName(context: coda.SyncExecutionContext) {
  const { type } = await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context);
  return `Metaobjects_${capitalizeFirstChar(type)}`;
}

export async function getMetaobjectSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
  const { type } = await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context);
  return `${context.endpoint}/admin/content/entries/${type}`;
}

export async function getMetaobjectSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const { type } = await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context);

  const metaobjectDefinition = await getMetaObjectDefinitionByType(type, context);
  const { displayNameKey, fieldDefinitions } = metaobjectDefinition;
  const isPublishable = metaobjectDefinition.capabilities?.publishable?.enabled;
  let displayProperty = 'graphql_gid';

  const properties: coda.ObjectSchemaProperties = {
    graphql_gid: { type: coda.ValueType.String, fromKey: 'id', required: true },
    handle: { type: coda.ValueType.String, required: true, mutable: true },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metaobject in the Shopify admin.',
    },
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

  const featuredProperties = ['graphql_gid', 'handle'];

  fieldDefinitions.forEach((fieldDefinition) => {
    const name = accents.remove(fieldDefinition.name);
    properties[name] = mapMetaFieldToSchemaProperty(fieldDefinition);

    if (displayNameKey === fieldDefinition.key) {
      displayProperty = name;
      properties[name].required = true;
      featuredProperties.unshift(displayProperty);
    }
  });

  featuredProperties.push('admin_url');
  return coda.makeObjectSchema({
    properties,
    displayProperty,
    idProperty: 'graphql_gid',
    featuredProperties,
  });
}
// #endregion

// #region Metaobject types
// TODO: fetch all and not only first 20
export async function getMetaObjectTypes(context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaobjectTypes,
    variables: {
      cursor: undefined,
    },
  };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinitions.nodes.map((node) => {
    return {
      name: node.name,
      type: node.type,
    };
  });
}

// TODO: maybe return type directly and rename to getMetaObjectTypeFromMetaobjectDefinition
export async function getMetaobjectSyncTableDetails(
  metaobjectDefinitionId: string,
  context: coda.SyncExecutionContext
) {
  const payload = { query: querySyncTableDetails, variables: { id: metaobjectDefinitionId } };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_DAY }, context);

  const { data } = response.body;
  return {
    type: data.metaobjectDefinition.type,
  };
}
// #endregion

// #region Metaobject definitions
export async function getMetaObjectDefinitionByType(
  type: string,
  context: coda.ExecutionContext
): Promise<MetaobjectDefinition> {
  const payload = {
    query: queryMetaobjectDefinitionsByType,
    variables: {
      type,
    },
  };

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinitionByType;
}
// #endregion

// #region Field definitions
export async function getMetaObjectFieldDefinitionsByMetaobjectDefinition(
  metaObjectDefinitionGid: string,
  context: coda.ExecutionContext
): Promise<MetaobjectFieldDefinitionFieldsFragment[]> {
  const payload = {
    query: queryMetaObjectFieldDefinitionsFromMetaobjectDefinition,
    variables: {
      id: metaObjectDefinitionGid,
    },
  };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinition.fieldDefinitions;
}

export async function getMetaObjectFieldDefinitionsByMetaobject(
  metaObjectGid: string,
  context: coda.ExecutionContext
): Promise<MetaobjectFieldDefinitionFieldsFragment[]> {
  const payload = {
    query: queryMetaObjectFieldDefinitions,
    variables: {
      id: metaObjectGid,
    },
  };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobject.definition.fieldDefinitions;
}

export async function getMetaObjectFieldDefinitionsByType(
  type: string,
  context: coda.ExecutionContext
): Promise<MetaobjectFieldDefinitionFieldsFragment[]> {
  const metaobjectDefinitionByType = await getMetaObjectDefinitionByType(type, context);
  return metaobjectDefinitionByType.fieldDefinitions;
}
// #endregion

// #region Metaobject functions
export const updateMetaObject = async (
  metaobjectGid: string,
  metaobjectUpdateInput: MetaobjectUpdateInput,
  context: coda.ExecutionContext
) => {
  const payload = {
    query: updateMetaobjectMutation,
    variables: {
      id: metaobjectGid,
      metaobject: metaobjectUpdateInput,
    },
  };
  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.metaobjectUpdate.userErrors },
    context
  );
  return response;
};

export const createMetaObject = async (
  metaobjectCreateInput: MetaobjectCreateInput,
  context: coda.ExecutionContext
) => {
  const payload = {
    query: createMetaobjectMutation,
    variables: {
      metaobject: metaobjectCreateInput,
    },
  };
  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.metaobjectCreate.userErrors },
    context
  );
  return response;
};

export const deleteMetaObject = async (id: string, context: coda.ExecutionContext) => {
  const payload = {
    query: deleteMetaobjectMutation,
    variables: {
      id,
    },
  };

  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.metaobjectDelete.userErrors },
    context
  );
  return response;
};
// #endregion

// #region Pack functions
export const syncMetaObjects = async ([], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
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
    prevContinuation?.extraContinuationData ?? (await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context));
  const fieldDefinitions =
    prevContinuation?.extraContinuationData?.fieldDefinitions ??
    (await getMetaObjectFieldDefinitionsByMetaobjectDefinition(context.sync.dynamicUrl, context));

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
};
// #endregion
