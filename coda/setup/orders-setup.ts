// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderClient } from '../../Clients/RestApiClientBase';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import {
  CACHE_DISABLED,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  PACK_IDENTITIES,
  optionValues,
} from '../../constants';
import { OrderModel } from '../../models/rest/OrderModel';
import { OrderSyncTableSchema } from '../../schemas/syncTable/OrderSchema';
import { SyncedOrders } from '../../sync/rest/SyncedOrders';
import { makeFetchSingleRestResourceAction } from '../../utils/coda-utils';
import { assertAllowedValue, dateRangeMax, dateRangeMin, isNullishOrEmpty } from '../../utils/helpers';
import { formatOrderForDocExport } from '../../utils/orders-utils';
import { filters, inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedOrders(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedOrders({
    context,
    codaSyncParams,
    model: OrderModel,
    client: OrderClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({
  status,
  financialStatus,
  fulfillmentStatus,
}: {
  status?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
}) {
  const invalidMsg: string[] = [];
  if (!isNullishOrEmpty(status) && !assertAllowedValue(status, optionValues(OPTIONS_ORDER_STATUS))) {
    invalidMsg.push(`status: ${status}`);
  }
  if (
    !isNullishOrEmpty(financialStatus) &&
    !assertAllowedValue(financialStatus, optionValues(OPTIONS_ORDER_FINANCIAL_STATUS))
  ) {
    invalidMsg.push(`financialStatus: ${financialStatus}`);
  }
  if (
    !isNullishOrEmpty(fulfillmentStatus) &&
    !assertAllowedValue(fulfillmentStatus, optionValues(OPTIONS_ORDER_FULFILLMENT_STATUS))
  ) {
    invalidMsg.push(`fulfillmentStatus: ${fulfillmentStatus}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync tables
export const Sync_Orders = coda.makeSyncTable({
  name: 'Orders',
  description:
    'Return Orders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Order,
  schema: SyncedOrders.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedOrders.getDynamicSchema({ context, codaSyncParams: [, formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrders',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedOrders.codaParamsMap}
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
      { ...filters.customer.tags, name: 'customerTags', optional: true },
      { ...filters.order.tags, name: 'orderTags', optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedOrders(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedOrders(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Formulas
export const Formula_Order = makeFetchSingleRestResourceAction({
  modelName: OrderModel.displayName,
  IdParameter: inputs.order.id,
  schema: SyncedOrders.staticSchema,
  execute: async ([itemId], context) => {
    const response = await OrderClient.createInstance(context).single({ id: itemId as number });
    return OrderModel.createInstance(context, response.body).toCodaRow();
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
    const client = OrderClient.createInstance(context);
    const items = await client.listAllLoop({
      fields,
      ids,
      financial_status,
      fulfillment_status,
      status,
      created_at_min: dateRangeMin(created_at),
      created_at_max: dateRangeMax(created_at),
      updated_at_min: dateRangeMin(updated_at),
      updated_at_max: dateRangeMax(updated_at),
      processed_at_min: dateRangeMin(processed_at),
      processed_at_max: dateRangeMax(processed_at),
      options: {
        cacheTtlSecs: CACHE_DISABLED, // we need fresh results
      },
    });
    return items.map((data) => OrderModel.createInstance(context, data).toCodaRow());
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
    const client = OrderClient.createInstance(context);
    const response = await client.single({
      id: orderId,
      options: {
        cacheTtlSecs: CACHE_DISABLED, // we need fresh results
      },
    });

    if (response?.body) {
      return formatOrderForDocExport(response.body);
    }
  },
});

export const Format_Order: coda.Format = {
  name: 'Order',
  instructions: 'Paste the ID of the order into the column.',
  formulaName: 'Order',
};
// #endregion
