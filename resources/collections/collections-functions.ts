// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import {
  CACHE_MAX,
  COLLECTION_TYPE__CUSTOM,
  COLLECTION_TYPE__SMART,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_LIMIT,
} from '../../constants';
import { getCollectionType, getCollectionTypes } from './collections-graphql';
import {
  CollectionSyncTableSchema,
  collectionFieldDependencies,
  formatCollectionReference,
} from '../../schemas/syncTable/CollectionSchema';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { SimpleRestNew } from '../../Fetchers/SimpleRest';

import { GraphQlResourceName } from '../../types/ShopifyGraphQlResourceTypes';
import { handleFieldDependencies, isNullOrEmpty } from '../../helpers';
import { SyncTableRestNew } from '../../Fetchers/SyncTableRest';
import { cleanQueryParams } from '../../helpers-rest';

import type { Collection as CollectionType } from '../../types/Resources/Collection';
import type { Collect } from '../../types/Resources/Collect';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import type { MultipleFetchResponse, SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import type { CollectRow } from '../../types/CodaRows';
import type { FetchRequestOptions } from '../../types/Fetcher';
import type {
  GetCollectionTypeQuery,
  GetCollectionTypeQueryVariables,
  GetCollectionTypesQuery,
  GetCollectionTypesQueryVariables,
} from '../../types/generated/admin.generated';
import type { Sync_Collections, Sync_Collects } from './collections-setup';
import type { SyncTableType } from '../../types/SyncTable';
import { collectResource } from '../allResources';
import { smartCollectionResource } from '../allResources';
import { customCollectionResource } from '../allResources';
import { collectionResource } from '../allResources';

// #region Classes
export type CollectionSyncTableType = SyncTableType<
  typeof collectionResource,
  CollectionType.Row,
  CollectionType.Params.Sync,
  CollectionType.Params.Create,
  CollectionType.Params.Update
>;

export type CustomCollectionSyncTableType = SyncTableType<
  typeof customCollectionResource,
  CollectionType.Row,
  CollectionType.Params.Sync,
  CollectionType.Params.Create,
  CollectionType.Params.Update
>;

export type SmartCollectionSyncTableType = SyncTableType<
  typeof smartCollectionResource,
  CollectionType.Row,
  CollectionType.Params.Sync,
  // TODO: create not supported for smart collections for the moment
  never,
  CollectionType.Params.Update
>;

export type CollectSyncTableType = SyncTableType<typeof collectResource, CollectRow, Collect.Params.Sync>;

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
      query: getCollectionType,
      variables: {
        collectionGid,
      } as GetCollectionTypeQueryVariables,
    };
    // Cache max if unspecified because the collection type cannot be changed after creation
    const { response } = await makeGraphQlRequest<GetCollectionTypeQuery>(
      { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_MAX },
      context
    );
    // TODO: return 'better' values, rest resources ones or GraphQl ones
    return response.body.data.collection.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM;
  };

  /**
   * Get Collection types via a GraphQL Admin API query
   * @param collectionGids the GraphQl GID of the collection
   * @param context Coda Execution Context
   * @param requestOptions
   * @returns Collection ids with their type
   */
  static getCollectionTypes = async (
    collectionGids: string[],
    context: coda.ExecutionContext,
    requestOptions: FetchRequestOptions = {}
  ) => {
    const payload = {
      query: getCollectionTypes,
      variables: {
        ids: collectionGids,
      } as GetCollectionTypesQueryVariables,
    };
    // Cache max if unspecified because the collection type cannot be changed after creation
    const { response } = await makeGraphQlRequest<GetCollectionTypesQuery>(
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
  };

  static getFetcher = async (collectionId: number, context: coda.ExecutionContext) => {
    const collectionType = await Collection.getCollectionType(
      idToGraphQlGid(GraphQlResourceName.Collection, collectionId),
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

  static getSyncTableOfType = (
    collectionType: string,
    params: coda.ParamValues<coda.ParamDefs>,
    context: coda.ExecutionContext
  ) => {
    switch (collectionType) {
      case COLLECTION_TYPE__SMART:
        return new CollectionSyncTableBase(
          smartCollectionResource,
          Collection.getFetcherOfType(collectionType, context) as SmartCollectionRestFetcher,
          params
        );
      case COLLECTION_TYPE__CUSTOM:
        return new CustomCollectionSyncTable(
          Collection.getFetcherOfType(collectionType, context) as CustomCollectionRestFetcher,
          params
        );
    }

    throw new Error(`Unknown collection type: ${collectionType}.`);
  };
}

abstract class CollectionRestFetcherBase<
  T extends CollectionSyncTableType | CustomCollectionSyncTableType | SmartCollectionSyncTableType
> extends SimpleRestNew<T> {
  validateParams = (
    params: CollectionType.Params.Sync | CollectionType.Params.Create | CollectionType.Params.Update
  ) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
    }
    return true;
  };

  validateUpdateJob(update: coda.SyncUpdate<any, any, typeof CollectionSyncTableSchema>) {
    if (
      !isNullOrEmpty(update.newValue.image_alt_text) &&
      (isNullOrEmpty(update.newValue.image_url) || isNullOrEmpty(update.previousValue.image_url))
    ) {
      throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
    }
    return true;
  }

  formatRowToApi = (
    row: Partial<CollectionType.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): CollectionType.Params.Update | CollectionType.Params.Create | undefined => {
    let restParams: CollectionType.Params.Update | CollectionType.Params.Create = {};

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
      restParams = { ...restParams, metafields: metafieldRestInputs } as CollectionType.Params.Create;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (collection) => {
    let obj: CollectionType.Row = {
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
class CollectionSyncTableBase<
  T extends CustomCollectionSyncTableType | SmartCollectionSyncTableType
> extends SyncTableRestNew<T> {
  // constructor(fetcher: SimpleRestNew<T>, params: coda.ParamValues<coda.ParamDefs>) {
  //   super(collectionResource, fetcher, params);
  // }

  setSyncParams() {
    const [syncMetafields, created_at, updated_at, published_at, handle, ids, product_id, published_status, title] =
      this.codaParams as SyncTableParamValues<typeof Sync_Collections>;
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, collectionFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      handle,
      product_id,
      title,
      published_status,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      published_at_min: published_at ? published_at[0] : undefined,
      published_at_max: published_at ? published_at[1] : undefined,
    });
  }
}

export class CollectionRestFetcher extends CollectionRestFetcherBase<CollectionSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(collectionResource, context);
  }
}

export class CustomCollectionRestFetcher extends CollectionRestFetcherBase<CustomCollectionSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(customCollectionResource, context);
  }
}
class CustomCollectionSyncTable extends CollectionSyncTableBase<CustomCollectionSyncTableType> {
  constructor(fetcher: CustomCollectionRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(customCollectionResource, fetcher, params);
  }

  afterSync(response: MultipleFetchResponse<CustomCollectionSyncTableType>) {
    let { restItems, continuation: superContinuation } = super.afterSync(response);

    /**
     * If we have no more items to sync, we need to sync smart collections
     */
    if (!superContinuation?.nextUrl) {
      const restType = COLLECTION_TYPE__SMART;
      const nextCollectionSyncTable = Collection.getSyncTableOfType(restType, this.codaParams, this.fetcher.context);
      nextCollectionSyncTable.setSyncUrl();
      this.extraContinuationData = {
        ...superContinuation?.extraContinuationData,
        restType,
      };

      superContinuation = {
        ...superContinuation,
        nextUrl: nextCollectionSyncTable.syncUrl,
        extraContinuationData: this.extraContinuationData,
      };
    }

    return { restItems, continuation: superContinuation };
  }
}

class SmartCollectionRestFetcher extends CollectionRestFetcherBase<SmartCollectionSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(smartCollectionResource, context);
  }
}

export class CollectRestFetcher extends SimpleRestNew<CollectSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(collectResource, context);
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
export class CollectSyncTable extends SyncTableRestNew<CollectSyncTableType> {
  constructor(fetcher: CollectRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(collectResource, fetcher, params);
  }
  setSyncParams() {
    const [collectionId] = this.codaParams as SyncTableParamValues<typeof Sync_Collects>;
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, collectionFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: REST_DEFAULT_LIMIT,
      collection_id: collectionId,
    });

    return this.syncParams;
  }
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
