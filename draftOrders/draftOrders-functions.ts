// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NOT_FOUND, OPTIONS_DRAFT_ORDER_STATUS } from '../constants';

import { formatCustomerDisplayValue } from '../customers/customers-functions';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { RestResourceName } from '../types/RequestsRest';
import { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';
import { formatOrderReference } from '../schemas/syncTable/OrderSchema';
import { formatCustomerReference } from '../schemas/syncTable/CustomerSchema';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { cleanQueryParams, makePostRequest, makePutRequest } from '../helpers-rest';

import type {
  DraftOrderCompleteRestParams,
  DraftOrderSendInvoiceRestParams,
  DraftOrderUpdateRestParams,
} from '../types/DraftOrder';
import type { DraftOrderRow } from '../types/CodaRows';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { FetchRequestOptions } from '../types/Requests';
import type { singleFetchData } from '../Fetchers/SimpleRest';

// #endregion

// #region Class
export class DraftOrderRestFetcher extends SimpleRest<RestResourceName.DraftOrder, typeof DraftOrderSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.DraftOrder, DraftOrderSyncTableSchema, context);
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

  formatRowToApi = (
    row: Partial<DraftOrderRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): DraftOrderUpdateRestParams | undefined => {
    let restParams: DraftOrderUpdateRestParams = {};

    if (row.email !== undefined) restParams.email = row.email;
    if (row.note !== undefined) restParams.note = row.note;
    if (row.tags !== undefined) restParams.tags = row.tags;

    // const metafieldRestInputs = metafieldKeyValueSets.length
    //   ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
    //   : [];
    // if (metafieldRestInputs.length) {
    //   restParams = { ...restParams, metafields: metafieldRestInputs };
    // }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (draftOrder): DraftOrderRow => {
    let obj: DraftOrderRow = {
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
    params: DraftOrderCompleteRestParams,
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);
    this.validateParams(params);
    const url = coda.withQueryParams(
      coda.joinUrl(this.baseUrl, `${this.plural}/${draftOrderId}/complete.json`),
      restParams
    );
    return makePutRequest<singleFetchData<RestResourceName.DraftOrder>>({ ...requestOptions, url }, this.context);
  };

  sendInvoice = async (
    draftOrderId: number,
    params: DraftOrderSendInvoiceRestParams,
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);
    this.validateParams(params);

    const payload = { draft_order_invoice: restParams };
    const url = coda.joinUrl(this.baseUrl, `${this.plural}/${draftOrderId}/send_invoice.json`);
    return makePostRequest<{
      draft_order_invoice: DraftOrderSendInvoiceRestParams;
    }>({ ...requestOptions, url, payload }, this.context);
  };
}
// #endregion
