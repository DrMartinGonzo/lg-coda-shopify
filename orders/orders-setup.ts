// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT, CACHE_DISABLED, REST_DEFAULT_LIMIT } from '../constants';
import { OrderRestFetcher, OrderSyncTable, formatOrderForDocExport } from './orders-functions';
import { OrderSyncTableSchema } from '../schemas/syncTable/OrderSchema';
import { filters, inputs } from '../shared-parameters';
import { augmentSchemaWithMetafields } from '../metafields/metafields-functions';
import { wrapGetSchemaForCli } from '../helpers';
import { ShopRestFetcher } from '../shop/shop-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { cleanQueryParams, extractNextUrlPagination } from '../helpers-rest';
import { Identity } from '../constants';

import type { OrderRow } from '../typesNew/CodaRows';
import type { OrderSyncTableRestParams } from '../types/Order';

// #endregion

async function getOrderSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = OrderSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(OrderSyncTableSchema, MetafieldOwnerType.Order, context);
  }

  const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();
  // Refund order adjustments
  [augmentedSchema.properties.refunds.items.properties.order_adjustments.items.properties].forEach((properties) => {
    properties.amount['currencyCode'] = shopCurrencyCode;
    properties.tax_amount['currencyCode'] = shopCurrencyCode;
  });

  // Refund transactions
  [augmentedSchema.properties.refunds.items.properties.transactions.items.properties].forEach((properties) => {
    properties.amount['currencyCode'] = shopCurrencyCode;
    properties.totalUnsettled['currencyCode'] = shopCurrencyCode;
  });

  // Refund line items
  [augmentedSchema.properties.refunds.items.properties.refund_line_items.items.properties].forEach((properties) => {
    properties.subtotal['currencyCode'] = shopCurrencyCode;
    properties.total_tax['currencyCode'] = shopCurrencyCode;
  });

  // Line items
  [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
    properties.price['currencyCode'] = shopCurrencyCode;
    properties.total_discount['currencyCode'] = shopCurrencyCode;
    properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
  });

  // Shipping lines
  [augmentedSchema.properties.shipping_lines.items.properties].forEach((properties) => {
    properties.discounted_price['currencyCode'] = shopCurrencyCode;
    properties.price['currencyCode'] = shopCurrencyCode;
  });

  // Tax lines
  [
    augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
    augmentedSchema.properties.shipping_lines.items.properties.tax_lines.items.properties,
    augmentedSchema.properties.tax_lines.items.properties,
    augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
    augmentedSchema.properties.refunds.items.properties.duties.items.properties.tax_lines.items.properties,
  ].forEach((properties) => {
    properties.price['currencyCode'] = shopCurrencyCode;
  });

  // Main props
  augmentedSchema.properties.current_subtotal_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.current_total_additional_fees['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.current_total_discounts['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.current_total_duties['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.current_total_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.current_total_tax['currencyCode'] = shopCurrencyCode;

  augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;

  augmentedSchema.properties.total_discounts['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_line_items_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_outstanding['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_shipping_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_tip_received['currencyCode'] = shopCurrencyCode;

  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync tables
export const Sync_Orders = coda.makeSyncTable({
  name: 'Orders',
  description:
    'Return Orders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Order,
  schema: OrderSyncTableSchema,
  dynamicOptions: {
    getSchema: getOrderSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrders',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      filters.order.status,
      { ...filters.general.syncMetafields, optional: true },

      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.processedAtRange, optional: true },

      { ...filters.order.financialStatus, optional: true },
      { ...filters.order.fulfillmentStatus, optional: true },
      { ...filters.order.idArray, optional: true },
      { ...filters.general.sinceId, optional: true },
    ],
    execute: async function (params, context) {
      const [status, syncMetafields] = params;
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getOrderSchema, context, { syncMetafields }));
      const orderSyncTable = new OrderSyncTable(new OrderRestFetcher(context), params);
      return orderSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const orderSyncTable = new OrderSyncTable(new OrderRestFetcher(context), params);
      return orderSyncTable.executeUpdate(updates);
    },
  },
});
// #endregion

// #region Formulas
export const Formula_Order = coda.makeFormula({
  name: 'Order',
  description: 'Get a single order data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.order.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: OrderSyncTableSchema,
  execute: async function ([orderId], context) {
    const orderFetcher = new OrderRestFetcher(context);
    const response = await orderFetcher.fetch(orderId);
    if (response.body?.order) {
      return orderFetcher.formatApiToRow(response.body.order);
    }
  },
});

export const Formula_Orders = coda.makeFormula({
  name: 'Orders',
  description: 'Get orders data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...filters.order.status, optional: true },
    { ...filters.general.createdAtRange, optional: true },
    { ...filters.order.financialStatus, optional: true },
    { ...filters.order.fulfillmentStatus, optional: true },
    { ...filters.order.idArray, optional: true },
    { ...filters.general.processedAtRange, optional: true },
    { ...filters.general.updatedAtRange, optional: true },
    { ...filters.general.fields, optional: true },
  ],
  cacheTtlSecs: 10, // Cache is reduced to 10 seconds intentionnaly
  resultType: coda.ValueType.Array,
  items: OrderSyncTableSchema,
  execute: async function (
    [status, created_at, financial_status, fulfillment_status, ids, processed_at, updated_at, fields],
    context
  ) {
    const restParams = cleanQueryParams({
      fields,
      limit: REST_DEFAULT_LIMIT,
      ids: ids && ids.length ? ids.join(',') : undefined,
      financial_status,
      fulfillment_status,
      status,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      processed_at_min: processed_at ? processed_at[0] : undefined,
      processed_at_max: processed_at ? processed_at[1] : undefined,
    } as OrderSyncTableRestParams);
    const orderFetcher = new OrderRestFetcher(context);
    orderFetcher.validateParams(restParams);

    let items: OrderRow[] = [];
    let nextUrl: string;
    let run = true;
    while (run) {
      const response = await orderFetcher.fetchAll(restParams, {
        url: nextUrl,
        cacheTtlSecs: CACHE_DISABLED, // cache is disabled intentionnaly (we need fresh results when preparing Shopify orders)
      });

      items = items.concat(response?.body?.orders ? response.body.orders.map(orderFetcher.formatApiToRow) : []);
      nextUrl = extractNextUrlPagination(response);
      if (!nextUrl) run = false;
    }

    return items;
  },
});

export const Formula_OrderExportFormat = coda.makeFormula({
  name: 'OrderExportFormat',
  description: 'Return JSON suitable for our custom lg-coda-export-documents pack.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.order.id],
  cacheTtlSecs: 10, // small cache because we need fresh results
  resultType: coda.ValueType.String,
  execute: async ([orderId], context) => {
    const orderFetcher = new OrderRestFetcher(context);
    const response = await orderFetcher.fetch(orderId, {
      cacheTtlSecs: CACHE_DISABLED, // we need fresh results
    });
    if (response?.body?.order) {
      return formatOrderForDocExport(response.body.order);
    }
  },
});

export const Format_Order: coda.Format = {
  name: 'Order',
  instructions: 'Paste the ID of the order into the column.',
  formulaName: 'Order',
};
// #endregion
