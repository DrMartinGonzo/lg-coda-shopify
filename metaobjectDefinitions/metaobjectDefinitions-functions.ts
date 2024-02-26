import * as coda from '@codahq/packs-sdk';

import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { CACHE_DEFAULT } from '../constants';
import {
  queryAllMetaobjectDefinitions,
  querySingleMetaObjectDefinition,
  querySingleMetaobjectDefinitionByType,
} from './metaobjectDefinitions-graphql';

import {
  GetMetaobjectDefinitionsQueryVariables,
  GetSingleMetaObjectDefinitionByTypeQueryVariables,
  GetSingleMetaObjectDefinitionQueryVariables,
  MetaobjectDefinitionFragment,
  MetaobjectFieldDefinitionFragment,
} from '../types/admin.generated';
import { FetchRequestOptions } from '../types/Requests';
import { SyncTableGraphQlContinuation } from '../types/tableSync';

// #region Helpers
function findMatchingMetaobjectFieldDefinition(key: string, fieldDefinitions: MetaobjectFieldDefinitionFragment[]) {
  return fieldDefinitions.find((f) => f.key === key);
}
export function requireMatchingMetaobjectFieldDefinition(
  fullKey: string,
  fieldDefinitions: MetaobjectFieldDefinitionFragment[]
) {
  const MetaobjectFieldDefinition = findMatchingMetaobjectFieldDefinition(fullKey, fieldDefinitions);
  if (!MetaobjectFieldDefinition) throw new Error('MetaobjectFieldDefinition not found');
  return MetaobjectFieldDefinition;
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
): Promise<MetaobjectDefinitionFragment[]> {
  let nodes = [];
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
      query: queryAllMetaobjectDefinitions,
      variables: {
        cursor: prevContinuation?.cursor ?? null,
        maxEntriesPerRun,
        includeCapabilities: params.includeCapabilities ?? false,
        includeFieldDefinitions: params.includeFieldDefinitions ?? false,
      } as GetMetaobjectDefinitionsQueryVariables,
    };
    const { response, continuation } = await makeSyncTableGraphQlRequest(
      {
        payload,
        maxEntriesPerRun,
        prevContinuation,
        cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT,
        getPageInfo: (data: any) => data.metaobjectDefinitions?.pageInfo,
      },
      context as coda.SyncExecutionContext
    );

    if (response.body.data?.metaobjectDefinitions?.nodes) {
      nodes = nodes.concat(response.body.data.metaobjectDefinitions.nodes);
    }

    console.log('continuation', continuation);
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
): Promise<MetaobjectDefinitionFragment> {
  const payload = {
    query: querySingleMetaObjectDefinition,
    variables: {
      id: params.gid,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    } as GetSingleMetaObjectDefinitionQueryVariables,
  };
  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobjectDefinition) {
    return response.body.data.metaobjectDefinition;
  } else {
    throw new coda.UserVisibleError(`MetaobjectDefinition with id ${params.gid} not found.`);
  }
}

export async function fetchSingleMetaObjectDefinitionByType(
  type: string,
  includeCapabilities = true,
  includeFieldDefinitions = true,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<MetaobjectDefinitionFragment> {
  const payload = {
    query: querySingleMetaobjectDefinitionByType,
    variables: {
      type,
      includeCapabilities,
      includeFieldDefinitions,
    } as GetSingleMetaObjectDefinitionByTypeQueryVariables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobjectDefinitionByType) {
    return response.body.data.metaobjectDefinitionByType;
  } else {
    throw new coda.UserVisibleError(`Metaobject definition with type ${type} not found.`);
  }
}
// #endregion
