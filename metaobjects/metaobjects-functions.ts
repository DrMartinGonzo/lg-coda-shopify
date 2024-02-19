import * as coda from '@codahq/packs-sdk';

import { makeGraphQlRequest, graphQlGidToId, idToGraphQlGid } from '../helpers-graphql';
import { CACHE_SINGLE_FETCH, IDENTITY_METAOBJECT, PACK_ID } from '../constants';
import {
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  queryAllMetaobjectDefinitions,
  queryMetaObjectFieldDefinitions,
  queryMetaObjectDefinitionFieldDefinitions,
  queryMetaobjectDefinition,
  queryMetaobjectDefinitionByType,
  updateMetaobjectMutation,
} from './metaobjects-graphql';
import { formatMetaFieldValueForSchema } from '../metafields/metafields-functions';

import type {
  MetaobjectCreateInput,
  MetaobjectDefinition,
  MetaobjectFieldInput,
  MetaobjectStatus,
  MetaobjectUpdateInput,
} from '../types/admin.types';
import {
  GetMetaobjectDefinitionByTypeQueryVariables,
  GetMetaobjectDefinitionQueryVariables,
  GetMetaobjectDefinitionsQueryVariables,
  MetaobjectDefinitionFragment,
  MetaobjectFieldDefinitionFragment,
} from '../types/admin.generated';
import { GraphQlResource } from '../types/GraphQl';

// #region Autocomplete functions
export async function autocompleteMetaobjectFieldkeyFromMetaobjectGid(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.metaobjectId || args.metaobjectId === '') {
    throw new coda.UserVisibleError('You need to provide the ID of the metaobject first for autocomplete to work.');
  }
  const results = await getMetaObjectFieldDefinitionsByMetaobject(
    idToGraphQlGid(GraphQlResource.Metaobject, args.metaobjectId),
    context
  );
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
  const { fieldDefinitions } = await getMetaObjectDefinitionByType(args.type, false, true, context);
  return coda.autocompleteSearchObjects(search, fieldDefinitions, 'name', 'key');
}
export async function autocompleteMetaobjectType(context: coda.ExecutionContext, search: string, args: any) {
  const results = await getMetaObjectTypes(context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'type');
}
// #endregion

// #region Helpers
export function getMetaobjectReferenceSchema(fieldDefinition) {
  const metaobjectReferenceDefinitionId = fieldDefinition.validations.find(
    (v) => v.name === 'metaobject_definition_id'
  )?.value;

  return coda.makeObjectSchema({
    codaType: coda.ValueHintType.Reference,
    properties: {
      id: { type: coda.ValueType.Number, required: true },
      handle: { type: coda.ValueType.String, required: true },
    },
    displayProperty: 'handle',
    idProperty: 'id',
    identity: {
      packId: PACK_ID,
      name: IDENTITY_METAOBJECT,
      dynamicUrl: metaobjectReferenceDefinitionId,
    },
  });
}

// TODO: fetch all and not only first 20
async function getMetaObjectTypes(context: coda.ExecutionContext) {
  const payload = {
    query: queryAllMetaobjectDefinitions,
    variables: {
      cursor: undefined,
      batchSize: 20,
      includeCapabilities: false,
      includeFieldDefinitions: false,
    } as GetMetaobjectDefinitionsQueryVariables,
  };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinitions.nodes.map((node) => {
    return {
      name: node.name,
      type: node.type,
    };
  });
}

export async function getMetaObjectDefinitionById(
  metaobjectDefinitionGid: string,
  includeCapabilities = true,
  includeFieldDefinitions = true,
  context: coda.ExecutionContext
): Promise<MetaobjectDefinitionFragment> {
  const payload = {
    query: queryMetaobjectDefinition,
    variables: {
      id: metaobjectDefinitionGid,
      includeCapabilities,
      includeFieldDefinitions,
    } as GetMetaobjectDefinitionQueryVariables,
  };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinition;
}

async function getMetaObjectDefinitionByType(
  type: string,
  includeCapabilities = true,
  includeFieldDefinitions = true,
  context: coda.ExecutionContext
): Promise<MetaobjectDefinition> {
  const payload = {
    query: queryMetaobjectDefinitionByType,
    variables: {
      type,
      includeCapabilities,
      includeFieldDefinitions,
    } as GetMetaobjectDefinitionByTypeQueryVariables,
  };

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinitionByType;
}

export async function getMetaObjectFieldDefinitionsByMetaobjectDefinition(
  metaObjectDefinitionGid: string,
  context: coda.ExecutionContext
): Promise<MetaobjectFieldDefinitionFragment[]> {
  const payload = {
    query: queryMetaObjectDefinitionFieldDefinitions,
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
): Promise<MetaobjectFieldDefinitionFragment[]> {
  const payload = {
    query: queryMetaObjectFieldDefinitions,
    variables: {
      id: metaObjectGid,
    },
  };
  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobject.definition.fieldDefinitions;
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

export function formatMetaobjectForSchemaFromGraphQlApi(
  node: any,
  type: string,
  optionalFieldsKeys: string[],
  fieldDefinitions: MetaobjectFieldDefinitionFragment[],
  context: coda.SyncExecutionContext
) {
  let data = {
    ...node,
    id: graphQlGidToId(node.id),
    admin_graphql_api_id: node.id,
    admin_url: `${context.endpoint}/admin/content/entries/${type}/${graphQlGidToId(node.id)}`,
    status: node.capabilities?.publishable?.status,
  };

  optionalFieldsKeys
    // edge case for handle field
    .filter((k) => k !== 'handle')
    .forEach((key) => {
      if (!node[key]) return;
      const fieldDefinition = fieldDefinitions.find((f) => f.key === key);
      if (!fieldDefinition) throw new Error('MetaobjectFieldDefinition not found');

      // check if node[key] has 'value' property
      const value = node[key].hasOwnProperty('value') ? node[key].value : node[key];
      data[key] = formatMetaFieldValueForSchema({ value, type: fieldDefinition.type.name });
    });

  return data;
}
// #endregion

// #region GraphQl requests
export const updateMetaObjectGraphQl = async (
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

export const createMetaObjectGraphQl = async (
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

export const deleteMetaObjectGraphQl = async (id: string, context: coda.ExecutionContext) => {
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
