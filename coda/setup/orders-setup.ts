// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderClient } from '../../Clients/RestClients';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import {
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
} from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { OrderModel } from '../../models/rest/OrderModel';
import { OrderSyncTableSchema } from '../../schemas/syncTable/OrderSchema';
import { SyncedOrders } from '../../sync/rest/SyncedOrders';
import { assertAllowedValue, dateRangeMax, dateRangeMin, isNullishOrEmpty } from '../../utils/helpers';
import { filters, inputs } from '../utils/coda-parameters';
import {
  makeFetchSingleRestResourceAction,
  makeFetchSingleRestResourceAsJsonAction,
  optionValues,
} from '../utils/coda-utils';

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
     *  - {@link Formula_OrdersNew}
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
async function fetchOrder(context: coda.ExecutionContext, id: number, asJson = false) {
  const response = await OrderClient.createInstance(context).single({ id });
  if (asJson == true) {
    return JSON.stringify(response.body);
  }
  return OrderModel.createInstance(context, response.body).toCodaRow();
}

export const Formula_Order = makeFetchSingleRestResourceAction({
  modelName: OrderModel.displayName,
  IdParameter: inputs.order.id,
  schema: SyncedOrders.staticSchema,
  execute: async ([itemId], context) => fetchOrder(context, itemId as number),
});

export const Formula_OrderJSON = makeFetchSingleRestResourceAsJsonAction({
  modelName: OrderModel.displayName,
  IdParameter: inputs.order.id,
  execute: async ([itemId], context) => fetchOrder(context, itemId as number, true),
});

export const Formula_OrdersLoop = coda.makeFormula({
  name: 'OrdersLoop',
  isExperimental: true,
  description: 'Get orders data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  // On réutilise les paramètres de Sync_Orders + des paramètres dédiés
  parameters: [...Sync_Orders.getter.parameters, { ...filters.general.fields, optional: true }],
  cacheTtlSecs: 10, // Cache is reduced to 10 seconds intentionnaly
  resultType: coda.ValueType.Array,
  items: OrderSyncTableSchema,
  execute: async function (
    [
      status,
      syncMetafields,
      createdAtRange,
      updatedAtRange,
      processedAtRange,
      financial_status,
      fulfillment_status,
      ids,
      since_id,
      customerTags,
      orderTags,
      fields,
    ],
    context
  ) {
    const items = await OrderClient.createInstance(context).listAllLoop({
      fields,
      ids,
      financial_status,
      fulfillment_status,
      status,
      created_at_min: dateRangeMin(createdAtRange),
      created_at_max: dateRangeMax(createdAtRange),
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      processed_at_min: dateRangeMin(processedAtRange),
      processed_at_max: dateRangeMax(processedAtRange),
      customerTags,
      orderTags,
      since_id,
      options: {
        cacheTtlSecs: CACHE_DISABLED, // we need fresh results
      },
    });

    return items.map((data) => OrderModel.createInstance(context, data).toCodaRow());
  },
});

export const Format_Order: coda.Format = {
  name: 'Order',
  instructions: 'Paste the ID of the order into the column.',
  formulaName: 'Order',
};
// #endregion
