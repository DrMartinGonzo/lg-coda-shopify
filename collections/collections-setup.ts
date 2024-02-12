import * as coda from '@codahq/packs-sdk';

import { CollectSchema, collectFieldDependencies } from '../schemas/syncTable/CollectSchema';
import { CollectionSchema, collectionFieldDependencies } from '../schemas/syncTable/CollectionSchema';
import {
  getCollectionTypeGraphQl,
  deleteCollectionRest,
  createCollectionRest,
  formatCollectionForSchemaFromRestApi,
  fetchCollectionRest,
  validateCollectionParams,
  handleCollectionUpdateJob,
  formatCollectionStandardFieldsRestParams,
  formatCollect,
} from './collections-functions';

import {
  CACHE_MINUTE,
  IDENTITY_COLLECTION,
  METAFIELD_PREFIX_KEY,
  RESOURCE_COLLECTION,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { sharedParameters } from '../shared-parameters';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  idToGraphQlGid,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { augmentSchemaWithMetafields } from '../metafields/metafields-functions';
import { MetafieldOwnerType, MetafieldRestInput } from '../types/Metafields';
import { arrayUnique, compareByDisplayKey, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  getMetaFieldRealFromKey,
  formatMetafieldsForSchema,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
  findMatchingMetafieldDefinition,
} from '../metafields/metafields-functions';
import {
  GetCollectionsMetafieldsQuery,
  GetCollectionsMetafieldsQueryVariables,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import { QueryCollectionsMetafieldsAdmin, buildCollectionsSearchQuery } from './collections-graphql';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { CollectionCreateRestParams } from '../types/Collection';
import { getTemplateSuffixesFor } from '../themes/themes-functions';

async function getCollectionSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = CollectionSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(CollectionSchema, MetafieldOwnerType.Collection, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}
/**
 * The properties that can be updated when updating a collection.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'Body HTML', key: 'body_html', type: 'string' },
  { display: 'title', key: 'title', type: 'string' },
  { display: 'Handle', key: 'handle', type: 'string' },
  { display: 'Image URL', key: 'image_url', type: 'string' },
  { display: 'Image alt text', key: 'image_alt_text', type: 'string' },
  { display: 'Published', key: 'published', type: 'boolean' },
  { display: 'Template suffix', key: 'template_suffix', type: 'string' },
];

const standardCreateProps = [...standardUpdateProps.filter((prop) => prop.key !== 'title')];

const parameters = {
  collectionID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'collectionId',
    description: 'The ID of the collection.',
  }),
};

export const setupCollections = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync tables
  pack.addSyncTable({
    name: 'Collects',
    description: 'Return Collects from this shop. The Collect resource connects a product to a custom collection.',
    identityName: 'Collect',
    schema: CollectSchema,
    formula: {
      name: 'SyncCollects',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        {
          ...parameters.collectionID,
          description: 'Retrieve only collects for a certain collection identified by its ID.',
          optional: true,
        },
      ],
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
        if (response && response.body?.collects) {
          restResult = response.body.collects.map((collect) => formatCollect(collect, context));
        }

        return { result: restResult, continuation };
      },
    },
  });

  pack.addSyncTable({
    name: 'Collections',
    description:
      'Return Collections from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse.',
    identityName: IDENTITY_COLLECTION,
    schema: CollectionSchema,
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
        sharedParameters.optionalSyncMetafields,
        { ...sharedParameters.filterCreatedAtRange, optional: true },
        { ...sharedParameters.filterUpdatedAtRange, optional: true },
        { ...sharedParameters.filterPublishedAtRange, optional: true },

        { ...sharedParameters.filterHandle, optional: true },
        { ...sharedParameters.filterIds, optional: true },
        { ...sharedParameters.filterProductId, optional: true },

        { ...sharedParameters.filterPublishedStatus, optional: true },
        { ...sharedParameters.filterTitle, optional: true },
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

        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

        let restLimit = REST_DEFAULT_LIMIT;
        let maxEntriesPerRun = restLimit;
        let shouldDeferBy = 0;
        let metafieldDefinitions: MetafieldDefinitionFragment[] = [];

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

          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Collection, context));
        }

        let restItems = [];
        let restContinuation: SyncTableRestContinuation = null;
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
          });

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

          if (response && response.body[restType]) {
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
                  metafieldDefinitions,
                  currentBatch: {
                    remaining: remaining,
                    processing: toProcess,
                  },
                },
                getPageInfo: (data: GetCollectionsMetafieldsQuery) => data.collections?.pageInfo,
              },
              context
            );

          if (augmentedResponse && augmentedResponse.body?.data) {
            const collectionsData = augmentedResponse.body.data as GetCollectionsMetafieldsQuery;
            const augmentedItems = toProcess
              .map((collection) => {
                const graphQlNodeMatch = collectionsData.collections.nodes.find(
                  (c) => graphQlGidToId(c.id) === collection.id
                );

                // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
                if (!graphQlNodeMatch) return;

                if (graphQlNodeMatch?.metafields?.nodes?.length) {
                  return {
                    ...collection,
                    ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes, metafieldDefinitions),
                  };
                }
                return collection;
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
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Collection, context)
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
  // UpdateCollection Action
  pack.addFormula({
    name: 'UpdateCollection',
    description: 'Update an existing Shopify collection and return the updated data.',
    parameters: [parameters.collectionID],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The collection property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Collection,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    // TODO: keep this for all but disable the update for relation columns
    // TODO: ask on coda community: on fait comment pour que update les trucs dynamiques ? Genre les metafields ?
    schema: coda.withIdentity(CollectionSchema, IDENTITY_COLLECTION),
    execute: async ([collectionId, ...varargs], context) => {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      // TODO: type is not perfect here
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Collection, context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: collectionId },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

      return handleCollectionUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // CreateCollection Action
  pack.addFormula({
    name: 'CreateCollection',
    description: `Create a new Shopify Collection and return GraphQl GID.`,

    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'title',
        description: 'The name of the collection.',
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The collection property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Collection,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    // TODO: support creating smart collections
    // Collections are unpublished by default
    execute: async function ([title, ...varargs], context) {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Collection, context);

      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardCreateProps, metafieldUpdateCreateProps);
      const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(
        Object.keys(newValues)
      );

      // We can use Rest Admin API to create metafields
      let metafieldRestInputs: MetafieldRestInput[] = [];
      prefixedMetafieldFromKeys.forEach((fromKey) => {
        const realFromKey = getMetaFieldRealFromKey(fromKey);
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
        const matchingMetafieldDefinition = findMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
        const input: MetafieldRestInput = {
          namespace: metaNamespace,
          key: metaKey,
          value: newValues[fromKey],
          type: matchingMetafieldDefinition?.type.name,
        };
        metafieldRestInputs.push(input);
      });

      const params: CollectionCreateRestParams = {
        title,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
        // @ts-ignore
        ...formatCollectionStandardFieldsRestParams(standardFromKeys, newValues),
      };
      // default to unpublished for collection creation
      if (params.published === undefined) {
        params.published = false;
      }

      const response = await createCollectionRest(params, context);
      return response.body.custom_collection.id;
    },
  });

  // DeleteCollection Action
  pack.addFormula({
    name: 'DeleteCollection',
    description: 'Delete an existing Shopify Collection and return true on success.',
    parameters: [parameters.collectionID],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([collectionId], context) {
      const collectionType = await getCollectionTypeGraphQl(idToGraphQlGid(RESOURCE_COLLECTION, collectionId), context);
      await deleteCollectionRest(collectionId, collectionType, context);
      return true;
    },
  });
  // #endregion

  // #region Formulas
  // Collection Formula
  pack.addFormula({
    name: 'Collection',
    description: 'Return a single collection from this shop.',
    parameters: [
      parameters.collectionID,
      //! field filter Doesn't seem to work
      // { ...sharedParameters.filterFields, optional: true }
    ],
    // cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CollectionSchema,
    execute: async function ([collectionId], context) {
      const response = await fetchCollectionRest(collectionId, context);
      if (response.body.collection) {
        return formatCollectionForSchemaFromRestApi(response.body.collection, context);
      }
    },
  });

  // Collection Column Format
  pack.addColumnFormat({
    name: 'Collection',
    instructions: 'Paste the collection Id into the column.',
    formulaName: 'Collection',
  });

  /*
  pack.addFormula({
    name: 'Collect',
    description: 'Get a single collect data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'collectID',
        description: 'The id of the collection.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'fields',
        description: 'Retrieve only certain fields, specified by a comma-separated list of fields names.',
        optional: true,
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CollectSchema,
    execute: fetchCollect,
  });
  */
  // #endregion
};
