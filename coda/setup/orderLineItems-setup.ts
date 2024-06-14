// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderLineItemClient } from '../../Clients/RestClients';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import {
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  PACK_IDENTITIES,
  optionValues,
} from '../../constants';
import { OrderLineItemModel } from '../../models/rest/OrderLineItemModel';
import { SyncedOrderLineItems } from '../../sync/rest/SyncedOrderLineItems';
import { assertAllowedValue, isNullishOrEmpty } from '../../utils/helpers';
import { filters } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedOrderLineItems(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedOrderLineItems({
    context,
    codaSyncParams,
    // @ts-expect-error
    model: OrderLineItemModel,
    client: OrderLineItemClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({
  orderStatus,
  orderFinancialStatus,
  orderFulfillmentStatus,
}: {
  orderStatus?: string;
  orderFinancialStatus?: string;
  orderFulfillmentStatus?: string;
}) {
  const invalidMsg: string[] = [];
  if (!isNullishOrEmpty(orderStatus) && !assertAllowedValue(orderStatus, optionValues(OPTIONS_ORDER_STATUS))) {
    invalidMsg.push(`orderStatus: ${orderStatus}`);
  }
  if (
    !isNullishOrEmpty(orderFinancialStatus) &&
    !assertAllowedValue(orderFinancialStatus, optionValues(OPTIONS_ORDER_FINANCIAL_STATUS))
  ) {
    invalidMsg.push(`orderFinancialStatus: ${orderFinancialStatus}`);
  }
  if (
    !isNullishOrEmpty(orderFulfillmentStatus) &&
    !assertAllowedValue(orderFulfillmentStatus, optionValues(OPTIONS_ORDER_FULFILLMENT_STATUS))
  ) {
    invalidMsg.push(`orderFulfillmentStatus: ${orderFulfillmentStatus}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync tables
export const Sync_OrderLineItems = coda.makeSyncTable({
  name: 'OrderLineItems',
  description: 'Return OrderLineItems from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.OrderLineItem,
  schema: SyncedOrderLineItems.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedOrderLineItems.getDynamicSchema({ context, codaSyncParams: [] }),
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderLineItems',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedOrderLineItems.codaParamsMap}
     */
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
    execute: async (codaSyncParams, context) => createSyncedOrderLineItems(codaSyncParams, context).executeSync(),
  },
});
// #endregion
