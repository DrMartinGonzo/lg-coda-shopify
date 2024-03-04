// #region Imports
import * as coda from '@codahq/packs-sdk';

import { IDENTITY_ORDER_LINE_ITEM, REST_DEFAULT_LIMIT } from '../constants';
import { OrderLineItemSyncTableSchema } from '../schemas/syncTable/OrderLineItemSchema';
import { filters } from '../shared-parameters';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { getSchemaCurrencyCode } from '../shop/shop-functions';
import { OrderRestFetcher } from '../orders/orders-functions';

import type { OrderLineItemRow } from '../types/CodaRows';
import type { Order as OrderRest } from '@shopify/shopify-api/rest/admin/2023-10/order';
import type { SyncTableRestContinuation } from '../types/tableSync';

// #endregion

async function getOrderLineItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = OrderLineItemSyncTableSchema;

  const shopCurrencyCode = await getSchemaCurrencyCode(context);

  // Main props
  augmentedSchema.properties.price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_discount['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;

  return augmentedSchema;
}

// #region Sync tables
export const Sync_OrderLineItems = coda.makeSyncTable({
  name: 'OrderLineItems',
  description: 'Return OrderLineItems from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_ORDER_LINE_ITEM,
  schema: OrderLineItemSyncTableSchema,
  dynamicOptions: {
    getSchema: getOrderLineItemSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderLineItems',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.order.status, name: 'orderStatus' },

      { ...filters.general.createdAtRange, name: 'orderCreatedAt', optional: true },
      { ...filters.general.updatedAtRange, name: 'orderUpdatedAt', optional: true },
      { ...filters.general.processedAtRange, name: 'orderProcessedAt', optional: true },
      { ...filters.order.financialStatus, name: 'orderFinancialStatus', optional: true },
      { ...filters.order.fulfillmentStatus, name: 'orderFulfillmentStatus', optional: true },
      { ...filters.order.idArray, optional: true },
      {
        ...filters.general.sinceId,
        name: 'sinceOrderId',
        description: 'Filter results created after the specified order ID.',
        optional: true,
      },
    ],
    execute: async function (
      [
        orderStatus = 'any',
        orderCreatedAt,
        orderUpdatedAt,
        orderProcessedAt,
        orderFinancialStatus,
        orderFulfillmentStatus,
        orderIds,
        ordersSinceId,
      ],
      context
    ) {
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      let restLimit = REST_DEFAULT_LIMIT;
      let restItems: Array<OrderLineItemRow> = [];
      let restContinuation: SyncTableRestContinuation = null;

      // Rest Admin API Sync
      const restParams = cleanQueryParams({
        fields: ['id', 'name', 'line_items'].join(', '),
        limit: restLimit,
        ids: orderIds && orderIds.length ? orderIds.join(',') : undefined,
        financial_status: orderFinancialStatus,
        fulfillment_status: orderFulfillmentStatus,
        status: orderStatus,
        since_id: ordersSinceId,
        created_at_min: orderCreatedAt ? orderCreatedAt[0] : undefined,
        created_at_max: orderCreatedAt ? orderCreatedAt[1] : undefined,
        updated_at_min: orderUpdatedAt ? orderUpdatedAt[0] : undefined,
        updated_at_max: orderUpdatedAt ? orderUpdatedAt[1] : undefined,
        processed_at_min: orderProcessedAt ? orderProcessedAt[0] : undefined,
        processed_at_max: orderProcessedAt ? orderProcessedAt[1] : undefined,
      });

      const orderFetcher = new OrderRestFetcher(context);
      orderFetcher.validateParams(restParams);
      const url: string = prevContinuation?.nextUrl
        ? coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit })
        : orderFetcher.getFetchAllUrl(restParams);

      const { response, continuation } = await makeSyncTableGetRequest<{ orders: OrderRest[] }>({ url }, context);
      restContinuation = continuation;

      if (response?.body?.orders) {
        restItems = response.body.orders
          .map((order) => order.line_items.map((line_item) => orderFetcher.formatLineItemToRow(line_item, order)))
          .flat();
      }

      return {
        result: restItems,
        continuation: restContinuation,
      };
    },
  },
});
// #endregion
