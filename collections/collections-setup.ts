// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CollectSyncTableSchema, collectFieldDependencies } from '../schemas/syncTable/CollectSchema';
import { CollectionSyncTableSchema, collectionFieldDependencies } from '../schemas/syncTable/CollectionSchema';
import {
  CollectionRestFetcher,
  CustomCollectionRestFetcher,
  CollectRestFetcher,
  Collection,
} from './collections-functions';

import {
  CACHE_DEFAULT,
  COLLECTION_TYPE__CUSTOM,
  COLLECTION_TYPE__SMART,
  IDENTITY_COLLECT,
  IDENTITY_COLLECTION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { filters, inputs } from '../shared-parameters';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  parseMetafieldsCodaInput,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { QueryCollectionsMetafieldsAdmin, buildCollectionsSearchQuery } from './collections-graphql';
import { getTemplateSuffixesFor } from '../themes/themes-functions';

import { MetafieldOwnerType } from '../types/admin.types';
import type { Collect as CollectRest } from '@shopify/shopify-api/rest/admin/2023-10/collect';
import type { CollectionCreateRestParams, CollectionSyncTableRestParams } from '../types/Collection';
import type { CollectRow, CollectionRow } from '../types/CodaRows';
import type { CollectSyncTableRestParams } from '../types/Collect';
import type { GetCollectionsMetafieldsQuery, GetCollectionsMetafieldsQueryVariables } from '../types/admin.generated';
import type { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';

// #endregion

async function getCollectionSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = CollectionSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(
      CollectionSyncTableSchema,
      MetafieldOwnerType.Collection,
      context
    );
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync tables
export const Sync_Collects = coda.makeSyncTable({
  name: 'Collects',
  description: 'Return Collects from this shop. The Collect resource connects a product to a custom collection.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_COLLECT,
  schema: CollectSyncTableSchema,
  formula: {
    name: 'SyncCollects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [{ ...filters.collection.id, optional: true }],
    execute: async ([collectionId], context: coda.SyncExecutionContext) => {
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
      const syncedFields = handleFieldDependencies(effectivePropertyKeys, collectFieldDependencies);

      const restParams = cleanQueryParams({
        fields: syncedFields.join(', '),
        limit: REST_DEFAULT_LIMIT,
        collection_id: collectionId,
      } as CollectSyncTableRestParams);

      const collectFetcher = new CollectRestFetcher(context);
      let url = prevContinuation?.nextUrl ?? collectFetcher.getFetchAllUrl(restParams);

      let restItems: Array<CollectRow> = [];
      let { response, continuation } = await makeSyncTableGetRequest<{ collects: CollectRest[] }>({ url }, context);
      if (response?.body?.collects) {
        restItems = response.body.collects.map(collectFetcher.formatApiToRow);
      }

      return { result: restItems, continuation };
    },
  },
});

export const Sync_Collections = coda.makeSyncTable({
  name: 'Collections',
  description:
    'Return Collections from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_COLLECTION,
  schema: CollectionSyncTableSchema,
  dynamicOptions: {
    getSchema: getCollectionSchema,
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor('collection', context);
      }
    },
  },
  formula: {
    name: 'SyncCollections',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },

      { ...filters.general.handle, optional: true },
      { ...filters.collection.idArray, optional: true },
      { ...filters.product.id, name: 'productId', optional: true },

      { ...filters.general.publishedStatus, optional: true },
      { ...filters.general.title, optional: true },
    ],
    execute: async function (
      [syncMetafields, created_at, updated_at, published_at, handle, ids, product_id, published_status, title],
      context: coda.SyncExecutionContext
    ) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema =
        context.sync.schema ?? (await wrapGetSchemaForCli(getCollectionSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      let restLimit = REST_DEFAULT_LIMIT;
      let maxEntriesPerRun = restLimit;
      let shouldDeferBy = 0;

      if (shouldSyncMetafields) {
        // TODO: calc this
        const defaultMaxEntriesPerRun = 200;
        const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        maxEntriesPerRun = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
        restLimit = maxEntriesPerRun;
        shouldDeferBy = syncTableMaxEntriesAndDeferWait.shouldDeferBy;
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
        }
      }

      let restItems: Array<CollectionRow> = [];
      let restContinuation: SyncTableRestContinuation | null = null;
      const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

      let restType = prevContinuation?.extraContinuationData?.restType ?? COLLECTION_TYPE__CUSTOM;

      // Rest Admin API Sync
      if (!skipNextRestSync) {
        const syncedStandardFields = handleFieldDependencies(standardFromKeys, collectionFieldDependencies);
        const restParams = cleanQueryParams({
          fields: syncedStandardFields.join(', '),
          limit: restLimit,
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
        } as CollectionSyncTableRestParams);

        const collectionFetcher = Collection.getFetcherOfType(restType, context);
        collectionFetcher.validateParams(restParams);

        const url: string = prevContinuation?.nextUrl
          ? coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit })
          : collectionFetcher.getFetchAllUrl(restParams);

        const { response, continuation } = await makeSyncTableGetRequest(
          { url, extraContinuationData: { restType } },
          context
        );
        restContinuation = continuation;

        if (response?.body[collectionFetcher.plural]) {
          restItems = response.body[collectionFetcher.plural].map(collectionFetcher.formatApiToRow);
        }

        // finished syncing custom collections, we will sync smart collections in the next run
        if (collectionFetcher instanceof CustomCollectionRestFetcher && !restContinuation?.nextUrl) {
          restType = COLLECTION_TYPE__SMART;
          const nextCollectionFetcher = Collection.getFetcherOfType(restType, context);
          restContinuation = {
            ...restContinuation,
            nextUrl: nextCollectionFetcher.getFetchAllUrl(restParams),
            extraContinuationData: {
              ...restContinuation?.extraContinuationData,
              restType,
            },
          };
        }

        if (!shouldSyncMetafields) {
          return {
            result: restItems,
            continuation: restContinuation,
          };
        }
      }

      // GraphQL Admin API metafields augmented Sync
      if (shouldSyncMetafields) {
        const { toProcess, remaining } = getMixedSyncTableRemainingAndToProcessItems(
          prevContinuation,
          restItems,
          maxEntriesPerRun
        );
        const uniqueIdsToFetch = arrayUnique(toProcess.map((c) => c.id)).sort();
        const graphQlPayload = {
          query: QueryCollectionsMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildCollectionsSearchQuery({ ids: uniqueIdsToFetch }),
          } as GetCollectionsMetafieldsQueryVariables,
        };

        let { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeMixedSyncTableGraphQlRequest(
            {
              payload: graphQlPayload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableMixedContinuation,
              nextRestUrl: restContinuation?.nextUrl,
              extraContinuationData: {
                restType,
                currentBatch: {
                  remaining: remaining,
                  processing: toProcess,
                },
              },
              getPageInfo: (data: GetCollectionsMetafieldsQuery) => data.collections?.pageInfo,
            },
            context
          );

        if (augmentedResponse?.body?.data) {
          const collectionsData = augmentedResponse.body.data as GetCollectionsMetafieldsQuery;
          const augmentedItems = toProcess
            .map((resource) => {
              const graphQlNodeMatch = collectionsData.collections.nodes.find(
                (c) => graphQlGidToId(c.id) === resource.id
              );

              // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
              if (!graphQlNodeMatch) return;

              if (graphQlNodeMatch?.metafields?.nodes?.length) {
                graphQlNodeMatch.metafields.nodes.forEach((metafield) => {
                  const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
                  resource[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
                });
              }
              return resource;
            })
            .filter((p) => p); // filter out undefined items

          return {
            result: augmentedItems,
            continuation: augmentedContinuation,
          };
        }

        return {
          result: [],
          continuation: augmentedContinuation,
        };
      }

      return {
        result: [],
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Collection.executeSyncTableUpdate(updates, context);
    },
  },
});
// #endregion

// #region Actions
export const Action_CreateCollection = coda.makeFormula({
  name: 'CreateCollection',
  description: `Create a new Shopify Collection and return its ID. The collection will be unpublished by default.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.general.title, description: 'The name of the collection.' },

    // optional parameters
    { ...inputs.collection.bodyHtml, optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.imageUrl, optional: true },
    { ...inputs.general.imageAlt, optional: true },
    { ...inputs.general.published, description: 'Whether the collection is visible.', optional: true },
    { ...inputs.collection.templateSuffix, optional: true },
    { ...inputs.general.metafields, optional: true, description: 'Collection metafields to create.' },
  ],

  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, body_html, handle, image_url, image_alt_text, published, template_suffix, metafields],
    context
  ) {
    const defaultPublishedStatus = false;
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    let newRow: Partial<CollectionRow> = {
      title,
      body_html,
      handle,
      published: published ?? defaultPublishedStatus,
      template_suffix,
      image_url,
      image_alt_text,
    };

    // TODO: support creating smart collections
    const collectionFetcher = new CustomCollectionRestFetcher(context);
    const restParams = collectionFetcher.formatRowToApi(newRow, metafieldKeyValueSets) as CollectionCreateRestParams;
    const response = await collectionFetcher.create(restParams);
    return response?.body?.custom_collection.id;
  },
});

export const Action_UpdateCollection = coda.makeFormula({
  name: 'UpdateCollection',
  description: 'Update an existing Shopify collection and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.collection.id,

    // optional parameters
    { ...inputs.collection.bodyHtml, optional: true },
    { ...inputs.general.title, description: 'The title of the collection.', optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.imageUrl, optional: true },
    { ...inputs.general.imageAlt, optional: true },
    { ...inputs.general.published, description: 'Whether the collection is visible.', optional: true },
    { ...inputs.collection.templateSuffix, optional: true },
    { ...inputs.general.metafields, optional: true, description: 'Collection metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(CollectionSchema, IDENTITY_COLLECTION),
  schema: CollectionSyncTableSchema,
  execute: async (
    [collectionId, bodyHtml, title, handle, imageUrl, imageAlt, published, templateSuffix, metafields],
    context
  ) => {
    let row: CollectionRow = {
      id: collectionId,
      body_html: bodyHtml,
      handle,
      published,
      template_suffix: templateSuffix,
      title,
      image_alt_text: imageAlt,
      image_url: imageUrl,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    const collectionFetcher = await Collection.getFetcher(collectionId, context);
    return collectionFetcher.updateWithMetafields({ original: undefined, updated: row }, metafieldKeyValueSets);
  },
});

export const Action_DeleteCollection = coda.makeFormula({
  name: 'DeleteCollection',
  description: 'Delete an existing Shopify Collection and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.collection.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([collectionId], context) {
    const collectionFetcher = await Collection.getFetcher(collectionId, context);
    await collectionFetcher.delete(collectionId);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Collection = coda.makeFormula({
  name: 'Collection',
  description: 'Return a single collection from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.collection.id,
    //! field filter Doesn't seem to work
    // { ...sharedParameters.filterFields, optional: true }
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CollectionSyncTableSchema,
  execute: async function ([collectionId], context) {
    const collectionFetcher = new CollectionRestFetcher(context);
    const collectionResponse = await collectionFetcher.fetch(collectionId);
    if (collectionResponse?.body?.collection) {
      return collectionFetcher.formatApiToRow(collectionResponse.body.collection);
    }
  },
});

export const Format_Collection: coda.Format = {
  name: 'Collection',
  instructions: 'Paste the collection ID into the column.',
  formulaName: 'Collection',
};

/*
pack.addFormula({
  name: 'Collect',
  description: 'Get a single collect data.',
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'collectID',
      description: 'The ID of the collection.',
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'fields',
      description: 'Retrieve only certain fields, specified by a comma-separated list of fields names.',
      optional: true,
    }),
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CollectSchema,
  execute: fetchCollect,
});
*/
// #endregion
