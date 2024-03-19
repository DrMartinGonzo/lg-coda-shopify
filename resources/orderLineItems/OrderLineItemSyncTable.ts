import * as coda from '@codahq/packs-sdk';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { cleanQueryParams } from '../../helpers-rest';
import { OrderRestFetcher } from '../orders/OrderRestFetcher';
import { OrderLineItem } from './orderLineItemResource';
import { Sync_OrderLineItems } from './orderLineItems-coda';
import { OrderSyncTable } from '../orders/OrderSyncTable';
import { Order, orderResource } from '../orders/orderResource';

/**
 * Ugly override of OrderSyncTable
 // TODO: write something more elegant
 */
// export class OrderLineItemSyncTable extends OrderSyncTable<OrderLineItem> {
export class OrderLineItemSyncTable extends SyncTableRest<Order | OrderLineItem> {
  constructor(fetcher: OrderRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(orderResource, fetcher, params);
  }
  setSyncParams() {
    // super.setSyncParams();

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
