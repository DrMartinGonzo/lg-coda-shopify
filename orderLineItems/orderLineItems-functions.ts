// #region Imports
import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams } from '../helpers-rest';
import { OrderSyncTable } from '../orders/orders-functions';
import { orderLineItemResource } from '../allResources';

import type { OrderLineItem } from '../typesNew/Resources/OrderLineItem';
import type { SyncTableParamValues } from '../Fetchers/SyncTableRest';
import type { Sync_OrderLineItems } from './orderLineItems-setup';
import type { SyncTableType } from '../types/SyncTable';

// #region Class
export type OrderLineItemSyncTableType = SyncTableType<
  typeof orderLineItemResource,
  OrderLineItem.Row,
  OrderLineItem.Params.Sync,
  never,
  never
>;

/**
 * Ugly override of OrderSyncTable
 // TODO: write something more elegant
 */
export class OrderLineItemSyncTable extends OrderSyncTable<OrderLineItemSyncTableType> {
  setSyncParams() {
    super.setSyncParams();

    const [
      orderStatus = 'any',
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderIds,
      ordersSinceId,
    ] = this.codaParams as SyncTableParamValues<typeof Sync_OrderLineItems>;
    this.syncParams = cleanQueryParams({
      fields: ['id', 'name', 'line_items'].join(', '),
      limit: this.restLimit,
      ids: orderIds && orderIds.length ? orderIds.join(',') : undefined,
      financial_status: orderFinancialStatus,
      fulfillment_status: orderFulfillmentStatus,
      status: orderStatus,
      since_id: ordersSinceId,
      created_at_min: orderCreatedAt ? orderCreatedAt[0] : undefined,
      created_at_max: orderCreatedAt ? orderCreatedAt[1] : undefined,
      updated_at_min: orderUpdatedAt ? orderUpdatedAt[0] : undefined,
      updated_at_max: orderUpdatedAt ? orderUpdatedAt[1] : undefined,
      processed_at_min: orderProcessedAt ? orderProcessedAt[0] : undefined,
      processed_at_max: orderProcessedAt ? orderProcessedAt[1] : undefined,
    });
  }
}
// #endregion
