// #region Imports
import toSentenceCase from 'to-sentence-case';
import { ResultOf, graphQlGidToId } from '../../graphql/utils/graphql-utils';

import { OrderTransactionClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { NOT_SUPPORTED } from '../../constants/strings-constants';
import { orderTransactionFieldsFragment } from '../../graphql/orderTransactions-graphql';
import { OrderTransactionRow } from '../../schemas/CodaRows.types';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatOrderTransactionReference } from '../../schemas/syncTable/OrderTransactionSchema';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export interface OrderTransactionApiData extends BaseApiDataGraphQl, ResultOf<typeof orderTransactionFieldsFragment> {}

export interface OrderTransactionModelData extends OrderTransactionApiData, BaseModelDataGraphQl {
  // Extend with data from parent order
  parentOrder: {
    id: string;
    name: string;
  };
}
// #endregion

export class OrderTransactionModel extends AbstractModelGraphQl {
  public data: OrderTransactionModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.OrderTransaction;
  protected static readonly graphQlName = GraphQlResourceNames.OrderTransaction;

  public static createInstanceFromRow(): InstanceType<typeof this> {
    throw new Error(NOT_SUPPORTED);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return OrderTransactionClient.createInstance(this.context);
  }

  public toCodaRow(): OrderTransactionRow {
    const { data } = this;
    if (data.parentOrder === undefined) {
      throw new Error('parentOrder is undefined');
    }

    const parentOrderId = graphQlGidToId(data.parentOrder.id);
    let obj: Partial<OrderTransactionRow> = {
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

    return obj as OrderTransactionRow;
  }
}
