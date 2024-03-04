// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import { CACHE_MAX, COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART, OPTIONS_PUBLISHED_STATUS } from '../constants';
import { isSmartCollection } from './collections-graphql';
import { CollectionSyncTableSchema, formatCollectionReference } from '../schemas/syncTable/CollectionSchema';
import { formatMetafieldRestInputFromKeyValueSet, hasMetafieldsInUpdates } from '../metafields/metafields-functions';
import { formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { SimpleRest } from '../Fetchers/SimpleRest';

import { RestResourceName } from '../types/RequestsRest';
import { CollectSyncTableSchema } from '../schemas/syncTable/CollectSchema';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { isNullOrEmpty } from '../helpers';

import type { CollectionCreateRestParams, CollectionUpdateRestParams } from '../types/Collection';
import type { CollectRow, CollectionRow } from '../types/CodaRows';
import type { FetchRequestOptions } from '../types/Requests';
import type { IsSmartCollectionQuery } from '../types/admin.generated';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';

// #endregion

// #region Classes
export class Collection {
  /**
   * Get Collection type via a GraphQL Admin API query
   * @param collectionGid the GraphQl GID of the collection
   * @param context Coda Execution Context
   * @param requestOptions
   * @returns The collection Type
   */
  static getCollectionType = async (
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
    const { response } = await makeGraphQlRequest<IsSmartCollectionQuery>(
      { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX },
      context
    );
    // TODO: return 'better' values, rest resources ones or GraphQl ones
    return response.body.data.collection.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM;
  };

  static getFetcher = async (collectionId: number, context: coda.ExecutionContext) => {
    const collectionType = await Collection.getCollectionType(
      idToGraphQlGid(GraphQlResource.Collection, collectionId),
      context
    );
    return Collection.getFetcherOfType(collectionType, context);
  };

  static getFetcherOfType = (collectionType: string, context: coda.ExecutionContext) => {
    switch (collectionType) {
      case COLLECTION_TYPE__SMART:
        return new SmartCollectionRestFetcher(context);
      case COLLECTION_TYPE__CUSTOM:
        return new CustomCollectionRestFetcher(context);
    }

    throw new Error(`Unknown collection type: ${collectionType}.`);
  };

  /**
   * Edge case for collections, we don't know the collection type in advance, so
   * we need a static method
   */
  static executeSyncTableUpdate = async (
    updates: Array<coda.SyncUpdate<any, any, typeof CollectSyncTableSchema>>,
    context: coda.ExecutionContext
  ) => {
    const metafieldDefinitions = hasMetafieldsInUpdates(updates)
      ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Collection }, context)
      : [];

    const jobs = updates.map(async (update) => {
      if (
        !isNullOrEmpty(update.newValue.image_alt_text) &&
        (isNullOrEmpty(update.newValue.image_url) || isNullOrEmpty(update.previousValue.image_url))
      ) {
        throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
      }
      const collectionFetcher = await Collection.getFetcher(update.previousValue.id, context);
      return collectionFetcher.handleUpdateJob(update, metafieldDefinitions);
    });

    const completed = await Promise.allSettled(jobs);
    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  };
}

export class CollectionRestFetcherBase<
  T extends RestResourceName,
  K extends coda.ObjectSchema<string, string>
> extends SimpleRest<T, K> {
  validateParams = (params: any) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<CollectionRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): CollectionUpdateRestParams | CollectionCreateRestParams | undefined => {
    let restParams: CollectionUpdateRestParams | CollectionCreateRestParams = {};

    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.published !== undefined) restParams.published = row.published;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;
    if (row.title !== undefined) restParams.title = row.title;
    if (row.image_alt_text !== undefined || row.image_url !== undefined) {
      restParams.image = {};
      if (row.image_alt_text !== undefined) restParams.image.alt = row.image_alt_text;
      if (row.image_url !== undefined) restParams.image.src = row.image_url;
    }

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as CollectionCreateRestParams;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (collection): CollectionRow => {
    let obj: CollectionRow = {
      ...collection,
      admin_url: `${this.context.endpoint}/admin/collections/${collection.id}`,
      body: striptags(collection.body_html),
      published: !!collection.published_at,
      disjunctive: collection.disjunctive ?? false,
    };

    if (collection.image) {
      obj.image_alt_text = collection.image.alt;
      obj.image_url = collection.image.src;
    }

    return obj;
  };
}

export class CollectionRestFetcher extends CollectionRestFetcherBase<
  RestResourceName.Collection,
  typeof CollectionSyncTableSchema
> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Collection, CollectionSyncTableSchema, context);
  }
}

export class CustomCollectionRestFetcher extends CollectionRestFetcherBase<
  RestResourceName.CustomCollection,
  typeof CollectionSyncTableSchema
> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.CustomCollection, CollectionSyncTableSchema, context);
  }
}

export class SmartCollectionRestFetcher extends CollectionRestFetcherBase<
  RestResourceName.SmartCollection,
  typeof CollectionSyncTableSchema
> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.SmartCollection, CollectionSyncTableSchema, context);
  }
}

export class CollectRestFetcher extends SimpleRest<RestResourceName.Collect, typeof CollectSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Collect, CollectSyncTableSchema, context);
  }

  validateParams = (params: any) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatApiToRow = (collect): CollectRow => {
    let obj: CollectRow = {
      ...collect,
    };
    if (collect.product_id) {
      obj.product = formatProductReference(collect.product_id);
    }
    if (collect.collection_id) {
      obj.collection = formatCollectionReference(collect.collection_id);
    }

    return obj;
  };
}
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
      getCollectionInfo: (data: any) => data.collections?.pageInfo,
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
// #endregion
