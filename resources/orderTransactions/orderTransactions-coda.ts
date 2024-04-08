// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Shop } from '../../Fetchers/NEW/Resources/Shop';
import { Identity } from '../../constants';
import { OrderTransactionSyncTableSchema } from '../../schemas/syncTable/OrderTransactionSchema';
import { filters } from '../../shared-parameters';
import { deepCopy } from '../../utils/helpers';
import { OrderTransactionGraphQlFetcher } from './OrderTransactionGraphQlFetcher';
import { OrderTransactionSyncTable } from './OrderTransactionSyncTable';
import { handleDynamicSchemaForCli } from '../../schemas/schema-helpers';

// #endregion

async function getOrderTransactionSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  let augmentedSchema = deepCopy(OrderTransactionSyncTableSchema);

  const shopCurrencyCode = await Shop.activeCurrency({ context });
  // Main props
  augmentedSchema.properties.amount['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.totalUnsettled['currencyCode'] = shopCurrencyCode;

  return augmentedSchema;
}

// #region Sync tables
export const Sync_OrderTransactions = coda.makeSyncTable({
  name: 'OrderTransactions',
  description: 'Return Order Transactions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.OrderTransaction,
  schema: OrderTransactionSyncTableSchema,
  dynamicOptions: {
    getSchema: getOrderTransactionSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncOrderTransactions',
    description: '<Help text for the sync formula, not show to the user>',
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
      const schema = await handleDynamicSchemaForCli(getOrderTransactionSchema, context, {});
      const orderTransactionFetcher = new OrderTransactionGraphQlFetcher(context);
      const orderTransactionSyncTable = new OrderTransactionSyncTable(orderTransactionFetcher, params);
      return orderTransactionSyncTable.executeSync(schema);
    },
  },
});
// #endregion
