import * as coda from '@codahq/packs-sdk';

import { makeGraphQlRequest, graphQlGidToId, idToGraphQlGid } from '../helpers-graphql';
import { CACHE_DEFAULT, METAOBJECT_CUSTOM_FIELD_PREFIX_KEY } from '../constants';
import {
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  buildUpdateMetaObjectMutation,
  buildQuerySingleMetaObjectWithFields,
} from './metaobjects-graphql';
import { formatMetaFieldValueForSchema, shouldUpdateSyncTableMetafieldValue } from '../metafields/metafields-functions';

import type {
  MetaobjectCreateInput,
  MetaobjectFieldInput,
  MetaobjectStatus,
  MetaobjectUpdateInput,
} from '../types/admin.types';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { FetchRequestOptions } from '../types/Requests';
import { MetaobjectFragment } from '../types/Metaobject';
import {
  fetchAllMetaObjectDefinitions,
  fetchSingleMetaObjectDefinitionByType,
} from '../metaobjectDefinitions/metaobjectDefinitions-functions';

// #region Autocomplete functions
export async function autocompleteMetaobjectFieldkeyFromMetaobjectId(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.metaobjectId || args.metaobjectId === '') {
    throw new coda.UserVisibleError('You need to provide the ID of the metaobject first for autocomplete to work.');
  }
  const response = await fetchSingleMetaObjectGraphQl(
    {
      gid: idToGraphQlGid(GraphQlResource.Metaobject, args.metaobjectId),
      includeFieldDefinitions: true,
    },
    context
  );
  return coda.autocompleteSearchObjects(search, response?.definition?.fieldDefinitions, 'name', 'key');
}
export async function autocompleteMetaobjectFieldkeyFromMetaobjectType(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.type || args.type === '') {
    throw new coda.UserVisibleError('You need to define the type of the metaobject first for autocomplete to work.');
  }
  const { fieldDefinitions } = await fetchSingleMetaObjectDefinitionByType(args.type, false, true, context);
  return coda.autocompleteSearchObjects(search, fieldDefinitions, 'name', 'key');
}
export async function autocompleteMetaobjectType(context: coda.ExecutionContext, search: string, args: any) {
  const metaobjectDefinitions = await fetchAllMetaObjectDefinitions({}, context);
  return coda.autocompleteSearchObjects(search, metaobjectDefinitions, 'name', 'type');
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

/**
 * Format Metaobject date obtained via Graphql Admin API for Coda schema
 * @param node
 * @param fieldDefinitions
 * @param context
 * @param schemaWithIdentity wether the data will be consumed by an action wich results use a coda.withIdentity schema. Useful to prevent breaking existing relations
 * @returns
 */
export function formatMetaobjectForSchemaFromGraphQlApi(
  node: MetaobjectFragment,
  context: coda.ExecutionContext,
  schemaWithIdentity = false
) {
  let obj = {
    id: graphQlGidToId(node.id),
    admin_graphql_api_id: node.id,
    handle: node.handle,
    admin_url: `${context.endpoint}/admin/content/entries/${node.type}/${graphQlGidToId(node.id)}`,
    status: node.capabilities?.publishable?.status,
    updatedAt: node.updatedAt,
  };

  if (node.capabilities?.publishable?.status) {
    obj.status = node.capabilities.publishable.status;
  }

  Object.keys(node)
    .filter(
      (key) =>
        key.indexOf(METAOBJECT_CUSTOM_FIELD_PREFIX_KEY) === 0 &&
        shouldUpdateSyncTableMetafieldValue(node[key].type, schemaWithIdentity)
    )
    .forEach((key) => {
      const prop = node[key];
      obj[prop.key] = formatMetaFieldValueForSchema({
        value: prop?.value,
        type: prop?.type,
      });
    });

  return obj;
}
// #endregion

// #region GraphQl requests
async function fetchSingleMetaObjectGraphQl(
  params: {
    gid: string;
    fields?: string[];
    includeCapabilities?: boolean;
    includeFieldDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<MetaobjectFragment> {
  const payload = {
    query: buildQuerySingleMetaObjectWithFields(params.fields ?? []),
    variables: {
      id: params.gid,
      includeDefinition: params.includeFieldDefinitions ?? false,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    },
  };
  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobject) {
    return response.body.data.metaobject;
  } else {
    throw new coda.UserVisibleError(`Metaobject with id ${params.gid} not found.`);
  }
}

export const updateMetaObjectGraphQl = async (
  params: {
    gid: string;
    updateInput: MetaobjectUpdateInput;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const optionalFieldsKeys = params.updateInput.fields ? params.updateInput.fields.map((f) => f.key) : [];
  const payload = {
    query: buildUpdateMetaObjectMutation(optionalFieldsKeys),
    variables: {
      id: params.gid,
      metaobject: params.updateInput,
      includeDefinition: false,
      includeCapabilities: params.updateInput.hasOwnProperty('capabilities'),
      includeFieldDefinitions: false,
    },
  };
  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.metaobjectUpdate.userErrors },
    context
  );
  return response;
};

export const createMetaObjectGraphQl = async (
  metaobjectCreateInput: MetaobjectCreateInput,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: createMetaobjectMutation,
    variables: {
      metaobject: metaobjectCreateInput,
    },
  };
  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.metaobjectCreate.userErrors },
    context
  );
  return response;
};

export const deleteMetaObjectGraphQl = async (
  id: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: deleteMetaobjectMutation,
    variables: {
      id,
    },
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.metaobjectDelete.userErrors },
    context
  );
  return response;
};
// #endregion
