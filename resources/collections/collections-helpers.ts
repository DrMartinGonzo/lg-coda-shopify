import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { VariablesOf } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { CACHE_MAX, COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART } from '../../constants';
import { makeGraphQlRequest } from '../../helpers-graphql';
import { collectionTypeQuery, collectionTypesQuery } from './collections-graphql';

/**
 * Get Collection type via a GraphQL Admin API query
 * @param collectionGid the GraphQl GID of the collection
 * @param context Coda Execution Context
 * @param requestOptions
 * @returns The collection Type
 */
export async function getCollectionType(
  collectionGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(collectionTypeQuery),
    variables: {
      collectionGid,
    } as VariablesOf<typeof collectionTypeQuery>,
  };
  // Cache max if unspecified because the collection type cannot be changed after creation
  const { response } = await makeGraphQlRequest<typeof collectionTypeQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX },
    context
  );
  // TODO: return 'better' values, rest resources ones or GraphQl ones
  return response.body.data.collection.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM;
}

/**
 * Get Collection types via a GraphQL Admin API query
 * @param collectionGids the GraphQl GID of the collection
 * @param context Coda Execution Context
 * @param requestOptions
 * @returns Collection ids with their type
 */
export async function getCollectionTypes(
  collectionGids: string[],
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(collectionTypesQuery),
    variables: {
      ids: collectionGids,
    } as VariablesOf<typeof collectionTypesQuery>,
  };
  // Cache max if unspecified because the collection type cannot be changed after creation
  const { response } = await makeGraphQlRequest<typeof collectionTypesQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX },
    context
  );
  // TODO: return 'better' values, rest resources ones or GraphQl ones
  return response?.body?.data?.nodes
    .map((node) => {
      if (node.__typename === 'Collection') {
        return {
          id: node.id,
          type: node.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM,
        };
      }
    })
    .filter(Boolean);
}
