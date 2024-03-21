// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { filters } from '../../shared-parameters';
import { ShopRestFetcher } from '../shop/ShopRestFetcher';
import { OrderRestFetcher } from '../orders/OrderRestFetcher';
import { OrderLineItemSyncTable } from './OrderLineItemSyncTable';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { Identity } from '../../constants';

import type { OrderRow } from '../../schemas/CodaRows.types';
import { deepCopy } from '../../utils/helpers';

// #endregion

async function getOrderLineItemSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = deepCopy(OrderLineItemSyncTableSchema);

  const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();

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
  identityName: Identity.OrderLineItem,
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
    execute: async function (params, context) {
      const orderFetcher = new OrderRestFetcher(context);
      const orderLineItemSyncTable = new OrderLineItemSyncTable(orderFetcher, params);
      const { result, continuation } = await orderLineItemSyncTable.executeSync(OrderLineItemSyncTableSchema);

      return {
        result: result
          .map((order: OrderRow) =>
            order.line_items.map((orderLineItem) => ({
              ...orderLineItem,
              order_id: order.id,
              order: formatOrderReference(order.id, order.name),
              variant: formatProductVariantReference(orderLineItem.variant_id, orderLineItem.variant_title),
            }))
          )
          .flat(),
        continuation,
      };
    },
  },
});
// #endregion
