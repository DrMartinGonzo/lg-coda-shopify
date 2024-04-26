// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { SyncTableManagerRestWithGraphQlMetafields } from '../../SyncTableManager/Rest/SyncTableManagerRestWithMetafields';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTable.types';
import { MakeSyncRestFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_DraftOrders } from '../../coda/setup/draftOrders-setup';
import { Identity, OPTIONS_DRAFT_ORDER_STATUS, PACK_IDENTITIES } from '../../constants';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { DraftOrderSyncTableSchema, draftOrderFieldDependencies } from '../../schemas/syncTable/DraftOrderSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, filterObjectKeys, formatAddressDisplayName, formatPersonDisplayValue } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { CustomerCodaData } from './Customer';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';
import { ShippingLine } from './Order';
import { LineItem } from './OrderLineItem';
import { Shop } from './Shop';
import { InvalidValueVisibleError } from '../../Errors/Errors';

// #endregion

interface FindArgs extends BaseContext {
  id: number | string;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  fields?: unknown;
  limit?: unknown;
  since_id?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  ids?: unknown;
  status?: unknown;
}
interface CountArgs extends BaseContext {
  [key: string]: unknown;
  since_id?: unknown;
  status?: unknown;
  updated_at_max?: unknown;
  updated_at_min?: unknown;
}
interface SendInvoiceArgs {
  [key: string]: unknown;
  // body?: { [key: string]: unknown } | null;
}
interface CompleteArgs {
  [key: string]: unknown;
  payment_gateway_id?: unknown;
  payment_pending?: unknown;
  // body?: { [key: string]: unknown } | null;
}

export class DraftOrder extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields & {
    applied_discount: { [key: string]: unknown } | null;
    billing_address: { [key: string]: unknown } | null;
    completed_at: string | null;
    created_at: string | null;
    currency: string | null;
    customer: CustomerCodaData | null;
    email: string | null;
    id: number | null;
    invoice_sent_at: string | null;
    invoice_url: string | null;
    line_items: LineItem[] | null;
    name: string | null;
    note: string | null;
    note_attributes: { [key: string]: unknown }[] | null;
    order_id: number | null;
    payment_terms: { [key: string]: unknown } | null;
    shipping_address: { [key: string]: unknown } | null;
    shipping_line: ShippingLine | null;
    source_name: string | null;
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
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.DraftOrder;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.DraftOrder;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Draftorder;

  protected static readonly graphQlName = GraphQlResourceNames.DraftOrder;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'draft_orders/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'draft_orders.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'draft_orders/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'draft_orders.json' },
    { http_method: 'post', operation: 'send_invoice', ids: ['id'], path: 'draft_orders/<id>/send_invoice.json' },
    { http_method: 'put', operation: 'complete', ids: ['id'], path: 'draft_orders/<id>/complete.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'draft_orders/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.DraftOrder,
      plural: RestResourcesPlural.DraftOrder,
    },
  ];

  public static getStaticSchema() {
    return DraftOrderSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_DraftOrders>;

    let augmentedSchema = deepCopy(this.getStaticSchema());
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, this.metafieldGraphQlOwnerType, context);
    }

    const shopCurrencyCode = await Shop.activeCurrency({ context });
    updateCurrencyCodesInSchema(augmentedSchema, shopCurrencyCode);

    // // Line items
    // [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
    //   properties.price['currencyCode'] = shopCurrencyCode;
    //   properties.total_discount['currencyCode'] = shopCurrencyCode;
    //   properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
    // });

    // // Tax lines
    // [
    //   augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
    //   augmentedSchema.properties.tax_lines.items.properties,
    //   augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
    // ].forEach((properties) => {
    //   properties.price['currencyCode'] = shopCurrencyCode;
    // });

    // // Main props
    // augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;
    // augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
    // augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;

    // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncRestFunctionArgs<
    DraftOrder,
    typeof Sync_DraftOrders,
    SyncTableManagerRestWithGraphQlMetafields<DraftOrder>
  >): SyncRestFunction<DraftOrder> {
    const [syncMetafields, status, updated_at, ids, since_id] = codaSyncParams;

    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: {
          fields: syncTableManager.getSyncedStandardFields(draftOrderFieldDependencies).join(','),
          ids: ids && ids.length ? ids.join(',') : undefined,
          status,
          since_id,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
        },
      });

      return this.all(params);
    };
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<DraftOrder | null> {
    const result = await this.baseFind<DraftOrder>({
      urlIds: { id },
      params: { fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<DraftOrder>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    fields = null,
    limit = null,
    since_id = null,
    updated_at_min = null,
    updated_at_max = null,
    ids = null,
    status = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<DraftOrder>> {
    const response = await this.baseFind<DraftOrder>({
      context,
      urlIds: {},
      params: {
        fields,
        limit,
        since_id,
        updated_at_min,
        updated_at_max,
        ids,
        status,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  protected static validateParams(params: AllArgs) {
    if (params.status) {
      const validStatuses = OPTIONS_DRAFT_ORDER_STATUS;
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('status: ' + statuses.join(', '));
      }
    }
    return super.validateParams(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async send_invoice({ ...otherArgs }: SendInvoiceArgs): Promise<unknown> {
    const response = await this.request<DraftOrder>({
      http_method: 'post',
      operation: 'send_invoice',
      context: this.context,
      urlIds: { id: this.apiData.id },
      params: { ...otherArgs },
      // body: body,
      entity: this,
    });

    return response ? response.body : null;
  }

  public async complete({
    payment_gateway_id = null,
    payment_pending = null,
    // body = null,
    ...otherArgs
  }: CompleteArgs): Promise<unknown> {
    const response = await this.request<DraftOrder>({
      http_method: 'put',
      operation: 'complete',
      context: this.context,
      urlIds: { id: this.apiData.id },
      params: { payment_gateway_id, payment_pending, ...otherArgs },
      // body: body,
      entity: this,
    });

    return response ? response.body : null;
  }

  protected static async handleRowUpdate(
    prevRow: DraftOrderRow,
    newRow: DraftOrderRow,
    context: coda.SyncExecutionContext
  ) {
    // validateUpdateJob
    // TODO ? Combine with validateParams
    if (prevRow.status === 'completed' && [newRow.email, newRow.note].some((v) => v !== undefined)) {
      throw new coda.UserVisibleError("Can't update email or note on a completed draft order.");
    }
    return super.handleRowUpdate(prevRow, newRow, context);
  }
  // validateUpdateJob(update: coda.SyncUpdate<any, any, typeof DraftOrderSyncTableSchema>) {
  //   if (
  //     update.previousValue.status === 'completed' &&
  //     [update.newValue.email, update.newValue.note].some((v) => v !== undefined)
  //   ) {
  //     throw new coda.UserVisibleError("Can't update email or note on a completed draft order.");
  //   }
  //   return true;
  // }

  protected formatToApi({ row, metafields = [] }: FromRow<DraftOrderRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id', 'email', 'note', 'tags',
    ];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (metafields.length) {
      apiData.metafields = metafields;
    }

    return apiData;
  }

  public formatToRow(): DraftOrderRow {
    const { apiData } = this;

    let obj: DraftOrderRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/draft_orders/${apiData.id}`,
      subtotal_price: parseFloat(apiData.subtotal_price),
      total_price: parseFloat(apiData.total_price),
      total_tax: parseFloat(apiData.total_tax),
      line_items: apiData.line_items,
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
    if (apiData.order_id) {
      obj.order = formatOrderReference(apiData.order_id);
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
