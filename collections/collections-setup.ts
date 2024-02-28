// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CollectSyncTableSchema, collectFieldDependencies } from '../schemas/syncTable/CollectSchema';
import { CollectionSyncTableSchema, collectionFieldDependencies } from '../schemas/syncTable/CollectionSchema';
import {
  getCollectionTypeGraphQl,
  deleteCollectionRest,
  createCollectionRest,
  formatCollectionForSchemaFromRestApi,
  fetchSingleCollectionRest,
  validateCollectionParams,
  handleCollectionUpdateJob,
  formatCollect,
  updateCollectionRest,
} from './collections-functions';

import {
  CACHE_DEFAULT,
  IDENTITY_COLLECT,
  IDENTITY_COLLECTION,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { filters, inputs } from '../shared-parameters';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  idToGraphQlGid,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { GetCollectionsMetafieldsQuery, GetCollectionsMetafieldsQueryVariables } from '../types/admin.generated';
import { QueryCollectionsMetafieldsAdmin, buildCollectionsSearchQuery } from './collections-graphql';
import {
  CollectionCreateRestParams,
  CollectionSyncTableRestParams,
  CollectionUpdateRestParams,
} from '../types/Collection';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { restResources } from '../types/RequestsRest';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { ObjectSchemaDefinitionType } from '@codahq/packs-sdk/dist/schema';

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

      const params = cleanQueryParams({
        fields: syncedFields.join(', '),
        limit: REST_DEFAULT_LIMIT,
        collection_id: collectionId,
      });

      let url =
        prevContinuation?.nextUrl ??
        coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/collects.json`, params);

      let restResult = [];
      let { response, continuation } = await makeSyncTableGetRequest({ url }, context);
      if (response?.body?.collects) {
        restResult = response.body.collects.map((collect) => formatCollect(collect, context));
      }

      return { result: restResult, continuation };
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

      let restItems: Array<ObjectSchemaDefinitionType<any, any, typeof CollectionSyncTableSchema>> = [];
      let restContinuation: SyncTableRestContinuation | null = null;
      const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

      let restType = prevContinuation?.extraContinuationData?.restType ?? 'custom_collections';

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

        validateCollectionParams(restParams);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${restType}.json`,
            restParams
          );
        }
        const { response, continuation } = await makeSyncTableGetRequest(
          {
            url,
            extraContinuationData: { restType },
          },
          context
        );
        restContinuation = continuation;

        if (response?.body[restType]) {
          restItems = response.body[restType].map((collection) =>
            formatCollectionForSchemaFromRestApi(collection, context)
          );
        }

        // finished syncing custom collections, we will sync smart collections in the next run
        if (restType === 'custom_collections' && !restContinuation?.nextUrl) {
          restType = 'smart_collections';
          restContinuation = {
            ...restContinuation,
            nextUrl: coda.withQueryParams(
              `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${restType}.json`,
              restParams
            ),
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
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Collection }, context)
        : [];

      const jobs = updates.map((update) => handleCollectionUpdateJob(update, metafieldDefinitions, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
    },
  },
});
// #endregion

// #region Actions
export const Action_CreateCollection = coda.makeFormula({
  name: 'CreateCollection',
  description: `Create a new Shopify Collection and return GraphQl GID.`,
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
  resultType: coda.ValueType.String,
  // TODO: support creating smart collections
  // Collections are unpublished by default
  execute: async function (
    [title, bodyHtml, handle, imageUrl, imageAlt, published, templateSuffix, metafields],
    context
  ) {
    const restParams: CollectionCreateRestParams = {
      title,
      body_html: bodyHtml,
      handle,
      published,
      template_suffix: templateSuffix,
    };

    if (imageUrl) {
      restParams.image = {
        ...(restParams.image ?? {}),
        src: imageUrl,
      };
      if (imageAlt) {
        restParams.image.alt = imageAlt;
      }
    }

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((m) => JSON.parse(m));
      const metafieldRestInputs = parsedMetafieldKeyValueSets
        .map(formatMetafieldRestInputFromMetafieldKeyValueSet)
        .filter(Boolean);
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createCollectionRest(restParams, context);
    return response.body.custom_collection.id;
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
    const restParams: CollectionUpdateRestParams = {
      body_html: bodyHtml,
      handle,
      published,
      template_suffix: templateSuffix,
      title,
    };
    if (imageUrl) {
      restParams.image = { ...(restParams.image ?? {}), src: imageUrl };
    }
    if (imageAlt) {
      restParams.image = { ...(restParams.image ?? {}), alt: imageAlt };
    }

    const collectionType = await getCollectionTypeGraphQl(
      idToGraphQlGid(GraphQlResource.Collection, collectionId),
      context
    );

    const promises: (Promise<any> | undefined)[] = [];
    promises.push(updateCollectionRest(collectionId, collectionType, restParams, context));
    if (metafields && metafields.length) {
      // TODO: Je pense qu'on peut le faire avec GraphQL
      promises.push(
        updateAndFormatResourceMetafieldsRest(
          {
            ownerId: collectionId,
            ownerResource: restResources.Collection,
            metafieldKeyValueSets: metafields.map((s) => JSON.parse(s)),
            schemaWithIdentity: false,
          },
          context
        )
      );
    } else {
      promises.push(undefined);
    }

    const [restResponse, updatedFormattedMetafields] = await Promise.all(promises);
    const obj = {
      id: collectionId,
      ...(restResponse?.body[collectionType]
        ? formatCollectionForSchemaFromRestApi(restResponse.body[collectionType], context)
        : {}),
      ...(updatedFormattedMetafields ?? {}),
    };

    return obj;
  },
});

export const Action_DeleteCollection = coda.makeFormula({
  name: 'DeleteCollection',
  description: 'Delete an existing Shopify Collection and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.collection.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([collectionId], context) {
    const collectionType = await getCollectionTypeGraphQl(
      idToGraphQlGid(GraphQlResource.Collection, collectionId),
      context
    );
    await deleteCollectionRest(collectionId, collectionType, context);
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
    const response = await fetchSingleCollectionRest(collectionId, context);
    if (response.body.collection) {
      return formatCollectionForSchemaFromRestApi(response.body.collection, context);
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
