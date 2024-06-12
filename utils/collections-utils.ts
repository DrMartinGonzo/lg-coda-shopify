// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';
import { VariablesOf } from './tada-utils';

import { FetchRequestOptions } from '../Clients/Client.types';
import { GraphQlClient } from '../Clients/GraphQlClient';
import { IMetafield } from '../Resources/Mixed/MetafieldHelper';
import { RestResourcesSingular } from '../Resources/types/SupportedResource';
import { CACHE_MAX } from '../constants';
import { collectionTypeQuery, collectionTypesQuery } from '../graphql/collections-graphql';
import { CustomCollectionModelData } from '../models/rest/CustomCollectionModel';
import { SmartCollectionModelData } from '../models/rest/SmartCollectionModel';
import { CollectionRow } from '../schemas/CodaRows.types';

// #endregion

// #region Types
export type CollectionModelData = CustomCollectionModelData & SmartCollectionModelData;
// #endregion

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
    options: {
      // Cache max if unspecified because the collection type cannot be changed after creation
      cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX,
    },
  });

  return response.body.data.collection.isSmartCollection
    ? RestResourcesSingular.SmartCollection
    : RestResourcesSingular.CustomCollection;
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
    options: {
      // Cache max if unspecified because the collection type cannot be changed after creation
      cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX,
    },
  });

  return response?.body?.data?.nodes
    .map((node) => {
      if (node.__typename === 'Collection') {
        return {
          id: node.id,
          type: node.isSmartCollection ? RestResourcesSingular.SmartCollection : RestResourcesSingular.CustomCollection,
        };
      }
    })
    .filter(Boolean);
}

/**
 * Méthode partagée pour exporter en row un CustomCollectionModel ou un SmartCollectionModel
 */
export function collectionModelToCodaRow(
  context: coda.ExecutionContext,
  modelData: CollectionModelData
): CollectionRow {
  const { metafields, ...data } = modelData;

  let obj: CollectionRow = {
    ...data,
    admin_url: `${context.endpoint}/admin/collections/${data.id}`,
    body: striptags(data.body_html),
    published: !!data.published_at,
    disjunctive: data.disjunctive ?? false,
  };

  if (data.image) {
    obj.image_alt_text = data.image.alt;
    obj.image_url = data.image.src;
  }

  if (metafields) {
    metafields.forEach((metafield) => {
      obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
    });
  }

  return obj;
}
