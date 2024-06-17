// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CancelOrderArgs, OrderClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { OrderRow } from '../../schemas/CodaRows.types';
import { TypeFromCodaSchemaProps } from '../../schemas/Schema.types';
import { CompanySchema } from '../../schemas/basic/CompanySchema';
import { DiscountCodeSchema } from '../../schemas/basic/DiscountCodeSchema';
import { DutySchema } from '../../schemas/basic/DutySchema';
import { FulfillmentSchema } from '../../schemas/basic/FulfillmentSchema';
import { OrderAdjustmentSchema } from '../../schemas/basic/OrderAdjustmentSchema';
import { OrderTransactionSchema } from '../../schemas/basic/OrderTransactionSchema';
import { PriceSetSchema } from '../../schemas/basic/PriceSetSchema';
import { RefundLineItemSchema } from '../../schemas/basic/RefundLineItemSchema';
import { RefundSchema } from '../../schemas/basic/RefundSchema';
import { ShippingLineSchema } from '../../schemas/basic/ShippingLineSchema';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { safeToString } from '../../utils/helpers';
import { formatAddressDisplayName, formatPersonDisplayValue } from '../utils/address-utils';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { CustomerApiData } from './CustomerModel';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';
import { OrderLineItemApiData } from './OrderLineItemModel';

// #endregion

// #region Types
type Company = TypeFromCodaSchemaProps<(typeof CompanySchema)['properties']>;

type DiscountCode = TypeFromCodaSchemaProps<(typeof DiscountCodeSchema)['properties']>;

export type Duty = TypeFromCodaSchemaProps<(typeof DutySchema)['properties']>;

type Fulfillment = TypeFromCodaSchemaProps<(typeof FulfillmentSchema)['properties']> & {
  line_items: OrderLineItemApiData[] | null;
};

type OrderAdjustment = TypeFromCodaSchemaProps<(typeof OrderAdjustmentSchema)['properties']>;

type PriceSet = TypeFromCodaSchemaProps<(typeof PriceSetSchema)['properties']> & {
  transactions: Transaction[] | null;
};

type RefundLineItem = TypeFromCodaSchemaProps<(typeof RefundLineItemSchema)['properties']>;

export type ShippingLine = TypeFromCodaSchemaProps<(typeof ShippingLineSchema)['properties']>;

type Transaction = TypeFromCodaSchemaProps<(typeof OrderTransactionSchema)['properties']>;

// TODO: can we make this more recursive to avoid adding manually the coda.SchemaType of subproperties?
type Refund = TypeFromCodaSchemaProps<(typeof RefundSchema)['properties']> & {
  duties: Duty[] | null;
  transactions: Transaction[] | null;
  order_adjustments: OrderAdjustment[] | null;
  refund_line_items: RefundLineItem[] | null;
};

// Testing better types
/*
// let pp: Refund['duties'];
// pp[0].id;

type RefundNew = CulNew<(typeof RefundSchema)['properties']>;
// let ff: RefundNew['duties'];
// ff[0].
*/

export interface OrderApiData extends BaseApiDataRest {
  admin_graphql_api_id: string | null;
  line_items: OrderLineItemApiData[] | null;
  app_id: number | null;
  billing_address: { [key: string]: unknown } | null;
  browser_ip: string | null;
  buyer_accepts_marketing: boolean | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  client_details: { [key: string]: unknown } | null;
  closed_at: string | null;
  company: Company | null;
  confirmation_number: string | null;
  created_at: string | null;
  currency: string | null;
  current_subtotal_price: string | null;
  current_subtotal_price_set: PriceSet | null;
  current_total_additional_fees_set: PriceSet | null;
  current_total_discounts: string | null;
  current_total_discounts_set: PriceSet | null;
  current_total_duties_set: PriceSet | null;
  current_total_price: string | null;
  current_total_price_set: PriceSet | null;
  current_total_tax: string | null;
  current_total_tax_set: PriceSet | null;
  customer: Partial<CustomerApiData> | null;
  customer_locale: string | null;
  discount_applications: { [key: string]: unknown }[] | null;
  discount_codes: DiscountCode[] | null;
  email: string | null;
  estimated_taxes: boolean | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  fulfillments: Fulfillment[] | null;
  id: number | null;
  landing_site: string | null;
  merchant_of_record_app_id: number | null;
  name: string | null;
  note: string | null;
  note_attributes: { [key: string]: unknown }[] | null;
  number: number | null;
  order_number: number | null;
  order_status_url: string | null;
  original_total_additional_fees_set: PriceSet | null;
  original_total_duties_set: PriceSet | null;
  payment_gateway_names: string[] | null;
  payment_terms: { [key: string]: unknown } | null;
  phone: string | null;
  po_number: string | null;
  presentment_currency: string | null;
  processed_at: string | null;
  referring_site: string | null;
  refunds: Refund[] | null;
  // refunds: RefundNew[] | null;
  shipping_address: { [key: string]: unknown } | null;
  shipping_lines: ShippingLine[] | null;
  source_identifier: string | null;
  source_name: string | null;
  source_url: string | null;
  subtotal_price: string | null;
  subtotal_price_set: PriceSet | null;
  tags: string | null;
  tax_lines: { [key: string]: unknown }[] | null;
  taxes_included: boolean | null;
  test: boolean | null;
  total_discounts: string | null;
  total_discounts_set: PriceSet | null;
  total_line_items_price: string | null;
  total_line_items_price_set: PriceSet | null;
  total_outstanding: string | null;
  total_price: string | null;
  total_price_set: PriceSet | null;
  total_shipping_price_set: PriceSet | null;
  total_tax: string | null;
  total_tax_set: PriceSet | null;
  total_tip_received: string | null;
  total_weight: number | null;
  updated_at: string | null;
  user_id: number | null;
}

export interface OrderModelData extends OrderApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class OrderModel extends AbstractModelRestWithGraphQlMetafields {
  public data: OrderModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Order;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Order;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Order;
  protected static readonly graphQlName = GraphQlResourceNames.Order;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: OrderRow) {
    const data: Partial<OrderModelData> = {
      ...row,

      cancelled_at: safeToString(row.cancelled_at),
      closed_at: safeToString(row.closed_at),
      created_at: safeToString(row.created_at),
      processed_at: safeToString(row.processed_at),
      updated_at: safeToString(row.updated_at),

      current_subtotal_price: safeToString(row.current_subtotal_price),
      current_total_discounts: safeToString(row.current_total_discounts),
      current_total_price: safeToString(row.current_total_price),
      current_total_tax: safeToString(row.current_total_tax),
      subtotal_price: safeToString(row.subtotal_price),
      total_discounts: safeToString(row.total_discounts),
      total_line_items_price: safeToString(row.total_line_items_price),
      total_outstanding: safeToString(row.total_outstanding),
      total_price: safeToString(row.total_price),
      total_tax: safeToString(row.total_tax),
      total_tip_received: safeToString(row.total_tip_received),

      company: row.company as Company,
      customer: row.customer?.id ? { id: row.customer.id } : undefined,
      discount_codes: row.discount_codes as DiscountCode[],
      fulfillments: row.fulfillments as Fulfillment[],
      line_items: row.line_items as OrderLineItemApiData[],
      refunds: row.refunds as Refund[],
      shipping_lines: row.shipping_lines as ShippingLine[],
    };

    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return OrderClient.createInstance(this.context);
  }

  public async cancel(cancelOrderArgs: Omit<CancelOrderArgs, 'id'>) {
    const response = await this.client.cancel({ id: this.data.id, ...cancelOrderArgs });
    if (response) this.setData(response.body);
  }

  public async close() {
    const response = await this.client.close(this.data.id);
    if (response) this.setData(response.body);
  }

  public async open() {
    const response = await this.client.open(this.data.id);
    if (response) this.setData(response.body);
  }

  public toCodaRow(): OrderRow {
    const { metafields, customer, ...data } = this.data;
    const obj: OrderRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/orders/${data.id}`,
      current_total_discounts: parseFloat(data.current_total_discounts),
      current_total_price: parseFloat(data.current_total_price),
      current_subtotal_price: parseFloat(data.current_subtotal_price),
      current_total_tax: parseFloat(data.current_total_tax),
      subtotal_price: parseFloat(data.subtotal_price),
      total_discounts: parseFloat(data.total_discounts),
      total_line_items_price: parseFloat(data.total_line_items_price),
      total_outstanding: parseFloat(data.total_outstanding),
      total_price: parseFloat(data.total_price),
      total_tax: parseFloat(data.total_tax),
      total_tip_received: parseFloat(data.total_tip_received),
      fulfillments: data.fulfillments,
      line_items: data.line_items as any,
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
    if (data.billing_address) {
      obj.billing_address = {
        display: formatAddressDisplayName(data.billing_address),
        ...data.billing_address,
      };
    }
    if (data.shipping_address) {
      obj.shipping_address = {
        display: formatAddressDisplayName(data.shipping_address),
        ...data.shipping_address,
      };
    }
    if (data.current_total_duties_set) {
      obj.current_total_duties = data.current_total_duties_set?.shop_money?.amount;
    }
    if (data.current_total_additional_fees_set) {
      obj.current_total_additional_fees = data.current_total_additional_fees_set?.shop_money?.amount;
    }
    if (data.original_total_additional_fees_set) {
      obj.original_total_additional_fees = data.original_total_additional_fees_set?.shop_money?.amount;
    }
    if (data.original_total_duties_set) {
      obj.original_total_duties = data.original_total_duties_set?.shop_money?.amount;
    }
    if (data.total_shipping_price_set) {
      obj.total_shipping_price = data.total_shipping_price_set?.shop_money?.amount;
    }
    if (data.client_details) {
      obj.browser_user_agent = data.client_details?.user_agent as string;
      obj.browser_accept_language = data.client_details?.accept_language as string;
    }
    if (data.refunds) {
      obj.refunds = data.refunds.map((refund) => {
        return {
          ...refund,
          transactions: refund.transactions.map((transaction) => {
            return {
              id: transaction.id,
              label: transaction.label,
              amount: transaction.amount,
              createdAt: transaction.created_at,
              currency: transaction.currency,
              errorCode: transaction.error_code,
              gateway: transaction.gateway,
              kind: transaction.kind,
              parentTransactionId: transaction.parent_id,
              paymentId: transaction.payment_id,
              processedAt: transaction.processed_at,
              status: transaction.status,
              test: transaction.test,
              totalUnsettled: transaction.total_unsettled_set?.shop_money?.amount,
            };
          }),
        };
      });
    }
    // if (data.line_items) {
    //   obj.line_items = data.line_items.map((line_item) => {
    //     return {
    //       ...line_item,
    //       // variant: formatProductReferenceValueForSchema(line_item.variant_id),
    //     };
    //   });
    // }

    if (metafields) {
      metafields.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj as OrderRow;
  }
}
