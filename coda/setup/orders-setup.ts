// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AllArgs, Order } from '../../Resources/Rest/Order';
import { CACHE_DEFAULT, CACHE_DISABLED, PACK_IDENTITIES, REST_DEFAULT_LIMIT } from '../../constants';
import { OrderRow } from '../../schemas/CodaRows.types';
import { OrderSyncTableSchema } from '../../schemas/syncTable/OrderSchema';
import { formatOrderForDocExport } from '../../utils/orders-utils';
import { filters, inputs } from '../coda-parameters';
import { NotFoundVisibleError } from '../../Errors/Errors';

// #endregion

// #region Sync tables
export const Sync_Orders = coda.makeSyncTable({
  name: 'Orders',
  description:
    'Return Orders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Order,
  schema: OrderSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Order.getDynamicSchema({ context, codaSyncParams: [, formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrders',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Order.getDynamicSchema}
     *  - {@link Order.makeSyncTableManagerSyncFunction}
     */
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
      return Order.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Order.syncUpdate(params, updates, context);
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
    const order = await Order.find({ id: orderId, context });
    if (order) {
      return order.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.Order);
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
    const allDataLoopArgs: AllArgs = {
      context,
      fields,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      processed_at_min: processed_at ? processed_at[0] : undefined,
      processed_at_max: processed_at ? processed_at[1] : undefined,
      financial_status,
      fulfillment_status,
      status,
    };
    const items = await Order.allDataLoop<Order>(allDataLoopArgs);
    const croute = items.map((i) => i.formatToRow());
    return items.map((i) => i.formatToRow()) as any[];
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
    const order = await Order.find({
      id: orderId,
      context,
      options: {
        cacheTtlSecs: CACHE_DISABLED, // we need fresh results
      },
    });

    if (order?.apiData) {
      return formatOrderForDocExport(order.apiData);
    }
  },
});

export const Format_Order: coda.Format = {
  name: 'Order',
  instructions: 'Paste the ID of the order into the column.',
  formulaName: 'Order',
};
// #endregion
