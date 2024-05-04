// #region Imports

import { SyncTableManagerRest } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_OrderLineItems } from '../../coda/setup/orderLineItems-setup';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { OrderLineItemRow } from '../../schemas/CodaRows.types';
import { OrderLineItemSchema } from '../../schemas/basic/OrderLineItemSchema';
import { updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { deepCopy } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { AbstractRestResource } from '../Abstract/Rest/AbstractRestResource';
import { BaseContext, TypeFromCodaSchemaProps } from '../types/Resource.types';
import { Duty, Order } from './Order';

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

export type LineItem = TypeFromCodaSchemaProps<(typeof OrderLineItemSchema)['properties']> & {
  duties: Duty[] | null;
};
// #endregion

export class OrderLineItem extends AbstractRestResource {
  public apiData: (LineItem & { order_id: number; order_name: string }) | null;

  public static readonly displayName: Identity = PACK_IDENTITIES.OrderLineItem;

  public static getStaticSchema() {
    return OrderLineItemSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.getStaticSchema());

    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    return augmentedSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncFunctionArgs<
    typeof Sync_OrderLineItems,
    SyncTableManagerRest<OrderLineItem>
  >): SyncRestFunction<OrderLineItem> {
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

    return async ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: {
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
        },
      });

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
