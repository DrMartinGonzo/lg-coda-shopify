// #region Imports

import { ListOrderTransactionsArgs } from '../../Clients/GraphQlClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_OrderTransactions } from '../../coda/setup/orderTransactions-setup';
import { OrderTransactionModel } from '../../models/graphql/OrderTransactionModel';
import { updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { OrderTransactionSyncTableSchema } from '../../schemas/syncTable/OrderTransactionSchema';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncOrderTransactionsParams = CodaSyncParams<typeof Sync_OrderTransactions>;
// #endregion

export class SyncedOrderTransactions extends AbstractSyncedGraphQlResources<OrderTransactionModel> {
  public static staticSchema = OrderTransactionSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.staticSchema);
    augmentedSchema = await updateCurrencyCodesInSchema(augmentedSchema, context);

    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [
      orderCreatedAtRange,
      orderUpdatedAtRange,
      orderProcessedAtRange,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderStatus,
      gateways,
    ] = this.codaParams as SyncOrderTransactionsParams;
    return {
      orderCreatedAtRange,
      orderUpdatedAtRange,
      orderProcessedAtRange,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderStatus,
      gateways,
    };
  }

  protected codaParamsToListArgs() {
    const {
      orderCreatedAtRange,
      orderUpdatedAtRange,
      orderProcessedAtRange,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderStatus,
      gateways,
    } = this.codaParamsMap;
    const effectiveKeys = this.syncedStandardFields;

    return {
      fields: {
        amount: effectiveKeys.includes('amount'),
        icon: effectiveKeys.includes('paymentIcon'),
        parentTransaction: effectiveKeys.some((key) => ['parentTransaction', 'parentTransactionId'].includes(key)),
        paymentDetails: effectiveKeys.includes('paymentDetails'),
        receiptJson: effectiveKeys.includes('receiptJson'),
        totalUnsettled: effectiveKeys.includes('totalUnsettled'),
        transactionCurrency: effectiveKeys.includes('currency'),
      },
      gateways,
      orderFinancialStatus: orderFinancialStatus,
      orderFulfillmentStatus: orderFulfillmentStatus,
      orderStatus,
      orderCreatedAtMin: dateRangeMin(orderCreatedAtRange),
      orderCreatedAtMax: dateRangeMax(orderCreatedAtRange),
      orderUpdatedAtMin: dateRangeMin(orderUpdatedAtRange),
      orderUpdatedAtMax: dateRangeMax(orderUpdatedAtRange),
      orderProcessedAtMin: dateRangeMin(orderProcessedAtRange),
      orderProcessedAtMax: dateRangeMax(orderProcessedAtRange),
    } as ListOrderTransactionsArgs;
  }
}
