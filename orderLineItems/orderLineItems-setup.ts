import * as coda from '@codahq/packs-sdk';

import {
  CODA_SUPORTED_CURRENCIES,
  IDENTITY_ORDER_LINE_ITEM,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { formatOrderLineItemForSchemaFromRestApi, validateOrderLineItemParams } from './orderLineItems-functions';
import { OrderLineItemSchema } from '../schemas/syncTable/OrderLineItemSchema';
import { sharedParameters } from '../shared-parameters';

import { SyncTableRestContinuation } from '../types/tableSync';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { fetchShopDetails } from '../shop/shop-functions';

async function getOrderLineItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = OrderLineItemSchema;
  // let augmentedSchema = OrderSchema;

  const shop = await fetchShopDetails(['currency'], context);
  if (shop && shop['currency']) {
    let currencyCode = shop['currency'];
    if (!CODA_SUPORTED_CURRENCIES.includes(currencyCode)) {
      console.error(`Shop currency ${currencyCode} not supported. Falling back to USD.`);
      currencyCode = 'USD';
    }

    // Main props
    augmentedSchema.properties.price.currencyCode = currencyCode;
    augmentedSchema.properties.total_discount.currencyCode = currencyCode;
    augmentedSchema.properties.discount_allocations.items.properties.amount.currencyCode = currencyCode;
  }

  return augmentedSchema;
}

const parameters = {
  orderIds: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'orderIds',
    description: 'Retrieve only orders specified by a comma-separated list of order IDs.',
  }),
  since_id: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'ordersSinceId',
    description: 'Retrieve only orders after the specified ID.',
  }),
};

export const setupOrderLineItems = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync tables
  // OrderLineItems sync table
  pack.addSyncTable({
    name: 'OrderLineItems',
    description: 'All Shopify OrderLineItems',
    identityName: IDENTITY_ORDER_LINE_ITEM,
    schema: OrderLineItemSchema,
    dynamicOptions: {
      getSchema: getOrderLineItemSchema,
      defaultAddDynamicColumns: false,
    },
    formula: {
      name: 'SyncOrderLineItems',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        { ...sharedParameters.orderStatus, name: 'orderStatus' },

        { ...sharedParameters.filterCreatedAtRange, optional: true, name: 'orderCreatedAt' },
        { ...sharedParameters.filterUpdatedAtRange, optional: true, name: 'orderUpdatedAt' },
        { ...sharedParameters.filterProcessedAtRange, optional: true, name: 'orderProcessedAt' },

        { ...sharedParameters.filterFinancialStatus, optional: true, name: 'orderFinancialStatus' },
        { ...sharedParameters.filterFulfillmentStatus, optional: true, name: 'orderFulfillmentStatus' },
        { ...parameters.orderIds, optional: true },
        { ...parameters.since_id, optional: true },
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
        let restItems = [];
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

        validateOrderLineItemParams(restParams);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders.json`,
            restParams
          );
        }
        const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
        restContinuation = continuation;

        if (response && response.body?.orders) {
          restItems = response.body.orders
            .map((order) =>
              order.line_items.map((line_item) => formatOrderLineItemForSchemaFromRestApi(line_item, order, context))
            )
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
};
