// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_DraftOrders } from '../../coda/setup/draftOrders-setup';
import { Identity, OPTIONS_DRAFT_ORDER_STATUS, PACK_IDENTITIES } from '../../constants';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { DraftOrderSyncTableSchema, draftOrderFieldDependencies } from '../../schemas/syncTable/DraftOrderSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, excludeObjectKeys, formatAddressDisplayName, formatPersonDisplayValue } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { CustomerCodaData } from './Customer';
import { SupportedMetafieldOwnerResource } from './Metafield';
import { ShippingLine } from './Order';
import { LineItem } from './OrderLineItem';

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

    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_DraftOrders,
    SyncTableManagerRestWithMetafieldsType<DraftOrder>
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

  protected static validateUpdateJob(prevRow: DraftOrderRow, newRow: DraftOrderRow): boolean {
    if (prevRow.status === 'completed' && [newRow.email, newRow.note].some((v) => v !== undefined)) {
      throw new coda.UserVisibleError("Can't update email or note on a completed draft order.");
    }
    return super.validateUpdateJob(prevRow, newRow);
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

  protected formatToApi({ row, metafields }: FromRow<DraftOrderRow>) {
    let apiData: Partial<typeof this.apiData> = {
      applied_discount: row.applied_discount,
      billing_address: row.billing_address,
      completed_at: row.completed_at ? row.completed_at.toString() : undefined,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      currency: row.currency,
      customer: (row.customer as CustomerCodaData) ?? undefined,
      email: row.email,
      id: row.id,
      invoice_sent_at: row.invoice_sent_at ? row.invoice_sent_at.toString() : undefined,
      invoice_url: row.invoice_url,
      line_items: row.line_items as LineItem[],
      name: row.name,
      note_attributes: row.note_attributes,
      note: row.note,
      order_id: row.order_id,
      payment_terms: row.payment_terms,
      shipping_address: row.shipping_address,
      shipping_line: row.shipping_line as ShippingLine,
      status: row.status,
      subtotal_price: row.subtotal_price ? row.subtotal_price.toString() : undefined,
      tags: row.tags,
      tax_exempt: row.tax_exempt,
      tax_exemptions: row.tax_exemptions,
      tax_lines: row.tax_lines,
      taxes_included: row.taxes_included,
      total_price: row.total_price ? row.total_price.toString() : undefined,
      total_tax: row.total_tax ? row.total_tax.toString() : undefined,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,

      metafields,
    };

    return apiData;
  }

  public formatToRow(): DraftOrderRow {
    const { apiData } = this;

    let obj: DraftOrderRow = {
      ...excludeObjectKeys(apiData, ['metafields']),
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
      apiData.metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
