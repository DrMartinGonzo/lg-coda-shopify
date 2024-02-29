// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CACHE_DEFAULT,
  IDENTITY_DRAFT_ORDER,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  deleteDraftOrderRest,
  fetchSingleDraftOrderRest,
  formatDraftOrderForSchemaFromRestApi,
  handleDraftOrderUpdateJob,
  validateDraftOrderParams,
} from './draftOrders-functions';
import { orderFieldDependencies } from '../schemas/syncTable/OrderSchema';
import { filters, inputs } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { getSchemaCurrencyCode } from '../shop/shop-functions';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { GetDraftOrdersMetafieldsQuery, GetDraftOrdersMetafieldsQueryVariables } from '../types/admin.generated';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { QueryDraftOrdersMetafieldsAdmin, buildDraftOrdersSearchQuery } from './draftOrders-graphql';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { ObjectSchemaDefinitionType } from '@codahq/packs-sdk/dist/schema';
import { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';
import { DraftOrderSyncTableRestParams } from '../types/DraftOrder';

// #endregion

async function getDraftOrderSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = DraftOrderSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(
      DraftOrderSyncTableSchema,
      MetafieldOwnerType.Draftorder,
      context
    );
  }

  const shopCurrencyCode = await getSchemaCurrencyCode(context);
  // Line items
  [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
    properties.price['currencyCode'] = shopCurrencyCode;
    properties.total_discount['currencyCode'] = shopCurrencyCode;
    properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
  });

  // Tax lines
  [
    augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
    augmentedSchema.properties.tax_lines.items.properties,
    augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
  ].forEach((properties) => {
    properties.price['currencyCode'] = shopCurrencyCode;
  });

  // Main props
  augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;

  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync tables
export const Sync_DraftOrders = coda.makeSyncTable({
  name: 'DraftOrders',
  description:
    'Return DraftOrders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_DRAFT_ORDER,
  schema: DraftOrderSyncTableSchema,
  dynamicOptions: {
    getSchema: getDraftOrderSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncDraftOrders',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.draftOrder.status, optional: true },
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.draftOrder.idArray, optional: true },
      { ...filters.general.sinceId, optional: true },
    ],
    execute: async function ([status, syncMetafields, updated_at, ids, since_id], context) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema =
        context.sync.schema ?? (await wrapGetSchemaForCli(getDraftOrderSchema, context, { syncMetafields }));
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

      let restItems: Array<ObjectSchemaDefinitionType<any, any, typeof DraftOrderSyncTableSchema>> = [];
      let restContinuation: SyncTableRestContinuation | null = null;
      const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

      // Rest Admin API Sync
      if (!skipNextRestSync) {
        const syncedStandardFields = handleFieldDependencies(standardFromKeys, orderFieldDependencies);
        const restParams: DraftOrderSyncTableRestParams = cleanQueryParams({
          fields: syncedStandardFields.join(', '),
          limit: restLimit,
          ids: ids && ids.length ? ids.join(',') : undefined,
          status,
          since_id,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
        });
        validateDraftOrderParams(restParams);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/draft_orders.json`,
            restParams
          );
        }
        const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
        restContinuation = continuation;

        if (response?.body?.draft_orders) {
          restItems = response.body.draft_orders.map((draftOrder) =>
            formatDraftOrderForSchemaFromRestApi(draftOrder, context)
          );
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
          query: QueryDraftOrdersMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildDraftOrdersSearchQuery({ ids: uniqueIdsToFetch }),
          } as GetDraftOrdersMetafieldsQueryVariables,
        };

        let { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeMixedSyncTableGraphQlRequest(
            {
              payload: graphQlPayload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableMixedContinuation,
              nextRestUrl: restContinuation?.nextUrl,
              extraContinuationData: {
                currentBatch: {
                  remaining: remaining,
                  processing: toProcess,
                },
              },
              getPageInfo: (data: GetDraftOrdersMetafieldsQuery) => data.draftOrders?.pageInfo,
            },
            context
          );

        if (augmentedResponse?.body?.data) {
          const draftOrdersData = augmentedResponse.body.data as GetDraftOrdersMetafieldsQuery;
          const augmentedItems = toProcess
            .map((resource) => {
              const graphQlNodeMatch = draftOrdersData.draftOrders.nodes.find(
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
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Draftorder }, context)
        : [];

      const jobs = updates.map((update) => handleDraftOrderUpdateJob(update, metafieldDefinitions, context));
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
export const Action_DeleteDraftOrder = coda.makeFormula({
  name: 'DeleteDraftOrder',
  description: 'Delete an existing Shopify draft order and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.draftOrder.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId], context) {
    await deleteDraftOrderRest(draftOrderId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_DraftOrder = coda.makeFormula({
  name: 'DraftOrder',
  description: 'Get a single draft order data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.draftOrder.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: DraftOrderSyncTableSchema,
  execute: async function ([draftOrderId], context) {
    const response = await fetchSingleDraftOrderRest(draftOrderId, context);
    if (response?.body?.draft_order) {
      return formatDraftOrderForSchemaFromRestApi(response.body.draft_order, context);
    }
  },
});

export const Format_DraftOrder: coda.Format = {
  name: 'DraftOrder',
  instructions: 'Paste the ID of the DraftOrder into the column.',
  formulaName: 'DraftOrder',
};
// #endregion
