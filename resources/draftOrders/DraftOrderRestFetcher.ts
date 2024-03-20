import * as coda from '@codahq/packs-sdk';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { SingleFetchData } from '../../Fetchers/SyncTableRest';
import { NOT_FOUND, OPTIONS_DRAFT_ORDER_STATUS } from '../../constants';
import { formatAddressDisplayName, formatPersonDisplayValue } from '../../utils/helpers';
import { cleanQueryParams, makePostRequest, makePutRequest } from '../../helpers-rest';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { DraftOrderSyncTableSchema } from '../../schemas/syncTable/DraftOrderSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import type { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { DraftOrder, draftOrderResource } from './draftOrder';

export class DraftOrderRestFetcher extends SimpleRest<DraftOrder> {
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
    row: Partial<DraftOrder['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): DraftOrder['rest']['params']['update'] | undefined => {
    let restParams: DraftOrder['rest']['params']['update'] = {};

    if (row.email !== undefined) restParams.email = row.email;
    if (row.note !== undefined) restParams.note = row.note;
    if (row.tags !== undefined) restParams.tags = row.tags;

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (draftOrder): DraftOrder['codaRow'] => {
    let obj: DraftOrder['codaRow'] = {
      ...draftOrder,
      admin_url: `${this.context.endpoint}/admin/draft_orders/${draftOrder.id}`,
    };

    if (draftOrder.customer) {
      obj.customer = formatCustomerReference(
        draftOrder.customer.id,
        formatPersonDisplayValue({
          id: draftOrder.customer.id,
          firstName: draftOrder.customer.first_name,
          lastName: draftOrder.customer.last_name,
          email: draftOrder.customer.email,
        })
      );
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
    params: DraftOrder['rest']['params']['complete'],
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);
    this.validateParams(params);
    const url = coda.withQueryParams(
      coda.joinUrl(this.baseUrl, `${this.plural}/${draftOrderId}/complete.json`),
      restParams
    );
    return makePutRequest<SingleFetchData<typeof draftOrderResource>>({ ...requestOptions, url }, this.context);
  };

  sendInvoice = async (
    draftOrderId: number,
    params: DraftOrder['rest']['params']['sendInvoice'],
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);
    this.validateParams(params);

    const payload = { draft_order_invoice: restParams };
    const url = coda.joinUrl(this.baseUrl, `${this.plural}/${draftOrderId}/send_invoice.json`);
    return makePostRequest<{
      draft_order_invoice: DraftOrder['rest']['params']['sendInvoice'];
    }>({ ...requestOptions, url, payload }, this.context);
  };
}
