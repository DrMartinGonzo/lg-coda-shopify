// #region Imports
import * as coda from '@codahq/packs-sdk';
import toSentenceCase from 'to-sentence-case';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { TadaDocumentNode } from 'gql.tada';
import { MakeSyncGraphQlFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_OrderTransactions } from '../../coda/setup/orderTransactions-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
import {
  buildOrderTransactionsSearchQuery,
  getOrderTransactionsQuery,
  orderTransactionFieldsFragment,
} from '../../graphql/orderTransactions-graphql';
import { OrderTransactionRow } from '../../schemas/CodaRows.types';
import { updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import {
  OrderTransactionSyncTableSchema,
  formatOrderTransactionReference,
} from '../../schemas/syncTable/OrderTransactionSchema';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { deepCopy } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllGraphQlResponse,
  GraphQlResourcePath,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { Shop } from '../Rest/Shop';
import { BaseContext } from '../types/Resource.types';
import { GraphQlResourceNames } from '../types/SupportedResource';

// #endregion

// #region Types
interface FieldsArgs {
  amount?: boolean;
  icon?: boolean;
  parentTransaction?: boolean;
  paymentDetails?: boolean;
  receiptJson?: boolean;
  totalUnsettled?: boolean;
  transactionCurrency?: boolean;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  cursor?: string;
  limit?: number;
  fields?: FieldsArgs;
  gateways?: string[];
  orderFinancialStatus?: string;
  orderFulfillmentStatus?: string;
  orderStatus?: string;
  orderCreatedAtMin?: Date;
  orderCreatedAtMax?: Date;
  orderUpdatedAtMin?: Date;
  orderUpdatedAtMax?: Date;
  orderProcessedAtMin?: Date;
  orderProcessedAtMax?: Date;
}

// #endregion

export class OrderTransaction extends AbstractGraphQlResource {
  public apiData: ResultOf<typeof orderTransactionFieldsFragment> & {
    // Extend with data from parent order
    parentOrder: {
      id: string;
      name: string;
    };
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.OrderTransaction;
  protected static readonly graphQlName = GraphQlResourceNames.OrderTransaction;

  protected static readonly defaultLimit: number = 50;
  protected static readonly paths: Array<GraphQlResourcePath> = ['orders.transactions'];

  public static getStaticSchema() {
    return OrderTransactionSyncTableSchema;
  }

  public static async getDynamicSchema({ context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.getStaticSchema());

    const shopCurrencyCode = await Shop.activeCurrency({ context });
    updateCurrencyCodesInSchema(augmentedSchema, shopCurrencyCode);
    // Main props
    // augmentedSchema.properties.amount['currencyCode'] = shopCurrencyCode;
    // augmentedSchema.properties.totalUnsettled['currencyCode'] = shopCurrencyCode;

    return augmentedSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncGraphQlFunctionArgs<
    OrderTransaction,
    typeof Sync_OrderTransactions
  >): SyncGraphQlFunction<OrderTransaction> {
    const effectiveKeys = syncTableManager.effectiveStandardFromKeys;
    const [
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderStatus,
      gateways,
    ] = codaSyncParams;

    return async ({ cursor = null, limit }) => {
      return this.all({
        context,
        cursor,
        limit,
        options: { cacheTtlSecs: CACHE_DISABLED },

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
        orderCreatedAtMin: orderCreatedAt ? orderCreatedAt[0] : undefined,
        orderCreatedAtMax: orderCreatedAt ? orderCreatedAt[1] : undefined,
        orderUpdatedAtMin: orderUpdatedAt ? orderUpdatedAt[0] : undefined,
        orderUpdatedAtMax: orderUpdatedAt ? orderUpdatedAt[1] : undefined,
        orderProcessedAtMin: orderProcessedAt ? orderProcessedAt[0] : undefined,
        orderProcessedAtMax: orderProcessedAt ? orderProcessedAt[1] : undefined,
      });
    };
  }

  public static async all({
    context,
    limit = null,
    cursor = null,
    fields = {},
    gateways,
    orderFinancialStatus,
    orderFulfillmentStatus,
    orderStatus,
    orderCreatedAtMin,
    orderCreatedAtMax,
    orderUpdatedAtMin,
    orderUpdatedAtMax,
    orderProcessedAtMin,
    orderProcessedAtMax,

    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<OrderTransaction>> {
    const queryFilters = {
      gateways,
      financial_status: orderFinancialStatus,
      fulfillment_status: orderFulfillmentStatus,
      status: orderStatus,
      created_at_min: orderCreatedAtMin,
      created_at_max: orderCreatedAtMax,
      updated_at_min: orderUpdatedAtMin,
      updated_at_max: orderUpdatedAtMax,
      processed_at_min: orderProcessedAtMin,
      processed_at_max: orderProcessedAtMax,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (queryFilters[key] === undefined) delete queryFilters[key];
    });
    const searchQuery = buildOrderTransactionsSearchQuery(queryFilters);

    const response = await this.baseFind<OrderTransaction, typeof getOrderTransactionsQuery>({
      documentNode: getOrderTransactionsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,

        includeAmount: fields.amount ?? true,
        includeIcon: fields.icon ?? true,
        includeParentTransaction: fields.parentTransaction ?? true,
        includePaymentDetails: fields.paymentDetails ?? true,
        includeReceiptJson: fields.receiptJson ?? true,
        includeTotalUnsettled: fields.totalUnsettled ?? true,
        includeTransactionCurrency: fields.transactionCurrency ?? true,

        ...otherArgs,
      } as VariablesOf<typeof getOrderTransactionsQuery>,
      context,
      options,
    });

    return {
      ...response,
      /**
       * Filter out gateways if provided because orders could have transactions
       * from different gateways and the query will return them all even if the
       * gateways filter arguement is provided
       */
      data: response.data.filter((pouet) => {
        if (gateways && gateways.length) return gateways.includes(pouet.apiData.gateway);
        return true;
      }),
    };
  }

  /**
   * Custom createInstancesFromResponse ilmplementation for OrderTransaction.
   * Only works for the result of getOrderTransactionsQuery
   */
  protected static createInstancesFromResponse<T extends AbstractGraphQlResource, NodeT extends TadaDocumentNode>(
    context: coda.ExecutionContext,
    rawData: ResultOf<NodeT>
  ): Array<T> {
    let instances: Array<T> = [];

    const orders = (rawData as ResultOf<typeof getOrderTransactionsQuery>).orders.nodes;
    orders.forEach((order) => {
      order.transactions.forEach((transaction) => {
        instances.push(
          this.createInstance<T>(context, {
            ...transaction,
            parentOrder: {
              id: order.id,
              name: order.name,
            },
          })
        );
      });
    });

    return instances;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async save(): Promise<void> {}
  protected formatToApi() {}

  public formatToRow(): OrderTransactionRow {
    const { apiData: data } = this;
    if (data.parentOrder === undefined) {
      throw new Error('parentOrder is undefined');
    }

    const parentOrderId = graphQlGidToId(data.parentOrder.id);
    let obj: OrderTransactionRow = {
      admin_graphql_api_id: this.graphQlGid,
      id: this.restId,
      label: `Order ${data.parentOrder.name} - ${toSentenceCase(data.kind)}`,

      admin_url: `${this.context.endpoint}/admin/orders/${parentOrderId}`,
      orderId: parentOrderId,
      order: formatOrderReference(parentOrderId, data.parentOrder.name),

      accountNumber: data.accountNumber,
      authorizationCode: data.authorizationCode,
      authorizationExpiresAt: data.authorizationExpiresAt,
      createdAt: data.createdAt,
      currency: data.amountSet?.presentmentMoney?.currencyCode,
      errorCode: data.errorCode,
      gateway: data.gateway,
      kind: data.kind,
      paymentDetails: data.paymentDetails,
      paymentIcon: data.paymentIcon?.url,
      paymentId: data.paymentId,
      processedAt: data.processedAt,
      receiptJson: data.receiptJson,
      settlementCurrency: data.settlementCurrency,
      settlementCurrencyRate: data.settlementCurrencyRate,
      status: data.status,
      test: data.test,
    };

    if (data.parentTransaction?.id) {
      const parentTransactionId = graphQlGidToId(data.parentTransaction.id);
      obj.parentTransactionId = parentTransactionId;
      obj.parentTransaction = formatOrderTransactionReference(parentTransactionId);
    }
    if (data.amountSet?.shopMoney?.amount) {
      obj.amount = parseFloat(data.amountSet.shopMoney.amount);
    }
    if (data.totalUnsettledSet?.shopMoney?.amount) {
      obj.totalUnsettled = parseFloat(data.totalUnsettledSet.shopMoney.amount);
    }
    /**
     * Unused. see comment in {@link OrderTransactionSyncTableSchema}
     */
    /*
    if (data.user?.id) {
      obj.userId = graphQlGidToId(data.user.id);
    }
    */

    return obj;
  }
}
