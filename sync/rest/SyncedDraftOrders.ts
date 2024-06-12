// #region Imports

import { ListDraftOrdersArgs } from '../../Clients/RestApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_DraftOrders } from '../../coda/setup/draftOrders-setup';
import { DraftOrderModel } from '../../models/rest/DraftOrderModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { DraftOrderSyncTableSchema } from '../../schemas/syncTable/DraftOrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResourcesWithGraphQlMetafields } from './AbstractSyncedRestResourcesWithGraphQlMetafields';

// #endregion

export class SyncedDraftOrders extends AbstractSyncedRestResourcesWithGraphQlMetafields<DraftOrderModel> {
  public static schemaDependencies: FieldDependency<typeof DraftOrderSyncTableSchema.properties>[] = [
    {
      field: 'order',
      dependencies: ['order_id'],
    },
    {
      field: 'id',
      dependencies: ['admin_url'],
    },
  ];

  public static staticSchema = DraftOrderSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [, syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_DraftOrders>;

    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Draftorder, context);
    }
    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [syncMetafields, status, updatedAtRange, draftOrderIds, sinceId] = this.codaParams as CodaSyncParams<
      typeof Sync_DraftOrders
    >;
    return {
      syncMetafields,
      status,
      updatedAtRange,
      draftOrderIds,
      sinceId,
    };
  }

  protected codaParamsToListArgs(): Omit<ListDraftOrdersArgs, 'limit' | 'options'> {
    const { status, updatedAtRange, draftOrderIds, sinceId } = this.codaParamsMap;
    return {
      fields: this.syncedStandardFields.join(','),

      ids: draftOrderIds && draftOrderIds.length ? draftOrderIds.join(',') : undefined,
      status,
      since_id: sinceId,
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
    };
  }
}
