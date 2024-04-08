// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { CACHE_DEFAULT } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { MetaobjectFieldInput } from '../../types/admin.types';
import { isString } from '../../utils/helpers';
import {
  getMetaobjectDefinitionsQuery,
  getSingleMetaObjectDefinitionQuery,
  getSingleMetaobjectDefinitionByTypeQuery,
  metaobjectDefinitionFragment,
  metaobjectFieldDefinitionFragment,
} from './metaobjects-graphql';

// #endregion

// #region GraphQl requests
export async function fetchAllMetaObjectDefinitions(
  params: {
    includeCapabilities?: boolean;
    includeFieldDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<Array<ResultOf<typeof metaobjectDefinitionFragment>>> {
  let nodes: Array<ResultOf<typeof metaobjectDefinitionFragment>> = [];
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
      query: printGql(getMetaobjectDefinitionsQuery),
      variables: {
        cursor: prevContinuation?.cursor ?? null,
        maxEntriesPerRun,
        includeCapabilities: params.includeCapabilities ?? false,
        includeFieldDefinitions: params.includeFieldDefinitions ?? false,
      } as VariablesOf<typeof getMetaobjectDefinitionsQuery>,
    };
    // prettier-ignore
    const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof getMetaobjectDefinitionsQuery>>(
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
        metaobjectDefinitionFragment,
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
): Promise<ResultOf<typeof metaobjectDefinitionFragment>> {
  const payload = {
    query: printGql(getSingleMetaObjectDefinitionQuery),
    variables: {
      id: params.gid,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    } as VariablesOf<typeof getSingleMetaObjectDefinitionQuery>,
  };
  const { response } = await makeGraphQlRequest<ResultOf<typeof getSingleMetaObjectDefinitionQuery>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobjectDefinition) {
    return readFragment(metaobjectDefinitionFragment, response.body.data.metaobjectDefinition);
  } else {
    throw new coda.UserVisibleError(`MetaobjectDefinition with id ${params.gid} not found.`);
  }
}

export async function fetchSingleMetaObjectDefinitionByType(
  params: {
    type: string;
    includeCapabilities?: boolean;
    includeFieldDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<ResultOf<typeof metaobjectDefinitionFragment>> {
  const payload = {
    query: printGql(getSingleMetaobjectDefinitionByTypeQuery),
    variables: {
      type: params.type,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    } as VariablesOf<typeof getSingleMetaobjectDefinitionByTypeQuery>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof getSingleMetaobjectDefinitionByTypeQuery>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data?.metaobjectDefinitionByType) {
    return readFragment(metaobjectDefinitionFragment, response.body.data.metaobjectDefinitionByType);
  } else {
    throw new coda.UserVisibleError(`Metaobject definition with type ${params.type} not found.`);
  }
}
// #endregion

// #region Helpers
function findMatchingMetaobjectFieldDefinition(
  key: string,
  fieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>
) {
  return fieldDefinitions.find((f) => f.key === key);
}
export function requireMatchingMetaobjectFieldDefinition(
  fullKey: string,
  fieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>
) {
  const MetaobjectFieldDefinition = findMatchingMetaobjectFieldDefinition(fullKey, fieldDefinitions);
  if (!MetaobjectFieldDefinition) throw new Error('MetaobjectFieldDefinition not found');
  return MetaobjectFieldDefinition;
}

export function parseMetaobjectFieldInputsFromVarArgs(varargs: Array<any>) {
  const fieldInputs: Array<MetaobjectFieldInput> = [];
  while (varargs.length > 0) {
    let key: string, value: string;
    [key, value, ...varargs] = varargs;
    fieldInputs.push({
      key,
      // value should always be a string
      value: isString(value) ? value : JSON.stringify(value),
    });
  }
  return fieldInputs;
}
// #endregion
