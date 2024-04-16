import * as coda from '@codahq/packs-sdk';
import { VariablesOf } from './tada-utils';

import { FetchRequestOptions } from '../Clients/Client.types';
import { GraphQlClient } from '../Clients/GraphQlClient';
import { CACHE_MAX, COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART } from '../constants';
import { collectionTypeQuery, collectionTypesQuery } from '../graphql/collections-graphql';

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
  const documentNode = collectionTypeQuery;
  const variables = {
    collectionGid,
  } as VariablesOf<typeof documentNode>;

  const graphQlClient = new GraphQlClient({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables,
    retries: this.prevContinuation?.retries ?? 0,
    options: {
      // Cache max if unspecified because the collection type cannot be changed after creation
      cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX,
    },
  });

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
  const documentNode = collectionTypesQuery;
  const variables = {
    ids: collectionGids,
  } as VariablesOf<typeof documentNode>;

  const graphQlClient = new GraphQlClient({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables,
    retries: this.prevContinuation?.retries ?? 0,
    options: {
      // Cache max if unspecified because the collection type cannot be changed after creation
      cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX,
    },
  });

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
