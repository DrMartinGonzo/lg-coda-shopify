// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CompleteDraftOrderArgs, DraftOrderClient, SendDraftOrderInvoiceArgs } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { safeToFloat, safeToString } from '../../utils/helpers';
import { formatAddressDisplayName, formatPersonDisplayValue } from '../utils/address-utils';
import { formatOrderLineItemPropertyForDraftOrder } from '../utils/orders-utils';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { CustomerApiData } from './CustomerModel';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';
import { OrderLineItemApiData } from './OrderLineItemModel';
import { ShippingLineApiData } from './OrderModel';

// #endregion

// #region Types
export interface DraftOrderApiData extends BaseApiDataRest {
  applied_discount: { [key: string]: unknown } | null;
  billing_address: { [key: string]: unknown } | null;
  completed_at: string | null;
  created_at: string | null;
  currency: string | null;
  customer: Partial<CustomerApiData> | null;
  email: string | null;
  id: number | null;
  invoice_sent_at: string | null;
  invoice_url: string | null;
  line_items: OrderLineItemApiData[] | null;
  name: string | null;
  note: string | null;
  note_attributes: { [key: string]: unknown }[] | null;
  order_id: number | null;
  payment_terms: { [key: string]: unknown } | null;
  shipping_address: { [key: string]: unknown } | null;
  shipping_line: ShippingLineApiData | null;
  status: string | null;
  subtotal_price: string | null;
  tags: string | null;
  tax_exempt: boolean | null;
  tax_exemptions: string[] | null;
  tax_lines: { [key: string]: unknown }[] | null;
  taxes_included: boolean | null;
  total_price: string | null;
  total_tax: string | null;
  updated_at: string | null;
}

export interface DraftOrderModelData extends DraftOrderApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class DraftOrderModel extends AbstractModelRestWithGraphQlMetafields {
  public data: DraftOrderModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.DraftOrder;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.DraftOrder;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Draftorder;
  protected static readonly graphQlName = GraphQlResourceNames.DraftOrder;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: DraftOrderRow) {
    const data: Partial<DraftOrderModelData> = {
      applied_discount: row.applied_discount,
      billing_address: row.billing_address,
      completed_at: safeToString(row.completed_at),
      created_at: safeToString(row.created_at),
      currency: row.currency,
      customer: row.customer?.id
        ? {
            id: row.customer.id,
          }
        : undefined,
      email: row.email,
      id: row.id,
      invoice_sent_at: safeToString(row.invoice_sent_at),
      invoice_url: row.invoice_url,
      line_items: row.line_items as OrderLineItemApiData[],
      name: row.name,
      note_attributes: row.note_attributes,
      note: row.note,
      order_id: row.order_id,
      payment_terms: row.payment_terms,
      shipping_address: row.shipping_address,
      shipping_line: row.shipping_line as ShippingLineApiData,
      status: row.status,
      subtotal_price: safeToString(row.subtotal_price),
      tags: row.tags,
      tax_exempt: row.tax_exempt,
      tax_exemptions: row.tax_exemptions,
      tax_lines: row.tax_lines,
      taxes_included: row.taxes_included,
      total_price: safeToString(row.total_price),
      total_tax: safeToString(row.total_tax),
      updated_at: safeToString(row.updated_at),
    };

    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return DraftOrderClient.createInstance(this.context);
  }

  public async complete(completeDraftOrderArgs: Omit<CompleteDraftOrderArgs, 'id'>) {
    const response = await this.client.complete({ id: this.data.id, ...completeDraftOrderArgs });
    if (response) this.setData(response.body);
  }

  public async send_invoice(sendDraftOrderInvoiceArgs: Omit<SendDraftOrderInvoiceArgs, 'id'>) {
    const response = await this.client.send_invoice({ id: this.data.id, ...sendDraftOrderInvoiceArgs });
    if (response) this.setData(response.body);
  }

  public toCodaRow(): DraftOrderRow {
    const { metafields, customer, billing_address, shipping_address, order_id, ...data } = this.data;
    const obj: DraftOrderRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/draft_orders/${data.id}`,
      subtotal_price: safeToFloat(data.subtotal_price),
      total_price: safeToFloat(data.total_price),
      total_tax: safeToFloat(data.total_tax),
      line_items: data.line_items.map(formatOrderLineItemPropertyForDraftOrder),
      order_id,
    };

    if (customer) {
      obj.customer = formatCustomerReference(
        customer.id,
        formatPersonDisplayValue({
          id: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          email: customer.email,
        })
      );
    }
    if (billing_address) {
      obj.billing_address = {
        display: formatAddressDisplayName(billing_address),
        ...billing_address,
      };
    }
    if (shipping_address) {
      obj.shipping_address = {
        display: formatAddressDisplayName(shipping_address),
        ...shipping_address,
      };
    }
    if (order_id) {
      obj.order = formatOrderReference(order_id);
    }

    if (metafields) {
      metafields.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj as DraftOrderRow;
  }
}
