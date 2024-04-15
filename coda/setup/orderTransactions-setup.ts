// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderTransaction } from '../../Resources/GraphQl/OrderTransaction';
import { Identity } from '../../constants';
import { OrderTransactionSyncTableSchema } from '../../schemas/syncTable/OrderTransactionSchema';
import { filters } from '../coda-parameters';

// #endregion

// #region Sync tables
export const Sync_OrderTransactions = coda.makeSyncTable({
  name: 'OrderTransactions',
  description: 'Return Order Transactions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.OrderTransaction,
  schema: OrderTransactionSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return OrderTransaction.getDynamicSchema({ context, codaSyncParams: [] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderTransactions',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link OrderTransaction.makeSyncTableManagerSyncFunction}
     */
    parameters: [
      { ...filters.general.createdAtRange, name: 'orderCreatedAt', optional: true },
      { ...filters.general.updatedAtRange, name: 'orderUpdatedAt', optional: true },
      { ...filters.general.processedAtRange, name: 'orderProcessedAt', optional: true },
      { ...filters.order.financialStatus, name: 'orderFinancialStatus', optional: true },
      { ...filters.order.fulfillmentStatus, name: 'orderFulfillmentStatus', optional: true },
      { ...filters.order.status, name: 'orderStatus', suggestedValue: 'closed', optional: true },
      coda.makeParameter({
        type: coda.ParameterType.StringArray,
        name: 'gateways',
        description: 'Filter orders by the payment gateways used to process the transaction.',
        optional: true,
      }),
    ],
    execute: async function (params, context) {
      return OrderTransaction.sync(params, context);
    },
  },
});
// #endregion
