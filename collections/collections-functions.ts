import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import {
  CACHE_MAX,
  COLLECTION_TYPE__CUSTOM,
  COLLECTION_TYPE__SMART,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { isSmartCollection } from './collections-graphql';
import { CollectionSchema, formatCollectionReferenceValueForSchema } from '../schemas/syncTable/CollectionSchema';
import { FetchRequestOptions } from '../types/Requests';

import {
  getMetafieldKeyValueSetsFromUpdate,
  separatePrefixedMetafieldsKeysFromKeys,
  updateResourceMetafieldsFromSyncTableRest,
} from '../metafields/metafields-functions';

import { MetafieldDefinitionFragment } from '../types/admin.generated';
import { CollectionUpdateRestParams } from '../types/Collection';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { restResources } from '../types/RequestsRest';
import { formatProductReferenceValueForSchema } from '../schemas/syncTable/ProductSchemaRest';

// #region Helpers
function formatCollectionStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof CollectionSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    const value = values[fromKey];

    // Edge cases
    if (fromKey === 'image_alt_text') {
      restParams.image = {
        ...(restParams.image ?? {}),
        alt: value,
      };
    } else if (fromKey === 'image_url') {
      restParams.image = {
        ...(restParams.image ?? {}),
        src: value,
      };
    }
    // No processing needed
    else {
      restParams[fromKey] = value;
    }
  });
  return restParams;
}

export async function handleCollectionUpdateJob(
  update: coda.SyncUpdate<string, string, typeof CollectionSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const collectionId = update.previousValue.id as number;
  const collectionType = await getCollectionTypeGraphQl(
    idToGraphQlGid(GraphQlResource.Collection, collectionId),
    context
  );

  if (standardFromKeys.length) {
    const restParams: CollectionUpdateRestParams = formatCollectionStandardFieldsRestParams(
      standardFromKeys,
      update.newValue
    );

    subJobs.push(updateCollectionRest(collectionId, collectionType, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      updateResourceMetafieldsFromSyncTableRest(
        collectionId,
        restResources.Collection,
        await getMetafieldKeyValueSetsFromUpdate(
          prefixedMetafieldFromKeys,
          update.newValue,
          metafieldDefinitions,
          context
        ),
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.all(subJobs);
  if (updateJob?.body[collectionType]) {
    obj = {
      ...obj,
      ...formatCollectionForSchemaFromRestApi(updateJob.body[collectionType], context),
    };
  }
  if (metafieldsJob) {
    obj = {
      ...obj,
      ...metafieldsJob,
    };
  }
  return obj;
}
// #endregion

// #region Formatting functions
export function validateCollectionParams(params: any) {
  const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
  }
}

export const formatCollect = (collect, context: coda.ExecutionContext) => {
  let obj: any = {
    ...collect,
  };
  if (collect.product_id) {
    obj.product = formatProductReferenceValueForSchema(collect.product_id);
  }
  if (collect.collection_id) {
    obj.collection = formatCollectionReferenceValueForSchema(collect.collection_id);
  }
  return obj;
};

export const formatCollectionForSchemaFromRestApi = (collection, context: coda.ExecutionContext) => {
  let obj: any = {
    ...collection,
    admin_url: `${context.endpoint}/admin/collections/${collection.id}`,
    body: striptags(collection.body_html),
    published: !!collection.published_at,
  };

  if (collection.image) {
    obj.image_alt_text = collection.image.alt;
    obj.image_url = collection.image.src;
  }
  return obj;
};

// #endregion

// #region GraphQL Requests
export const getCollectionTypeGraphQl = async (
  collectionGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: isSmartCollection,
    variables: {
      collectionGid,
    },
  };

  // Cache max if unspecified because the collection type cannot be changed after creation
  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX },
    context
  );
  const { body } = response;

  return body.data.collection.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM;
};
// #endregion

// #region Requests
export const fetchSingleCollectionRest = async (
  collectionId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/collections/${collectionId}.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
};

export const updateCollectionRest = async (
  collectionId: number,
  collectionType: string,
  params: CollectionUpdateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const restParams = cleanQueryParams(params);
  validateCollectionParams(params);

  const subFolder = collectionType === COLLECTION_TYPE__SMART ? 'smart_collections' : 'custom_collections';
  const payloadObjKey = collectionType === COLLECTION_TYPE__SMART ? 'smart_collection' : 'custom_collection';

  const payload = { [payloadObjKey]: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${subFolder}/${collectionId}.json`;
  return makePutRequest({ ...requestOptions, url, payload }, context);
};

export const createCollectionRest = async (
  params: any,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const collectionType = 'custom_collections';
  const payload = { custom_collection: params };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${collectionType}.json`;

  return makePostRequest({ ...requestOptions, url, payload }, context);
};

export const deleteCollectionRest = async (
  collectionId: number,
  collectionType: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const subFolder = collectionType === COLLECTION_TYPE__SMART ? 'smart_collections' : 'custom_collections';
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${subFolder}/${collectionId}.json`;
  return makeDeleteRequest({ ...requestOptions, url }, context);
};
// #endregion

// #region Unused stuff
/**
 * Format collection for schema from a GraphQL Admin API response
 */
/*
const formatCollectionForSchemaFromGraphQlApi = (
  collection: CollectionFieldsFragment,
  context: coda.ExecutionContext,
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
    const metafields = formatMetafieldsForSchema(collection.metafields.nodes);
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
};
*/

/**
 * Sync collections using GraphQL Admin API
 */
/*
export const syncCollectionsGraphQlAdmin = async (
  [
    syncMetafields,
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
  context
) => {
  validateCollectionParams({ published_status });

  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  // TODO: get an approximation for first run by using count of relation columns ?
  const defaultMaxEntriesPerRun = 50;
  const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
    defaultMaxEntriesPerRun,
    prevContinuation,
    context
  );
  if (shouldDeferBy > 0) {
    return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
  }

  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
  const effectiveMetafieldKeys = prefixedMetafieldFromKeys.map(getMetaFieldRealFromKey);
  const shouldSyncMetafields = effectiveMetafieldKeys.length;

  // Include optional nested fields. We only request these when necessary as they increase the query cost
  const optionalNestedFields = [];
  if (effectivePropertyKeys.includes('ruleSet')) optionalNestedFields.push('ruleSet');
  if (effectivePropertyKeys.includes('image')) optionalNestedFields.push('image');
  if (effectivePropertyKeys.includes('sort_order')) optionalNestedFields.push('sortOrder');
  // Metafield optional nested fields

  // const queryFilters = {
  //   created_at_min: created_at ? created_at[0] : undefined,
  //   created_at_max: created_at ? created_at[1] : undefined,
  //   updated_at_min: updated_at ? updated_at[0] : undefined,
  //   updated_at_max: updated_at ? updated_at[1] : undefined,
  //   // published_at_min: published_at ? published_at[1] : undefined,
  //   // published_at_max: published_at ? published_at[1] : undefined,
  //   gift_card,
  //   ids,
  //   status,
  //   vendors,
  //   search,
  //   product_types,
  //   published_status,
  // };

  // TODO: support filters
  const payload = {
    query: QueryCollectionsAdmin,
    variables: {
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
      metafieldKeys: effectiveMetafieldKeys,
      countMetafields: effectiveMetafieldKeys.length,
      searchQuery: '',
      includeImage: optionalNestedFields.includes('image'),
      includeMetafields: optionalNestedFields.includes('metafields'),
      includeRuleSet: optionalNestedFields.includes('ruleSet'),
      includeSortOrder: optionalNestedFields.includes('sortOrder'),
    } as GetCollectionsQueryVariables,
  };

  const { response, continuation } = await makeSyncTableGraphQlRequest(
    {
      payload,
      maxEntriesPerRun,
      prevContinuation,
      getPageInfo: (data: any) => data.collections?.pageInfo,
    },
    context
  );
  if (response?.body?.data?.collections) {
    const data = response.body.data as GetCollectionsQuery;
    return {
      result: data.collections.nodes.map((collection) =>
        formatCollectionForSchemaFromGraphQlApi(collection, context)
      ),
      continuation,
    };
  } else {
    return {
      result: [],
      continuation,
    };
  }
};
*/

/*
export const fetchCollect = async ([id, fields], context) => {
  const params = cleanQueryParams({ fields });

  const url = coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/collects/${id}.json`, params);
  const response = await restGetRequest({ url, cacheTtlSecs: CACHE_DEFAULT }, context);
  const { body } = response;
  if (body.collect) {
    return body.collect;
  }
};
*/
// #endregion
