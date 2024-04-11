// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { CACHE_DEFAULT } from '../../constants';
import { makeGraphQlRequest } from '../../helpers-graphql';
import { MetaobjectDefinitionGraphQlFetcher } from '../metaobjectDefinitions/metaobjectDefinitionGraphQlFetcher';
import {
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
  const metaobjectDefinitionGraphQlFetcher = new MetaobjectDefinitionGraphQlFetcher(context);
  return metaobjectDefinitionGraphQlFetcher.fetchAll(params, requestOptions);
  // return metaobjectDefinitionGraphQlFetcher.fetchAll(params);
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
  const { response } = await makeGraphQlRequest<typeof getSingleMetaObjectDefinitionQuery>(
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

  const { response } = await makeGraphQlRequest<typeof getSingleMetaobjectDefinitionByTypeQuery>(
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
// #endregion
