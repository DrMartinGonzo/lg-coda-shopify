// #region Imports

import { ListOrdersArgs } from '../../Clients/RestApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Orders } from '../../coda/setup/orders-setup';
import { OrderModel } from '../../models/rest/OrderModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { OrderSyncTableSchema } from '../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { arrayUnique, dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResourcesWithGraphQlMetafields } from './AbstractSyncedRestResourcesWithGraphQlMetafields';

// #endregion

export class SyncedOrders extends AbstractSyncedRestResourcesWithGraphQlMetafields<OrderModel> {
  public static schemaDependencies: FieldDependency<typeof OrderSyncTableSchema.properties>[] = [
    //   {
    //   field: 'handle',
    //   dependencies: ['storeUrl'],
    // },
    {
      field: 'client_details',
      dependencies: ['browser_user_agent', 'browser_accept_language'],
    },
    {
      field: 'current_total_duties_set',
      dependencies: ['current_total_duties'],
    },
    {
      field: 'current_total_additional_fees_set',
      dependencies: ['current_total_additional_fees'],
    },
    {
      field: 'original_total_additional_fees_set',
      dependencies: ['original_total_additional_fees'],
    },
    {
      field: 'original_total_duties_set',
      dependencies: ['original_total_duties'],
    },
    {
      field: 'total_shipping_price_set',
      dependencies: ['total_shipping_price'],
    },
    {
      field: 'id',
      dependencies: ['admin_url'],
    },
  ];

  public static staticSchema = OrderSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [, syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Orders>;

    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Order, context);
    }
    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [
      status,
      syncMetafields,
      createdAtRange,
      updatedAtRange,
      processedAtRange,
      financialStatus,
      fulfillmentStatus,
      orderIds,
      sinceId,
      customerTags,
      orderTags,
    ] = this.codaParams as CodaSyncParams<typeof Sync_Orders>;
    return {
      status,
      syncMetafields,
      createdAtRange,
      updatedAtRange,
      processedAtRange,
      financialStatus,
      fulfillmentStatus,
      orderIds,
      sinceId,
      customerTags,
      orderTags,
    };
  }

  protected get syncedStandardFields(): string[] {
    // Add required fields needed for certain filters
    const extraFields = [];
    if (this.codaParamsMap.orderTags) extraFields.push('tags');
    if (this.codaParamsMap.customerTags) extraFields.push('customer');
    return extraFields.length
      ? arrayUnique([...super.syncedStandardFields, ...extraFields])
      : super.syncedStandardFields;
  }

  protected codaParamsToListArgs(): Omit<ListOrdersArgs, 'limit' | 'options'> {
    const {
      status,
      createdAtRange,
      updatedAtRange,
      processedAtRange,
      financialStatus,
      fulfillmentStatus,
      orderIds,
      sinceId,
      customerTags,
      orderTags,
    } = this.codaParamsMap;
    return {
      fields: this.syncedStandardFields.join(','),
      ids: orderIds && orderIds.length ? orderIds.join(',') : undefined,
      financial_status: financialStatus,
      fulfillment_status: fulfillmentStatus,
      status,
      since_id: sinceId,
      created_at_min: dateRangeMin(createdAtRange),
      created_at_max: dateRangeMax(createdAtRange),
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      processed_at_min: dateRangeMin(processedAtRange),
      processed_at_max: dateRangeMax(processedAtRange),
      customerTags,
      orderTags,
    };
  }
}
