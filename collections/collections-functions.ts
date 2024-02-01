import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { handleFieldDependencies } from '../helpers';
import {
  graphQlGidToId,
  idToGraphQlGid,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import {
  cleanQueryParams,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
  makeSyncTableGetRequest,
} from '../helpers-rest';
import {
  CACHE_DAY,
  CACHE_SINGLE_FETCH,
  COLLECTION_TYPE__CUSTOM,
  COLLECTION_TYPE__SMART,
  NOT_FOUND,
  OPTIONS_PUBLISHED_STATUS,
  RESOURCE_COLLECTION,
  RESOURCE_PRODUCT,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { MutationCollectionProduct, isSmartCollection, QueryCollectionsAdmin } from './collections-graphql';
import { CollectionSchema, collectFieldDependencies, collectionFieldDependencies } from './collections-schema';
import { FormatFunction } from '../types/misc';
import { SyncTableGraphQlContinuation, SyncTableRestContinuation } from '../types/tableSync';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import {
  fetchMetafieldDefinitions,
  getMetaFieldRealFromKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { formatMetafieldsForSchema } from '../metafields/metafields-functions';

import type { Metafield, MetafieldDefinition } from '../types/admin.types';
import { CollectionFieldsFragment, GetCollectionsQuery, GetCollectionsQueryVariables } from '../types/admin.generated';

// #region Formatting functions
function validateCollectionParams(params: any) {
  const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
  }
}

const formatCollect: FormatFunction = (collect, context) => {
  if (collect.product_id) {
    collect.product_gid = idToGraphQlGid(RESOURCE_PRODUCT, collect.product_id);
    collect.product = {
      id: collect.product_id,
      title: NOT_FOUND,
    };
  }
  if (collect.collection_id) {
    collect.collection_gid = idToGraphQlGid(RESOURCE_COLLECTION, collect.collection_id);
    collect.collection = {
      admin_graphql_api_id: collect.collection_gid,
      title: NOT_FOUND,
    };
  }
  return collect;
};

export const formatCollectionForSchemaFromRestApi: FormatFunction = (collection, context) => {
  collection.admin_url = `${context.endpoint}/admin/collections/${collection.id}`;
  collection.body = striptags(collection.body_html);
  collection.published = !!collection.published_at;
  if (collection.image) {
    // collection.thumbnail = getThumbnailUrlFromFullUrl(collection.image.src);
    collection.image = collection.image.src;
  }
  return collection;
};

/**
 * Format collection for schema from a GraphQL Admin API response
 */
const formatCollectionForSchemaFromGraphQlApi = (
  collection: CollectionFieldsFragment,
  context: coda.ExecutionContext,
  metafieldDefinitions: MetafieldDefinition[]
) => {
  let obj: any = {
    ...collection,
    admin_url: `${context.endpoint}/admin/collections/${graphQlGidToId(collection.id)}`,
    body: striptags(collection.descriptionHtml),
    body_html: collection.descriptionHtml,
    admin_graphql_api_id: collection.id,
    // created_at: collection.createdAt,
    updated_at: collection.updatedAt,
    // published_at: collection.publishedAt,
    image: collection.image?.url,
    template_suffix: collection.templateSuffix,
    sort_order: collection.sortOrder,
  };

  if (collection.ruleSet) {
    obj.ruleSet = {
      ...collection.ruleSet,
      display: `${collection.ruleSet.rules.length} rule${collection.ruleSet.rules.length > 1 ? 's' : ''}`,
    };
  }
  if (collection.metafields && collection.metafields.nodes.length) {
    const metafields = formatMetafieldsForSchema(collection.metafields.nodes, metafieldDefinitions);
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
};
// #endregion

// #region Dynamic SyncTable definition functions
async function getCollectionSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const augmentedSchema = await augmentSchemaWithMetafields(CollectionSchema, 'COLLECTION', context);
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}
export const collectionSyncTableDynamicOptions: coda.DynamicOptions = {
  getSchema: getCollectionSyncTableSchema,
  defaultAddDynamicColumns: false,
};
// #endregion

// #region Requests
export const getCollectionType = async (gid: string, context: coda.ExecutionContext) => {
  const payload = {
    query: isSmartCollection,
    variables: {
      gid,
    },
  };

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_DAY }, context);
  const { body } = response;

  return body.data.collection.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM;
};

export const fetchCollection = async (collectionId: number, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/collections/${collectionId}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
};
export const createCollection = async (params: any, context: coda.ExecutionContext) => {
  const collectionType = 'custom_collections';
  const payload = { custom_collection: params };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${collectionType}.json`;

  return makePostRequest({ url, payload }, context);
};

export const deleteCollection = async (collectionId: number, collectionType: string, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${
    collectionType === COLLECTION_TYPE__SMART ? 'smart_collections' : 'custom_collections'
  }/${collectionId}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion

// #region Pack functions
export const syncCollects = async ([collection_gid], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, collectFieldDependencies);

  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    limit: REST_DEFAULT_LIMIT,
    collection_id: collection_gid ? graphQlGidToId(collection_gid) : undefined,
  });

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/collects.json`, params);

  return await makeSyncTableGetRequest(
    {
      url,
      formatFunction: formatCollect,
      mainDataKey: 'collects',
    },
    context
  );
};


export const syncCollections = async (
  [
    handle,
    ids,
    product_id,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  ],
  context: coda.SyncExecutionContext
) => {
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  let type = prevContinuation?.extraContinuationData?.type ?? 'custom_collections';

  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, collectionFieldDependencies);

  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    ids,
    limit: REST_DEFAULT_LIMIT,
    product_id,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  });

  validateCollectionParams(params);

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${type}.json`, params);

  const results = await makeSyncTableGetRequest(
    {
      url,
      formatFunction: formatCollection,
      mainDataKey: type,
    },
    context
  );

  // finished syncing custom collections, we will sync smart collections in the next run
  if (type === 'custom_collections' && !results.continuation?.nextUrl) {
    const nextType = 'smart_collections';
    results.continuation = {
      nextUrl: coda.withQueryParams(
        `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${nextType}.json`,
        params
      ),
      extraContinuationData: {
        type: nextType,
      },
    };
  }

  return results;
};

export const actionUpdateCollection = async (collectionGid: string, fields, context: coda.ExecutionContext) => {
  let newValues = {};
  const restAdminOnlyKeys = ['published'];

  const keysToUpdateGraphQl = Object.keys(fields).filter(
    (key) => !restAdminOnlyKeys.includes(key) && fields[key] !== undefined
  );
  const keysToUpdateRest = Object.keys(fields).filter(
    (key) => restAdminOnlyKeys.includes(key) && fields[key] !== undefined
  );

  if (keysToUpdateGraphQl.length) {
    const mutationInput = {
      id: collectionGid,
    };

    keysToUpdateGraphQl.forEach((key) => {
      let graphQlKey = key;
      switch (key) {
        case 'body_html':
          graphQlKey = 'descriptionHtml';
          break;
        case 'template_suffix':
          graphQlKey = 'templateSuffix';
          break;

        default:
          break;
      }

      mutationInput[graphQlKey] = fields[key];
    });

    const payload = {
      query: MutationCollectionProduct,
      variables: {
        input: mutationInput,
      },
    };

    const { response } = await makeGraphQlRequest({ payload }, context);

    const { body } = response;

    // TODO: need a formatCollection function for graphQL responses
    newValues = formatCollectionForSchemaFromRestApi(
      {
        admin_graphql_api_id: collectionGid,
        ...body.data.collectionUpdate.collection,
      },
      context
    );
  }

  if (keysToUpdateRest.length) {
    const fieldsPayload = {};
    keysToUpdateRest.forEach((key) => {
      const updatedValue = fields[key];
      fieldsPayload[key] = updatedValue;
    });

    const collectionId = graphQlGidToId(collectionGid);
    const collectionType = await getCollectionType(collectionGid, context);

    let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/custom_collections/${collectionId}.json`;
    let payload = {
      custom_collection: {
        ...fieldsPayload,
      },
    };
    if (collectionType === COLLECTION_TYPE__SMART) {
      url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/smart_collections/${collectionId}.json`;
      payload = {
        // @ts-ignore
        smart_collection: {
          ...fieldsPayload,
        },
      };
    }

    const response = await makePutRequest({ url, payload }, context);
    const { body } = response;
    newValues = formatCollectionForSchemaFromRestApi(
      collectionType === COLLECTION_TYPE__SMART ? body.smart_collection : body.custom_collection,
      context
    );
  }

  return newValues;
};

export const createCollection = async (fields: { [key: string]: any }, context: coda.ExecutionContext) => {
  // validateCollectionParams(fields);

  const collectionType = 'custom_collections';
  const payload = { custom_collection: cleanQueryParams(fields) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${collectionType}.json`;

  return makePostRequest({ url, payload }, context);
};


  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${
    collectionType === COLLECTION_TYPE__SMART ? 'smart_collections' : 'custom_collections'
  }/${collectionId}.json`;

  return makeDeleteRequest({ url }, context);
};
// #endregion
