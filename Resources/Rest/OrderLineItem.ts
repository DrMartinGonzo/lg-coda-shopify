// #region Imports
import * as coda from '@codahq/packs-sdk';

import { REST_DEFAULT_LIMIT } from '../../constants';
import { Sync_OrderLineItems } from '../../coda/setup/orderLineItems-setup';
import { OrderLineItemRow } from '../../schemas/CodaRows.types';
import { OrderLineItemSchema } from '../../schemas/basic/OrderLineItemSchema';
import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { deepCopy } from '../../utils/helpers';
import { BaseContext, ResourceDisplayName } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractSyncedRestResource,
  GetSchemaArgs,
  MakeSyncFunctionArgs,
  SyncFunction,
} from '../Abstract/Rest/AbstractSyncedRestResource';
import { SearchParams } from '../../Clients/RestClient';
import { Shop } from './Shop';
import { Order } from './Order';

// #endregion

// #region Types
interface AllArgs extends BaseContext {
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
  status?: unknown;
  financial_status?: unknown;
  fulfillment_status?: unknown;
  fields?: unknown;
}

export type LineItem = {
  [K in keyof (typeof OrderLineItemSchema)['properties']]: coda.SchemaType<
    (typeof OrderLineItemSchema)['properties'][K]
  >;
};
// #endregion

export class OrderLineItem extends AbstractSyncedRestResource {
  public apiData: (LineItem & { order_id: number; order_name: string }) | null;

  static readonly displayName = 'Order LineItem' as ResourceDisplayName;

  public static getStaticSchema() {
    return OrderLineItemSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.getStaticSchema());

    const shopCurrencyCode = await Shop.activeCurrency({ context });

    // Main props
    augmentedSchema.properties.price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.total_discount['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;

    return augmentedSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncFunctionArgs<OrderLineItem, typeof Sync_OrderLineItems>): SyncFunction {
    const [
      orderStatus = 'any',
      orderCreatedAt,
      orderUpdatedAt,
      orderProcessedAt,
      orderFinancialStatus,
      orderFulfillmentStatus,
      orderIds,
      ordersSinceId,
    ] = codaSyncParams;

    return async (nextPageQuery: SearchParams = {}, adjustLimit?: number) => {
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
          fields: ['id', 'name', 'line_items'].join(','),
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

          ...nextPageQuery,
        };
      }

      const orders = await Order.all(params);
      const orderLineItems = orders.data.flatMap((order) => {
        return order.apiData.line_items.map(
          (line_item) =>
            new OrderLineItem({
              context,
              fromData: {
                ...line_item,
                order_id: order.apiData.id,
                order_name: order.apiData.name,
              } as OrderLineItem['apiData'],
            })
        );
      });

      return {
        data: orderLineItems,
        headers: orders.headers,
        pageInfo: orders.pageInfo,
      };
    };
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi() {}

  public formatToRow(): OrderLineItemRow {
    const { apiData } = this;

    let obj: OrderLineItemRow = {
      ...apiData,
      order_id: apiData.order_id,
      order: formatOrderReference(apiData.order_id, apiData.order_name),
      variant: formatProductVariantReference(apiData.variant_id, apiData.variant_title),
    };

    return obj;
  }
}
