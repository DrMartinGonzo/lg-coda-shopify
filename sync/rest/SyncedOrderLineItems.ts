// #region Imports

import { ListOrdersArgs } from '../../Clients/RestClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_OrderLineItems } from '../../coda/setup/orderLineItems-setup';
import { OrderLineItemModel } from '../../models/rest/OrderLineItemModel';
import { updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedOrderLineItems extends AbstractSyncedRestResources<OrderLineItemModel> {
  public static staticSchema = OrderLineItemSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.staticSchema);
    augmentedSchema = await updateCurrencyCodesInSchema(augmentedSchema, context);
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [
      orderStatus,
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderIds,
      sinceOrderId,
    ] = this.codaParams as CodaSyncParams<typeof Sync_OrderLineItems>;
    return {
      orderStatus,
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderIds,
      sinceOrderId,
    };
  }

  protected codaParamsToListArgs(): Omit<ListOrdersArgs, 'limit' | 'options'> {
    const {
      orderStatus,
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderIds,
      sinceOrderId,
    } = this.codaParamsMap;
    return {
      // fields: ['id', 'name', 'line_items'].join(','),
      ids: orderIds && orderIds.length ? orderIds.join(',') : undefined,
      financial_status: orderFinancialStatus,
      fulfillment_status: orderFulfillmentStatus,
      status: orderStatus,
      since_id: sinceOrderId,
      created_at_min: dateRangeMin(orderCreatedAt),
      created_at_max: dateRangeMax(orderCreatedAt),
      updated_at_min: dateRangeMin(orderUpdatedAt),
      updated_at_max: dateRangeMax(orderUpdatedAt),
      processed_at_min: dateRangeMin(orderProcessedAt),
      processed_at_max: dateRangeMax(orderProcessedAt),
    };
  }

  // protected afterSync(): Promise<void> {
  //   const orderLineItems = this.data.flatMap((order) => {
  //     return order.data.line_items.map(
  //       (line_item) =>
  //         new OrderLineItem({
  //           context,
  //           fromData: {
  //             ...line_item,
  //             order_id: order.apiData.id,
  //             order_name: order.apiData.name,
  //           } as OrderLineItem['apiData'],
  //         })
  //     );
  //   });
  // }
}
