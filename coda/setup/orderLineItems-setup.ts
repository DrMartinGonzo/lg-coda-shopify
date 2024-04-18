// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderLineItem } from '../../Resources/Rest/OrderLineItem';
import { PACK_IDENTITIES } from '../../constants';
import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { filters } from '../coda-parameters';

// #endregion

// #region Sync tables
export const Sync_OrderLineItems = coda.makeSyncTable({
  name: 'OrderLineItems',
  description: 'Return OrderLineItems from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.OrderLineItem,
  schema: OrderLineItemSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return OrderLineItem.getDynamicSchema({ context, codaSyncParams: [] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderLineItems',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link OrderLineItem.makeSyncTableManagerSyncFunction}
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
    execute: async (params, context) => OrderLineItem.sync(params, context),
  },
});
// #endregion
