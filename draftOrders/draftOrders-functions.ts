// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NOT_FOUND, OPTIONS_DRAFT_ORDER_STATUS } from '../constants';

import { formatCustomerDisplayValue } from '../customers/customers-functions';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { DraftOrderSyncTableSchema, draftOrderFieldDependencies } from '../schemas/syncTable/DraftOrderSchema';
import { formatOrderReference } from '../schemas/syncTable/OrderSchema';
import { formatCustomerReference } from '../schemas/syncTable/CustomerSchema';
import { SimpleRestNew } from '../Fetchers/SimpleRest';
import { cleanQueryParams, makePostRequest, makePutRequest } from '../helpers-rest';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../helpers';

import type { DraftOrder } from '../typesNew/Resources/DraftOrder';
import type { SingleFetchData, SyncTableParamValues } from '../Fetchers/SyncTableRest';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { FetchRequestOptions } from '../typesNew/Fetcher';
import type { Sync_DraftOrders } from './draftOrders-setup';
import type { SyncTableType } from '../types/SyncTable';
import { draftOrderResource } from '../allResources';

// #region Class
export type DraftOrderSyncTableType = SyncTableType<
  typeof draftOrderResource,
  DraftOrder.Row,
  DraftOrder.Params.Sync,
  never,
  DraftOrder.Params.Update
>;

export class DraftOrderSyncTable extends SyncTableRestNew<DraftOrderSyncTableType> {
  constructor(fetcher: DraftOrderRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(draftOrderResource, fetcher, params);
  }

  setSyncParams() {
    const [syncMetafields, status, updated_at, ids, since_id] = this.codaParams as SyncTableParamValues<
      typeof Sync_DraftOrders
    >;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, draftOrderFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      status,
      since_id,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
    });
  }
}

export class DraftOrderRestFetcher extends SimpleRestNew<DraftOrderSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(draftOrderResource, context);
  }

  validateParams = (params: any) => {
    if (params.status) {
      const validStatuses = OPTIONS_DRAFT_ORDER_STATUS;
      (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown status: ' + params.status);
      });
    }
    return true;
  };

  validateUpdateJob(update: coda.SyncUpdate<any, any, typeof DraftOrderSyncTableSchema>) {
    if (
      update.previousValue.status === 'completed' &&
      [update.newValue.email, update.newValue.note].some((v) => v !== undefined)
    ) {
      throw new coda.UserVisibleError("Can't update email or note on a completed draft order.");
    }
    return true;
  }

  formatRowToApi = (
    row: Partial<DraftOrder.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): DraftOrder.Params.Update | undefined => {
    let restParams: DraftOrder.Params.Update = {};

    if (row.email !== undefined) restParams.email = row.email;
    if (row.note !== undefined) restParams.note = row.note;
    if (row.tags !== undefined) restParams.tags = row.tags;

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (draftOrder): DraftOrder.Row => {
    let obj: DraftOrder.Row = {
      ...draftOrder,
      admin_url: `${this.context.endpoint}/admin/draft_orders/${draftOrder.id}`,
    };

    if (draftOrder.customer) {
      obj.customer = formatCustomerReference(draftOrder.customer.id, formatCustomerDisplayValue(draftOrder.customer));
    }
    if (draftOrder.billing_address) {
      obj.billing_address = {
        display: formatAddressDisplayName(draftOrder.billing_address),
        ...draftOrder.billing_address,
      };
    }
    if (draftOrder.shipping_address) {
      obj.shipping_address = {
        display: formatAddressDisplayName(draftOrder.shipping_address),
        ...draftOrder.shipping_address,
      };
    }
    if (draftOrder.order_id) {
      obj.order = formatOrderReference(draftOrder.order_id, NOT_FOUND);
    }

    return obj;
  };

  complete = async (
    draftOrderId: number,
    params: DraftOrder.Params.Complete,
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);
    this.validateParams(params);
    const url = coda.withQueryParams(
      coda.joinUrl(this.baseUrl, `${this.plural}/${draftOrderId}/complete.json`),
      restParams
    );
    return makePutRequest<SingleFetchData<DraftOrderSyncTableType>>({ ...requestOptions, url }, this.context);
  };

  sendInvoice = async (
    draftOrderId: number,
    params: DraftOrder.Params.SendInvoice,
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);
    this.validateParams(params);

    const payload = { draft_order_invoice: restParams };
    const url = coda.joinUrl(this.baseUrl, `${this.plural}/${draftOrderId}/send_invoice.json`);
    return makePostRequest<{
      draft_order_invoice: DraftOrder.Params.SendInvoice;
    }>({ ...requestOptions, url, payload }, this.context);
  };
}
// #endregion
