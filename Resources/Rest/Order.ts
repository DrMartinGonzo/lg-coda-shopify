// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Orders } from '../../coda/setup/orders-setup';
import {
  Identity,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  PACK_IDENTITIES,
} from '../../constants';
import { OrderRow } from '../../schemas/CodaRows.types';
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
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { OrderSyncTableSchema, orderFieldDependencies } from '../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  arrayUnique,
  deepCopy,
  excludeObjectKeys,
  formatAddressDisplayName,
  formatPersonDisplayValue,
  splitAndTrimValues,
} from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { BaseContext, CulNew, FromRow, TypeFromCodaSchemaProps } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { CustomerCodaData } from './Customer';
import { SupportedMetafieldOwnerResource } from './Metafield';
import { LineItem } from './OrderLineItem';

// #endregion

// #region Types
interface FindArgs extends BaseContext {
  id: number | string;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
}
export interface AllArgs extends BaseContext {
  [key: string]: unknown;
  ids?: unknown;
  limit?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  processed_at_min?: unknown;
  processed_at_max?: unknown;
  attribution_app_id?: unknown;
  status?: unknown;
  financial_status?: unknown;
  fulfillment_status?: unknown;
  fields?: unknown;
  customerTags?: string[];
  orderTags?: string[];
}
interface CancelArgs extends BaseContext {
  [key: string]: unknown;
  amount?: unknown;
  currency?: unknown;
  restock?: unknown;
  reason?: unknown;
  email?: unknown;
  refund?: unknown;
  body?: { [key: string]: unknown } | null;
}
interface CloseArgs extends BaseContext {
  [key: string]: unknown;
  body?: { [key: string]: unknown } | null;
}
interface OpenArgs extends BaseContext {
  [key: string]: unknown;
  body?: { [key: string]: unknown } | null;
}

type Company = TypeFromCodaSchemaProps<(typeof CompanySchema)['properties']>;

type DiscountCode = TypeFromCodaSchemaProps<(typeof DiscountCodeSchema)['properties']>;

export type Duty = TypeFromCodaSchemaProps<(typeof DutySchema)['properties']>;

type Fulfillment = TypeFromCodaSchemaProps<(typeof FulfillmentSchema)['properties']> & {
  line_items: LineItem[] | null;
};

type OrderAdjustment = TypeFromCodaSchemaProps<(typeof OrderAdjustmentSchema)['properties']>;

type PriceSet = TypeFromCodaSchemaProps<(typeof PriceSetSchema)['properties']> & {
  transactions: Transaction[] | null;
};

type RefundLineItem = TypeFromCodaSchemaProps<(typeof RefundLineItemSchema)['properties']>;

export type ShippingLine = TypeFromCodaSchemaProps<(typeof ShippingLineSchema)['properties']>;

type Transaction = TypeFromCodaSchemaProps<(typeof OrderTransactionSchema)['properties']>;

// TODO: can we make this more recursive to avoid adding manually the coda.SchemaType of subproperties?
type Refund = {
  [K in keyof (typeof RefundSchema)['properties']]: coda.SchemaType<(typeof RefundSchema)['properties'][K]>;
} & {
  duties: Duty[] | null;
  transactions: Transaction[] | null;
  order_adjustments: OrderAdjustment[] | null;
  refund_line_items: RefundLineItem[] | null;
};
// #endregion

export class Order extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields & {
    admin_graphql_api_id: string | null;
    line_items: LineItem[] | null;
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
    customer: CustomerCodaData | null;
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
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.Order;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Order;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Order;

  protected static readonly graphQlName = GraphQlResourceNames.Order;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'orders/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'orders.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'orders/<id>.json' },
    { http_method: 'post', operation: 'cancel', ids: ['id'], path: 'orders/<id>/cancel.json' },
    { http_method: 'post', operation: 'close', ids: ['id'], path: 'orders/<id>/close.json' },
    { http_method: 'post', operation: 'open', ids: ['id'], path: 'orders/<id>/open.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'orders.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'orders/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Order,
      plural: RestResourcesPlural.Order,
    },
  ];

  public static getStaticSchema() {
    return OrderSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [, syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Orders>;

    let augmentedSchema = deepCopy(this.getStaticSchema());
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, this.metafieldGraphQlOwnerType, context);
    }
    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<typeof Sync_Orders, SyncTableManagerRestWithMetafieldsType<Order>>): SyncRestFunction<Order> {
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
      customerTags,
      orderTags,
    ] = codaSyncParams;

    // Add required fields needed for certain filters
    const fieldsArray = syncTableManager.getSyncedStandardFields(orderFieldDependencies);
    if (orderTags && orderTags.length) {
      fieldsArray.push('tags');
    }
    if (customerTags && customerTags.length) {
      fieldsArray.push('customer');
    }

    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: {
          fields: arrayUnique(fieldsArray).join(','),
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
          customerTags,
          orderTags,
        },
      });

      return this.all(params);
    };
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<Order | null> {
    const result = await this.baseFind<Order>({
      urlIds: { id },
      params: { fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Order>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    ids = null,
    limit = null,
    since_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    processed_at_min = null,
    processed_at_max = null,
    attribution_app_id = null,
    status = null,
    financial_status = null,
    fulfillment_status = null,
    fields = null,
    options = {},
    customerTags: filterCustomerTags = [],
    orderTags: filterOrderTags = [],
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<Order>> {
    const response = await this.baseFind<Order>({
      context,
      urlIds: {},
      params: {
        ids,
        limit,
        since_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        processed_at_min,
        processed_at_max,
        attribution_app_id,
        status,
        financial_status,
        fulfillment_status,
        fields,
        ...otherArgs,
      },
      options,
    });

    return {
      ...response,
      data: response.data.filter((d) => {
        let passCustomerTags = true;
        let passOrderTags = true;
        if (filterCustomerTags.length) {
          const customerTags = splitAndTrimValues(d.apiData?.customer?.tags ?? '');
          passCustomerTags = customerTags.length && customerTags.some((t) => filterCustomerTags.includes(t));
        }
        if (filterOrderTags.length) {
          const orderTags = splitAndTrimValues(d.apiData?.tags ?? '');
          passOrderTags = orderTags.length && orderTags.some((t) => filterOrderTags.includes(t));
        }
        return passCustomerTags && passOrderTags;
      }),
    };
  }

  protected static validateParams(params: AllArgs) {
    if (params.status) {
      const validStatuses = OPTIONS_ORDER_STATUS;
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('status: ' + statuses.join(', '));
      }
    }
    if (params.financial_status) {
      const validStatuses = OPTIONS_ORDER_FINANCIAL_STATUS;
      const statuses = Array.isArray(params.financial_status) ? params.financial_status : [params.financial_status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('financial status: ' + statuses.join(', '));
      }
    }
    if (params.fulfillment_status) {
      const validStatuses = OPTIONS_ORDER_FULFILLMENT_STATUS;
      const statuses = Array.isArray(params.fulfillment_status)
        ? params.fulfillment_status
        : [params.fulfillment_status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('fulfillment status: ' + statuses.join(', '));
      }
    }

    return super.validateParams(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async cancel({
    amount = null,
    currency = null,
    restock = null,
    reason = null,
    email = null,
    refund = null,
    body = null,
    options,
    ...otherArgs
  }: CancelArgs): Promise<unknown> {
    const response = await this.request<Order>({
      http_method: 'post',
      operation: 'cancel',
      context: this.context,
      urlIds: { id: this.apiData.id },
      params: {
        amount: amount,
        currency: currency,
        restock: restock,
        reason: reason,
        email: email,
        refund: refund,
        ...otherArgs,
      },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }

  public async close({ body = null, options, ...otherArgs }: CloseArgs): Promise<unknown> {
    const response = await this.request<Order>({
      http_method: 'post',
      operation: 'close',
      context: this.context,
      urlIds: { id: this.apiData.id },
      params: { ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }

  public async open({ body = null, options, ...otherArgs }: OpenArgs): Promise<unknown> {
    const response = await this.request<Order>({
      http_method: 'post',
      operation: 'open',
      context: this.context,
      urlIds: { id: this.apiData.id },
      params: { ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }

  protected formatToApi({ row, metafields }: FromRow<OrderRow>) {
    let apiData: Partial<typeof this.apiData> = {
      ...row,

      cancelled_at: row.cancelled_at ? row.cancelled_at.toString() : undefined,
      closed_at: row.closed_at ? row.closed_at.toString() : undefined,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      processed_at: row.processed_at ? row.processed_at.toString() : undefined,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,

      current_subtotal_price: row.current_subtotal_price ? row.current_subtotal_price.toString() : undefined,
      current_total_discounts: row.current_total_discounts ? row.current_total_discounts.toString() : undefined,
      current_total_price: row.current_total_price ? row.current_total_price.toString() : undefined,
      current_total_tax: row.current_total_tax ? row.current_total_tax.toString() : undefined,
      subtotal_price: row.subtotal_price ? row.subtotal_price.toString() : undefined,
      total_discounts: row.total_discounts ? row.total_discounts.toString() : undefined,
      total_line_items_price: row.total_line_items_price ? row.total_line_items_price.toString() : undefined,
      total_outstanding: row.total_outstanding ? row.total_outstanding.toString() : undefined,
      total_price: row.total_price ? row.total_price.toString() : undefined,
      total_tax: row.total_tax ? row.total_tax.toString() : undefined,
      total_tip_received: row.total_tip_received ? row.total_tip_received.toString() : undefined,

      company: row.company as Company,
      customer: (row.customer as CustomerCodaData) ?? undefined,
      discount_codes: row.discount_codes as DiscountCode[],
      fulfillments: row.fulfillments as Fulfillment[],
      line_items: row.line_items as LineItem[],
      refunds: row.refunds as Refund[],
      shipping_lines: row.shipping_lines as ShippingLine[],

      metafields,
    };

    return apiData;
  }

  public formatToRow(): OrderRow {
    const { apiData } = this;

    let obj: OrderRow = {
      ...excludeObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/orders/${apiData.id}`,
      current_total_discounts: parseFloat(apiData.current_total_discounts),
      current_total_price: parseFloat(apiData.current_total_price),
      current_subtotal_price: parseFloat(apiData.current_subtotal_price),
      current_total_tax: parseFloat(apiData.current_total_tax),
      subtotal_price: parseFloat(apiData.subtotal_price),
      total_discounts: parseFloat(apiData.total_discounts),
      total_line_items_price: parseFloat(apiData.total_line_items_price),
      total_outstanding: parseFloat(apiData.total_outstanding),
      total_price: parseFloat(apiData.total_price),
      total_tax: parseFloat(apiData.total_tax),
      total_tip_received: parseFloat(apiData.total_tip_received),
      fulfillments: apiData.fulfillments,
      line_items: apiData.line_items as any,
    };

    if (apiData.customer) {
      obj.customer = formatCustomerReference(
        apiData.customer.id,
        formatPersonDisplayValue({
          id: apiData.customer.id,
          firstName: apiData.customer.first_name,
          lastName: apiData.customer.last_name,
          email: apiData.customer.email,
        })
      );
    }
    if (apiData.billing_address) {
      obj.billing_address = {
        display: formatAddressDisplayName(apiData.billing_address),
        ...apiData.billing_address,
      };
    }
    if (apiData.shipping_address) {
      obj.shipping_address = {
        display: formatAddressDisplayName(apiData.shipping_address),
        ...apiData.shipping_address,
      };
    }
    if (apiData.current_total_duties_set) {
      obj.current_total_duties = apiData.current_total_duties_set?.shop_money?.amount;
    }
    if (apiData.current_total_additional_fees_set) {
      obj.current_total_additional_fees = apiData.current_total_additional_fees_set?.shop_money?.amount;
    }
    if (apiData.original_total_additional_fees_set) {
      obj.original_total_additional_fees = apiData.original_total_additional_fees_set?.shop_money?.amount;
    }
    if (apiData.original_total_duties_set) {
      obj.original_total_duties = apiData.original_total_duties_set?.shop_money?.amount;
    }
    if (apiData.total_shipping_price_set) {
      obj.total_shipping_price = apiData.total_shipping_price_set?.shop_money?.amount;
    }
    if (apiData.client_details) {
      obj.browser_user_agent = apiData.client_details?.user_agent as string;
      obj.browser_accept_language = apiData.client_details?.accept_language as string;
    }
    if (apiData.refunds) {
      obj.refunds = apiData.refunds.map((refund) => {
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
    // if (apiData.line_items) {
    //   obj.line_items = apiData.line_items.map((line_item) => {
    //     return {
    //       ...line_item,
    //       // variant: formatProductReferenceValueForSchema(line_item.variant_id),
    //     };
    //   });
    // }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
