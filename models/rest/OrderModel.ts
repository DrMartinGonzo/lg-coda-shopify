// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CancelOrderArgs, OrderClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { OrderRow } from '../../schemas/CodaRows.types';
import { TypeFromCodaSchema } from '../../schemas/Schema.types';
import { CompanySchema } from '../../schemas/basic/CompanySchema';
import { DiscountCodeSchema } from '../../schemas/basic/DiscountCodeSchema';
import { DutySchema } from '../../schemas/basic/DutySchema';
import { FulfillmentSchema } from '../../schemas/basic/FulfillmentSchema';
import { OrderAdjustmentSchema } from '../../schemas/basic/OrderAdjustmentSchema';
import { PriceSetSchema } from '../../schemas/basic/PriceSetSchema';
import { RefundSchema } from '../../schemas/basic/RefundSchema';
import { ShippingLineSchema } from '../../schemas/basic/ShippingLineSchema';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { safeToFloat, safeToString } from '../../utils/helpers';
import { formatAddressToRow, formatPersonDisplayValue, formatRowAddressToApi } from '../utils/address-utils';
import { formatMetafieldsForOwnerRow } from '../utils/metafields-utils';
import { formatOrderLineItemPropertyForOrder, formatRefundProperty } from '../utils/orders-utils';
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
export interface AddressApiData {
  address1?: string;
  address2?: string;
  city?: string;
  company?: any;
  country?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  province?: string;
  zip?: string;
  name?: string;
  province_code?: string;
  country_code?: string;
  latitude?: string;
  longitude?: string;
}

export interface TransactionApiData {
  amount: string;
  authorization: string;
  authorization_expires_at: string;
  created_at: string;
  currency: string;
  device_id: number;
  error_code: string;
  extended_authorization_attributes: ExtendedAuthorizationAttributesApiData;
  gateway: string;
  id: number;
  kind: string;
  location_id: {
    id: number;
  };
  message: string;
  order_id: number;
  payment_details: PaymentDetailsApiData;
  payment_id: string;
  parent_id: number;
  payments_refund_attributes: PaymentsRefundAttributesApiData;
  processed_at: string;
  receipt: ReceiptApiData;
  source_name: string;
  status: string;
  total_unsettled_set: PriceSetApiData;
  test: boolean;
  user_id: number;
  currency_exchange_adjustment: CurrencyExchangeAdjustmentApiData;
}

interface PaymentsRefundAttributesApiData {
  status: string;
  acquirer_reference_number: string;
}

interface ExtendedAuthorizationAttributesApiData {
  standard_authorization_expires_at: string;
  extended_authorization_expires_at: string;
}

interface PaymentDetailsApiData {
  credit_card_bin: string;
  avs_result_code: string;
  cvv_result_code: string;
  credit_card_number: string;
  credit_card_company: string;
  credit_card_name: string;
  credit_card_wallet: string;
  credit_card_expiration_month: number;
  credit_card_expiration_year: number;
  buyer_action_info: BuyerActionInfoApiData;
  payment_method_name: string;
}
interface BuyerActionInfoApiData {
  multibanco: {
    Entity: string;
    Reference: string;
  };
}

interface ReceiptApiData {}

interface CurrencyExchangeAdjustmentApiData {
  id: number;
  adjustment: string;
  original_amount: string;
  final_amount: string;
  currency: string;
}

type CompanyApiData = TypeFromCodaSchema<typeof CompanySchema>;

type DiscountCodeApiData = TypeFromCodaSchema<typeof DiscountCodeSchema>;

export type DutyApiData = TypeFromCodaSchema<typeof DutySchema>;

type FulfillmentApiData = TypeFromCodaSchema<typeof FulfillmentSchema> & {
  line_items: OrderLineItemApiData[] | null;
};

type OrderAdjustmentApiData = TypeFromCodaSchema<typeof OrderAdjustmentSchema>;

export type PriceSetApiData = TypeFromCodaSchema<typeof PriceSetSchema>;

export type ShippingLineApiData = TypeFromCodaSchema<typeof ShippingLineSchema>;

export interface RefundLineItemApiData {
  id: number;
  line_item: OrderLineItemApiData;
  line_item_id: number;
  quantity: number;
  location_id: number;
  restock_type: string;
  subtotal: number;
  total_tax: number;
  subtotal_set: PriceSetApiData;
  total_tax_set: PriceSetApiData;
}

export type RefundApiData = TypeFromCodaSchema<typeof RefundSchema> & {
  duties: DutyApiData[] | null;
  transactions: TransactionApiData[] | null;
  order_adjustments: OrderAdjustmentApiData[] | null;
  refund_line_items: RefundLineItemApiData[] | null;
};

export interface OrderApiData extends BaseApiDataRest {
  admin_graphql_api_id: string | null;
  line_items: OrderLineItemApiData[] | null;
  app_id: number | null;
  billing_address: AddressApiData | null;
  browser_ip: string | null;
  buyer_accepts_marketing: boolean | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  client_details: { [key: string]: unknown } | null;
  closed_at: string | null;
  company: CompanyApiData | null;
  confirmation_number: string | null;
  created_at: string | null;
  currency: string | null;
  current_subtotal_price: string | null;
  current_subtotal_price_set: PriceSetApiData | null;
  current_total_additional_fees_set: PriceSetApiData | null;
  current_total_discounts: string | null;
  current_total_discounts_set: PriceSetApiData | null;
  current_total_duties_set: PriceSetApiData | null;
  current_total_price: string | null;
  current_total_price_set: PriceSetApiData | null;
  current_total_tax: string | null;
  current_total_tax_set: PriceSetApiData | null;
  customer: Partial<CustomerApiData> | null;
  customer_locale: string | null;
  discount_applications: { [key: string]: unknown }[] | null;
  discount_codes: DiscountCodeApiData[] | null;
  email: string | null;
  estimated_taxes: boolean | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  fulfillments: FulfillmentApiData[] | null;
  id: number | null;
  landing_site: string | null;
  merchant_of_record_app_id: number | null;
  name: string | null;
  note: string | null;
  note_attributes: { [key: string]: unknown }[] | null;
  number: number | null;
  order_number: number | null;
  order_status_url: string | null;
  original_total_additional_fees_set: PriceSetApiData | null;
  original_total_duties_set: PriceSetApiData | null;
  payment_gateway_names: string[] | null;
  payment_terms: { [key: string]: unknown } | null;
  phone: string | null;
  po_number: string | null;
  presentment_currency: string | null;
  processed_at: string | null;
  referring_site: string | null;
  refunds: RefundApiData[] | null;
  shipping_address: AddressApiData | null;
  shipping_lines: ShippingLineApiData[] | null;
  source_identifier: string | null;
  source_name: string | null;
  source_url: string | null;
  subtotal_price: string | null;
  subtotal_price_set: PriceSetApiData | null;
  tags: string | null;
  tax_lines: { [key: string]: unknown }[] | null;
  taxes_included: boolean | null;
  test: boolean | null;
  total_discounts: string | null;
  total_discounts_set: PriceSetApiData | null;
  total_line_items_price: string | null;
  total_line_items_price_set: PriceSetApiData | null;
  total_outstanding: string | null;
  total_price: string | null;
  total_price_set: PriceSetApiData | null;
  total_shipping_price_set: PriceSetApiData | null;
  total_tax: string | null;
  total_tax_set: PriceSetApiData | null;
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

      company: row.company as CompanyApiData,
      customer: row.customer?.id ? { id: row.customer.id } : undefined,
      discount_codes: row.discount_codes as DiscountCodeApiData[],
      fulfillments: row.fulfillments as FulfillmentApiData[],
      line_items: row.line_items as OrderLineItemApiData[],
      refunds: row.refunds as unknown as RefundApiData[],
      shipping_lines: row.shipping_lines as ShippingLineApiData[],

      billing_address: formatRowAddressToApi(row.billing_address),
      shipping_address: formatRowAddressToApi(row.shipping_address),
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
    const {
      metafields = [],
      billing_address,
      client_details,
      current_total_additional_fees_set,
      current_total_duties_set,
      customer,
      line_items = [],
      original_total_additional_fees_set,
      original_total_duties_set,
      refunds,
      shipping_address,
      total_shipping_price_set,
      ...data
    } = this.data;
    const obj: OrderRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/orders/${data.id}`,

      current_subtotal_price: safeToFloat(data.current_subtotal_price),
      current_total_additional_fees: safeToFloat(current_total_additional_fees_set?.shop_money?.amount),
      current_total_discounts: safeToFloat(data.current_total_discounts),
      current_total_duties: safeToFloat(current_total_duties_set?.shop_money?.amount),
      current_total_price: safeToFloat(data.current_total_price),
      current_total_tax: safeToFloat(data.current_total_tax),
      original_total_additional_fees: safeToFloat(original_total_additional_fees_set?.shop_money?.amount),
      original_total_duties: safeToFloat(original_total_duties_set?.shop_money?.amount),
      subtotal_price: safeToFloat(data.subtotal_price),
      total_discounts: safeToFloat(data.total_discounts),
      total_line_items_price: safeToFloat(data.total_line_items_price),
      total_outstanding: safeToFloat(data.total_outstanding),
      total_price: safeToFloat(data.total_price),
      total_shipping_price: safeToFloat(total_shipping_price_set?.shop_money?.amount),
      total_tax: safeToFloat(data.total_tax),
      total_tip_received: safeToFloat(data.total_tip_received),

      fulfillments: data.fulfillments,
      line_items: line_items.map(formatOrderLineItemPropertyForOrder),
      billing_address: formatAddressToRow(billing_address),
      shipping_address: formatAddressToRow(shipping_address),

      ...formatMetafieldsForOwnerRow(metafields),
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

    if (client_details) {
      obj.browser_user_agent = client_details?.user_agent as string;
      obj.browser_accept_language = client_details?.accept_language as string;
    }
    if (refunds) {
      obj.refunds = refunds.map(formatRefundProperty);
    }
    // if (data.line_items) {
    //   obj.line_items = data.line_items.map((line_item) => {
    //     return {
    //       ...line_item,
    //       // variant: formatProductReferenceValueForSchema(line_item.variant_id),
    //     };
    //   });
    // }

    return obj as OrderRow;
  }
}
