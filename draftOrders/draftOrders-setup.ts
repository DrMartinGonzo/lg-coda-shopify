// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT, IDENTITY_DRAFT_ORDER, REST_DEFAULT_LIMIT } from '../constants';
import { DraftOrderRestFetcher } from './draftOrders-functions';
import { orderFieldDependencies } from '../schemas/syncTable/OrderSchema';
import { filters, inputs } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  parseMetafieldsCodaInput,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { ShopRestFetcher } from '../shop/shop-functions';
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
import { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';

import type { DraftOrder as DraftOrderRest } from '@shopify/shopify-api/rest/admin/2023-10/draft_order';
import type { DraftOrderRow } from '../types/CodaRows';
import type { DraftOrderSyncTableRestParams } from '../types/DraftOrder';
import type { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';

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

  const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();

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

      let restItems: Array<DraftOrderRow> = [];
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
        const draftOrderFetcher = new DraftOrderRestFetcher(context);
        draftOrderFetcher.validateParams(restParams);

        const url: string = prevContinuation?.nextUrl
          ? coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit })
          : draftOrderFetcher.getFetchAllUrl(restParams);

        const { response, continuation } = await makeSyncTableGetRequest<{ draft_orders: DraftOrderRest }>(
          { url },
          context
        );
        restContinuation = continuation;

        if (response?.body?.draft_orders) {
          restItems = response.body.draft_orders.map(draftOrderFetcher.formatApiToRow);
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
      return new DraftOrderRestFetcher(context).executeSyncTableUpdate(updates);
    },
  },
});
// #endregion

// #region Actions
// TODO: CreateDraftOrder
// export const Action_CreateDraftOrder = coda.makeFormula({
//   name: 'CreateDraftOrder',
//   description: 'Create a new Shopify draft order and return its ID.',
//   connectionRequirement: coda.ConnectionRequirement.Required,
//   parameters: [inputs.draftOrder.id],
//   isAction: true,
//   resultType: coda.ValueType.Boolean,
//   execute: async function ([draftOrderId], context) {},
// });

// TODO: UpdateDraftOrder
export const Action_UpdateDraftOrder = coda.makeFormula({
  name: 'UpdateDraftOrder',
  description: 'Update a draft order and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.draftOrder.id,

    // optional parameters
    { ...inputs.customer.email, description: "The customer's email address.", optional: true },
    {
      ...inputs.customer.note,
      description: 'A note that a merchant can attach to the draft order.',
      optional: true,
    },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.general.metafields, optional: true, description: 'DraftOrder metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ArticleSchema, IDENTITY_ARTICLE),
  schema: DraftOrderSyncTableSchema,
  execute: async function ([draftOrderId, email, note, tags, metafields], context) {
    let row: DraftOrderRow = {
      name: undefined, // shut up the typescript error
      id: draftOrderId,
      email,
      note,
      tags: tags ? tags.join(',') : undefined,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    const draftOrderFetcher = new DraftOrderRestFetcher(context);
    return draftOrderFetcher.updateWithMetafields({ original: undefined, updated: row }, metafieldKeyValueSets);
  },
});

export const Action_CompleteDraftOrder = coda.makeFormula({
  name: 'CompleteDraftOrder',
  description:
    'Completes a draft order. Will be set as `payed` with default payment Gateway unless paymentPending is set to `true`.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.draftOrder.id,
    //optional parameters
    { ...inputs.draftOrder.paymentGatewayId, optional: true },
    { ...inputs.draftOrder.paymentPending, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId, payment_gateway_id, payment_pending], context) {
    await new DraftOrderRestFetcher(context).complete(draftOrderId, { payment_gateway_id, payment_pending });
    return true;
  },
});

export const Action_SendDraftOrderInvoice = coda.makeFormula({
  name: 'SendDraftOrderInvoice',
  description:
    'Sends an invoice for the draft order. You can customize the message and who to send the invoice to/from. Return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.draftOrder.id,

    //optional parameters
    { ...inputs.general.emailTo, optional: true },
    { ...inputs.general.emailFrom, optional: true },
    { ...inputs.general.emailBcc, optional: true },
    { ...inputs.general.emailSubject, optional: true },
    { ...inputs.general.emailMessage, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId, to, from, bcc, subject, custom_message], context) {
    await new DraftOrderRestFetcher(context).sendInvoice(draftOrderId, {
      to,
      from,
      bcc,
      subject,
      custom_message,
    });
    return true;
  },
});

export const Action_DeleteDraftOrder = coda.makeFormula({
  name: 'DeleteDraftOrder',
  description: 'Delete an existing Shopify draft order and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.draftOrder.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId], context) {
    await new DraftOrderRestFetcher(context).delete(draftOrderId);
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
    const draftOrderFetcher = new DraftOrderRestFetcher(context);
    const response = await draftOrderFetcher.fetch(draftOrderId);
    if (response?.body?.draft_order) {
      return draftOrderFetcher.formatApiToRow(response.body.draft_order);
    }
  },
});

export const Format_DraftOrder: coda.Format = {
  name: 'DraftOrder',
  instructions: 'Paste the ID of the DraftOrder into the column.',
  formulaName: 'DraftOrder',
};
// #endregion
