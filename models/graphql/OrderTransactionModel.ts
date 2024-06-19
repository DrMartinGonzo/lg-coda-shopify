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
import { safeToFloat } from '../../utils/helpers';

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
    const { amountSet, parentOrder, parentTransaction, paymentIcon, totalUnsettledSet, ...data } = this.data;
    if (parentOrder === undefined) {
      throw new Error('parentOrder is undefined');
    }

    const parentOrderId = graphQlGidToId(parentOrder.id);
    let obj: Partial<OrderTransactionRow> = {
      ...data,
      admin_graphql_api_id: this.graphQlGid,
      id: this.restId,
      label: `Order ${parentOrder.name} - ${toSentenceCase(data.kind)}`,
      admin_url: `${this.context.endpoint}/admin/orders/${parentOrderId}`,
      orderId: parentOrderId,
      order: formatOrderReference(parentOrderId, parentOrder.name),
      currency: amountSet?.presentmentMoney?.currencyCode,
      paymentIcon: paymentIcon?.url,
      amount: safeToFloat(amountSet?.shopMoney?.amount),
      totalUnsettled: safeToFloat(totalUnsettledSet?.shopMoney?.amount),
    };

    if (parentTransaction?.id) {
      const parentTransactionId = graphQlGidToId(parentTransaction.id);
      obj.parentTransactionId = parentTransactionId;
      obj.parentTransaction = formatOrderTransactionReference(parentTransactionId);
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
