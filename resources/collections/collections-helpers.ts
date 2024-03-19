import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../types/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { CACHE_MAX, COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART } from '../../constants';
import { idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import { CollectionSyncTableBase } from './CollectionSyncTableBase';
import { queryCollectionType, queryCollectionTypes } from './collections-graphql';
import { CustomCollectionRestFetcher } from './custom_collection/CustomCollectionRestFetcher';
import { CustomCollectionSyncTable } from './custom_collection/CustomCollectionSyncTable';
import { SmartCollectionRestFetcher } from './smart_collection/SmartCollectionRestFetcher';
import { smartCollectionResource } from './smart_collection/smartCollectionResource';

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
    query: printGql(queryCollectionType),
    variables: {
      collectionGid,
    } as VariablesOf<typeof queryCollectionType>,
  };
  // Cache max if unspecified because the collection type cannot be changed after creation
  const { response } = await makeGraphQlRequest<ResultOf<typeof queryCollectionType>>(
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
    query: printGql(queryCollectionTypes),
    variables: {
      ids: collectionGids,
    } as VariablesOf<typeof queryCollectionTypes>,
  };
  // Cache max if unspecified because the collection type cannot be changed after creation
  const { response } = await makeGraphQlRequest<ResultOf<typeof queryCollectionTypes>>(
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

export async function getCollectionFetcher(collectionId: number, context: coda.ExecutionContext) {
  const collectionType = await getCollectionType(idToGraphQlGid(GraphQlResourceName.Collection, collectionId), context);
  return getCollectionFetcherOfType(collectionType, context);
}

export function getCollectionFetcherOfType(collectionType: string, context: coda.ExecutionContext) {
  switch (collectionType) {
    case COLLECTION_TYPE__SMART:
      return new SmartCollectionRestFetcher(context);
    case COLLECTION_TYPE__CUSTOM:
      return new CustomCollectionRestFetcher(context);
  }

  throw new Error(`Unknown collection type: ${collectionType}.`);
}

export function getCollectionSyncTableOfType(
  collectionType: string,
  params: coda.ParamValues<coda.ParamDefs>,
  context: coda.ExecutionContext
) {
  switch (collectionType) {
    case COLLECTION_TYPE__SMART:
      return new CollectionSyncTableBase(
        smartCollectionResource,
        getCollectionFetcherOfType(collectionType, context) as SmartCollectionRestFetcher,
        params
      );
    case COLLECTION_TYPE__CUSTOM:
      return new CustomCollectionSyncTable(
        getCollectionFetcherOfType(collectionType, context) as CustomCollectionRestFetcher,
        params
      );
  }

  throw new Error(`Unknown collection type: ${collectionType}.`);
}
