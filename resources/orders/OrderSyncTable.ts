import * as coda from '@codahq/packs-sdk';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { orderFieldDependencies } from '../../schemas/syncTable/OrderSchema';
import { OrderRestFetcher } from './OrderRestFetcher';
import { Order, orderResource } from './orderResource';
import { Sync_Orders } from './orders-coda';

export class OrderSyncTable extends SyncTableRest<Order> {
  // export class OrderSyncTable<T extends Order | OrderLineItem = Order> extends SyncTableRest<T> {
  constructor(fetcher: OrderRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(orderResource, fetcher, params);
  }

  setSyncParams() {
    const [
      status = 'any',
      syncMetafields,
      created_at,
      updated_at,
      processed_at,
      financial_status,
      fulfillment_status,
      ids,
      since_id,
    ] = this.codaParams as SyncTableParamValues<typeof Sync_Orders>;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, orderFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      financial_status,
      fulfillment_status,
      status,
      since_id,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      processed_at_min: processed_at ? processed_at[0] : undefined,
      processed_at_max: processed_at ? processed_at[1] : undefined,
    });
  }
}
