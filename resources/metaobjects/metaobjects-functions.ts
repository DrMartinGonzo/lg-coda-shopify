// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment, readFragmentArray } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { CACHE_DEFAULT, CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  idToGraphQlGid,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import {
  MetaobjectCreateInput,
  MetaobjectFieldInput,
  MetaobjectStatus,
  MetaobjectUpdateInput,
} from '../../types/admin.types';
import { formatMetaFieldValueForSchema } from '../metafields/metafields-functions';
import { shouldUpdateSyncTableMetafieldValue } from '../metafields/metafields-helpers';
import { MetaobjectWithFields } from './Metaobject.types';
import {
  MetaobjectDefinitionFragment,
  MetaobjectFieldDefinitionFragment,
  buildQuerySingleMetaObjectWithFields,
  buildUpdateMetaObjectMutation,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  queryAllMetaobjectDefinitions,
  querySingleMetaObjectDefinition,
  querySingleMetaobjectDefinitionByType,
} from './metaobjects-graphql';

// #endregion

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
      gid: idToGraphQlGid(GraphQlResourceName.Metaobject, args.metaobjectId),
      includeFieldDefinitions: true,
    },
    context
  );
  const fieldDefinitionsR = readFragment(MetaobjectFieldDefinitionFragment, response?.definition?.fieldDefinitions);
  response.definition.fieldDefinitions;
  const fieldDefinitions = response.definition.fieldDefinitions.map((f) =>
    readFragment(MetaobjectFieldDefinitionFragment, f)
  );
  return coda.autocompleteSearchObjects(search, fieldDefinitions, 'name', 'key');
}
export async function autocompleteMetaobjectFieldkeyFromMetaobjectType(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.type || args.type === '') {
    throw new coda.UserVisibleError('You need to define the type of the metaobject first for autocomplete to work.');
  }
  const metaObjectDefinition = await fetchSingleMetaObjectDefinitionByType(args.type, false, true, context);
  const fieldDefinitions = readFragmentArray(MetaobjectFieldDefinitionFragment, metaObjectDefinition.fieldDefinitions);
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
  metaobjectFieldInput: Array<MetaobjectFieldInput>
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
  metaobjectFieldInput: Array<MetaobjectFieldInput>
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
  node: MetaobjectWithFields,
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
        key.indexOf(CUSTOM_FIELD_PREFIX_KEY) === 0 &&
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
export async function fetchAllMetaObjectDefinitions(
  params: {
    includeCapabilities?: boolean;
    includeFieldDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<Array<ResultOf<typeof MetaobjectDefinitionFragment>>> {
  let nodes: Array<ResultOf<typeof MetaobjectDefinitionFragment>> = [];
  let prevContinuation: SyncTableGraphQlContinuation;
  let run = true;
  while (run) {
    const defaultMaxEntriesPerRun = 50;
    const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
      defaultMaxEntriesPerRun,
      prevContinuation,
      context
    );
    if (shouldDeferBy > 0) {
      skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
      continue;
    }

    const payload = {
      query: printGql(queryAllMetaobjectDefinitions),
      variables: {
        cursor: prevContinuation?.cursor ?? null,
        maxEntriesPerRun,
        includeCapabilities: params.includeCapabilities ?? false,
        includeFieldDefinitions: params.includeFieldDefinitions ?? false,
      } as VariablesOf<typeof queryAllMetaobjectDefinitions>,
    };
    // prettier-ignore
    const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof queryAllMetaobjectDefinitions>>(
      {
        payload,
        maxEntriesPerRun,
        prevContinuation,
        cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT,
        getPageInfo: (data: any) => data.metaobjectDefinitions?.pageInfo,
      },
      context as coda.SyncExecutionContext
    );

    if (response?.body?.data?.metaobjectDefinitions?.nodes) {
      const metaObjectDefinitions = readFragment(
        MetaobjectDefinitionFragment,
        response.body.data.metaobjectDefinitions.nodes
      );
      nodes = nodes.concat(metaObjectDefinitions);
    }

    if (continuation?.cursor) {
      prevContinuation = continuation;
    } else {
      run = false;
    }
  }

  return nodes;
}

export async function fetchSingleMetaObjectDefinition(
  params: {
    gid: string;
    includeCapabilities?: boolean;
    includeFieldDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<ResultOf<typeof MetaobjectDefinitionFragment>> {
  const payload = {
    query: printGql(querySingleMetaObjectDefinition),
    variables: {
      id: params.gid,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    } as VariablesOf<typeof querySingleMetaObjectDefinition>,
  };
  const { response } = await makeGraphQlRequest<ResultOf<typeof querySingleMetaObjectDefinition>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobjectDefinition) {
    return readFragment(MetaobjectDefinitionFragment, response.body.data.metaobjectDefinition);
  } else {
    throw new coda.UserVisibleError(`MetaobjectDefinition with id ${params.gid} not found.`);
  }
}

async function fetchSingleMetaObjectDefinitionByType(
  type: string,
  includeCapabilities = true,
  includeFieldDefinitions = true,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<ResultOf<typeof MetaobjectDefinitionFragment>> {
  const payload = {
    query: printGql(querySingleMetaobjectDefinitionByType),
    variables: {
      type,
      includeCapabilities,
      includeFieldDefinitions,
    } as VariablesOf<typeof querySingleMetaobjectDefinitionByType>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof querySingleMetaobjectDefinitionByType>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobjectDefinitionByType) {
    return readFragment(MetaobjectDefinitionFragment, response.body.data.metaobjectDefinitionByType);
  } else {
    throw new coda.UserVisibleError(`Metaobject definition with type ${type} not found.`);
  }
}

async function fetchSingleMetaObjectGraphQl(
  params: {
    gid: string;
    fields?: string[];
    includeCapabilities?: boolean;
    includeFieldDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<MetaobjectWithFields> {
  const payload = {
    query: buildQuerySingleMetaObjectWithFields(params.fields ?? []),
    variables: {
      id: params.gid,
      includeDefinition: params.includeFieldDefinitions ?? false,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    },
  };
  const { response } = await makeGraphQlRequest<{ metaobject: MetaobjectWithFields }>(
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
  // TODO: add userErrors type
  const { response } = await makeGraphQlRequest<{ metaobjectUpdate: { metaobject: MetaobjectWithFields } }>(
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
    query: printGql(createMetaobjectMutation),
    variables: {
      metaobject: metaobjectCreateInput,
    } as VariablesOf<typeof createMetaobjectMutation>,
  };
  const { response } = await makeGraphQlRequest<ResultOf<typeof createMetaobjectMutation>>(
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
    query: printGql(deleteMetaobjectMutation),
    variables: {
      id,
    } as VariablesOf<typeof deleteMetaobjectMutation>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof deleteMetaobjectMutation>>(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.metaobjectDelete.userErrors },
    context
  );
  return response;
};
// #endregion

// #region Helpers
export function findMatchingMetaobjectFieldDefinition(
  key: string,
  fieldDefinitions: Array<ResultOf<typeof MetaobjectFieldDefinitionFragment>>
) {
  return fieldDefinitions.find((f) => f.key === key);
}
export function requireMatchingMetaobjectFieldDefinition(
  fullKey: string,
  fieldDefinitions: Array<ResultOf<typeof MetaobjectFieldDefinitionFragment>>
) {
  const MetaobjectFieldDefinition = findMatchingMetaobjectFieldDefinition(fullKey, fieldDefinitions);
  if (!MetaobjectFieldDefinition) throw new Error('MetaobjectFieldDefinition not found');
  return MetaobjectFieldDefinition;
}
// #endregion
