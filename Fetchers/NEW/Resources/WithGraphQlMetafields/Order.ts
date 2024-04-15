// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import {
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  REST_DEFAULT_LIMIT,
} from '../../../../constants';
import {
  GraphQlResourceName,
  RestResourcePlural,
  RestResourceSingular,
} from '../../../../resources/ShopifyResource.types';
import { Sync_Orders } from '../../../../resources/orders/orders-coda';
import { OrderRow } from '../../../../schemas/CodaRows.types';
import { DiscountCodeSchema } from '../../../../schemas/basic/DiscountCodeSchema';
import { FulfillmentSchema } from '../../../../schemas/basic/FulfillmentSchema';
import { OrderTransactionSchema } from '../../../../schemas/basic/OrderTransactionSchema';
import { PriceSetSchema } from '../../../../schemas/basic/PriceSetSchema';
import { RefundSchema } from '../../../../schemas/basic/RefundSchema';
import { augmentSchemaWithMetafields } from '../../../../schemas/schema-helpers';
import { CustomerSyncTableSchema, formatCustomerReference } from '../../../../schemas/syncTable/CustomerSchema';
import { OrderSyncTableSchema, orderFieldDependencies } from '../../../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../../../types/admin.types';
import {
  deepCopy,
  filterObjectKeys,
  formatAddressDisplayName,
  formatPersonDisplayValue,
} from '../../../../utils/helpers';
import { BaseContext, FindAllResponse, ResourceDisplayName } from '../../AbstractResource';
import {
  CodaSyncParams,
  FromRow,
  GetSchemaArgs,
  MakeSyncFunctionArgs,
  SyncFunction,
} from '../../AbstractResource_Synced';
import { RestApiDataWithMetafields } from '../../AbstractResource_Synced_HasMetafields';
import { AbstractResource_Synced_HasMetafields_GraphQl } from '../../AbstractResource_Synced_HasMetafields_GraphQl';
import { SearchParams } from '../../RestClientNEW';
import { SyncTableRestHasGraphQlMetafields } from '../../SyncTableRestHasGraphQlMetafields';
import { Metafield, SupportedMetafieldOwnerResource } from '../Metafield';
import { LineItem } from '../OrderLineItem';
import { Shop } from '../Shop';
import { CustomerCodaData } from './Customer';

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

type Fulfillment = {
  [K in keyof (typeof FulfillmentSchema)['properties']]: coda.SchemaType<(typeof FulfillmentSchema)['properties'][K]>;
} & {
  line_items: LineItem[] | null;
};
type Transaction = {
  [K in keyof (typeof OrderTransactionSchema)['properties']]: coda.SchemaType<
    (typeof OrderTransactionSchema)['properties'][K]
  >;
};
type DiscountCode = {
  [K in keyof (typeof DiscountCodeSchema)['properties']]: coda.SchemaType<(typeof DiscountCodeSchema)['properties'][K]>;
};
type Refund = {
  [K in keyof (typeof RefundSchema)['properties']]: coda.SchemaType<(typeof RefundSchema)['properties'][K]>;
} & {
  transactions: Transaction[] | null;
};
type PriceSet = {
  [K in keyof (typeof PriceSetSchema)['properties']]: coda.SchemaType<(typeof PriceSetSchema)['properties'][K]>;
} & {
  transactions: Transaction[] | null;
};
// #endregion

export class Order extends AbstractResource_Synced_HasMetafields_GraphQl {
  public apiData: RestApiDataWithMetafields & {
    admin_graphql_api_id: string | null;
    // line_items: { [key: string]: unknown }[] | null;
    line_items: LineItem[] | null;
    app_id: number | null;
    billing_address: { [key: string]: unknown } | null;
    browser_ip: string | null;
    buyer_accepts_marketing: boolean | null;
    cancel_reason: string | null;
    cancelled_at: string | null;
    cart_token: string | null;
    checkout_token: string | null;
    client_details: { [key: string]: unknown } | null;
    closed_at: string | null;
    company: { [key: string]: unknown } | null;
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
    // discount_codes: DiscountCode[] | null | { [key: string]: any };
    discount_codes: DiscountCode[] | null;
    email: string | null;
    estimated_taxes: boolean | null;
    financial_status: string | null;
    fulfillment_status: string | null;
    // fulfillments: Fulfillment[] | null | { [key: string]: any };
    fulfillments: Fulfillment[] | null;
    gateway: string | null;
    id: number | null;
    landing_site: string | null;
    location_id: number | null;
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
    // refunds: Refund[] | null | { [key: string]: any };
    refunds: Refund[] | null;
    shipping_address: { [key: string]: unknown } | null;
    shipping_lines: { [key: string]: unknown }[] | null;
    source_identifier: string | null;
    source_name: string | null;
    source_url: string | null;
    subtotal_price: string | null;
    subtotal_price_set: PriceSet | null;
    tags: string | null;
    tax_lines: { [key: string]: unknown }[] | null;
    taxes_included: boolean | null;
    test: boolean | null;
    token: string | null;
    total_discounts: string | null;
    total_discounts_set: PriceSet | null;
    total_line_items_price: string | null;
    total_line_items_price_set: PriceSet | null;
    total_outstanding: string | null;
    total_price: string | null;
    total_price_set: PriceSet | null;
    // total_shipping_price_set: { [key: string]: unknown } | null;
    total_shipping_price_set: PriceSet | null;
    total_tax: string | null;
    total_tax_set: PriceSet | null;
    total_tip_received: string | null;
    total_weight: number | null;
    updated_at: string | null;
    user_id: number | null;
  };

  static readonly displayName = 'Order' as ResourceDisplayName;
  protected static graphQlName = GraphQlResourceName.Order;
  static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = 'order';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Order;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'orders/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'orders.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'orders/<id>.json' },
    { http_method: 'post', operation: 'cancel', ids: ['id'], path: 'orders/<id>/cancel.json' },
    { http_method: 'post', operation: 'close', ids: ['id'], path: 'orders/<id>/close.json' },
    { http_method: 'post', operation: 'open', ids: ['id'], path: 'orders/<id>/open.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'orders.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'orders/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Order,
      plural: RestResourcePlural.Order,
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

    const shopCurrencyCode = await Shop.activeCurrency({ context });
    // Refund order adjustments
    [augmentedSchema.properties.refunds.items.properties.order_adjustments.items.properties].forEach((properties) => {
      properties.amount['currencyCode'] = shopCurrencyCode;
      properties.tax_amount['currencyCode'] = shopCurrencyCode;
    });

    // Refund transactions
    [augmentedSchema.properties.refunds.items.properties.transactions.items.properties].forEach((properties) => {
      properties.amount['currencyCode'] = shopCurrencyCode;
      properties.totalUnsettled['currencyCode'] = shopCurrencyCode;
    });

    // Refund line items
    [augmentedSchema.properties.refunds.items.properties.refund_line_items.items.properties].forEach((properties) => {
      properties.subtotal['currencyCode'] = shopCurrencyCode;
      properties.total_tax['currencyCode'] = shopCurrencyCode;
    });

    // Line items
    [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
      properties.price['currencyCode'] = shopCurrencyCode;
      properties.total_discount['currencyCode'] = shopCurrencyCode;
      properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
    });

    // Shipping lines
    [augmentedSchema.properties.shipping_lines.items.properties].forEach((properties) => {
      properties.discounted_price['currencyCode'] = shopCurrencyCode;
      properties.price['currencyCode'] = shopCurrencyCode;
    });

    // Tax lines
    [
      augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
      augmentedSchema.properties.shipping_lines.items.properties.tax_lines.items.properties,
      augmentedSchema.properties.tax_lines.items.properties,
      augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
      augmentedSchema.properties.refunds.items.properties.duties.items.properties.tax_lines.items.properties,
    ].forEach((properties) => {
      properties.price['currencyCode'] = shopCurrencyCode;
    });

    // Main props
    augmentedSchema.properties.current_subtotal_price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.current_total_additional_fees['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.current_total_discounts['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.current_total_duties['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.current_total_price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.current_total_tax['currencyCode'] = shopCurrencyCode;

    augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;

    augmentedSchema.properties.total_discounts['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_line_items_price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_outstanding['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_shipping_price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_tip_received['currencyCode'] = shopCurrencyCode;

    // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<Order, typeof Sync_Orders, SyncTableRestHasGraphQlMetafields<Order>>): SyncFunction {
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
    ] = codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) => {
      // FIXME: !!!!!!!
      // TODO: do a helper function for this
      let params: AllArgs = {
        context,
        limit: adjustLimit ?? REST_DEFAULT_LIMIT,
      };

      /**
       * Because the request URL contains the page_info parameter, you can't add
       * any other parameters to the request, except for limit. Including other
       * parameters can cause the request to fail.
       * @see https://shopify.dev/api/usage/pagination-rest
       */
      if ('page_info' in nextPageQuery) {
        params = {
          ...params,
          ...nextPageQuery,
        };
      } else {
        params = {
          ...params,
          fields: syncTableManager.getSyncedStandardFields(orderFieldDependencies).join(','),
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

          ...nextPageQuery,
        };
      }

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
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Order>> {
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

    return response;
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

  // TODO ?
  validateParams = (params: any) => {
    if (params.status) {
      const validStatuses = OPTIONS_ORDER_STATUS;
      (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown status: ' + params.status);
      });
    }
    if (params.financial_status) {
      const validStatuses = OPTIONS_ORDER_FINANCIAL_STATUS;
      (Array.isArray(params.financial_status) ? params.financial_status : [params.financial_status]).forEach(
        (financial_status) => {
          if (!validStatuses.includes(financial_status))
            throw new coda.UserVisibleError('Unknown financial status: ' + params.financial_status);
        }
      );
    }
    if (params.fulfillment_status) {
      const validStatuses = OPTIONS_ORDER_FULFILLMENT_STATUS;
      (Array.isArray(params.fulfillment_status) ? params.fulfillment_status : [params.fulfillment_status]).forEach(
        (fulfillment_status) => {
          if (!validStatuses.includes(fulfillment_status))
            throw new coda.UserVisibleError('Unknown fulfillment status: ' + params.fulfillment_status);
        }
      );
    }
    return true;
  };

  protected formatToApi({ row, metafields = [] }: FromRow<OrderRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id', 'buyer_accepts_marketing', 'email',
      'note', 'tags',
    ];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    // if (row.accepts_email_marketing !== undefined)
    //   apiData.email_marketing_consent = {
    //     state:
    //       row.accepts_email_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
    //     opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
    //   };
    // if (row.accepts_sms_marketing !== undefined)
    //   apiData.sms_marketing_consent = {
    //     state: row.accepts_sms_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
    //     opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
    //   };

    if (metafields.length) {
      apiData.metafields = metafields;
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): OrderRow {
    const { apiData } = this;

    let obj: OrderRow = {
      ...filterObjectKeys(apiData, ['metafields']),
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
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
