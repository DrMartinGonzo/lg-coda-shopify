// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderTransactionClient } from '../../Clients/GraphQlClients';
import { PACK_IDENTITIES } from '../../constants';
import { OrderTransactionModel } from '../../models/graphql/OrderTransactionModel';
import { SyncedOrderTransactions } from '../../sync/graphql/SyncedOrderTransactions';
import { filters } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedOrderTransactions(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedOrderTransactions({
    context,
    codaSyncParams,
    model: OrderTransactionModel,
    client: OrderTransactionClient.createInstance(context),
  });
}
// #endregion

// #region Sync tables
export const Sync_OrderTransactions = coda.makeSyncTable({
  name: 'OrderTransactions',
  description: 'Return Order Transactions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.OrderTransaction,
  schema: SyncedOrderTransactions.staticSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return SyncedOrderTransactions.getDynamicSchema({ context, codaSyncParams: [] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderTransactions',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedOrderTransactions.codaParamsMap}
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
    execute: async (codaSyncParams, context) => createSyncedOrderTransactions(codaSyncParams, context).executeSync(),
  },
});
// #endregion
