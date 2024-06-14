// #region Imports

import { ListCustomCollectionsArgs } from '../../Clients/RestClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Collections } from '../../coda/setup/collections-setup';
import { CustomCollectionModel } from '../../models/rest/CustomCollectionModel';
import { SmartCollectionModel } from '../../models/rest/SmartCollectionModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResourcesWithGraphQlMetafields } from './AbstractSyncedRestResourcesWithGraphQlMetafields';

// #endregion

export class SyncedCollections<
  T extends CustomCollectionModel | SmartCollectionModel
> extends AbstractSyncedRestResourcesWithGraphQlMetafields<T> {
  public static schemaDependencies: FieldDependency<typeof CollectionSyncTableSchema.properties>[] = [
    {
      field: 'image',
      dependencies: ['image_url', 'image_alt_text'],
    },
    {
      field: 'id',
      dependencies: ['admin_url'],
    },
  ];

  public static staticSchema = CollectionSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Collections>;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Collection, context);
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [syncMetafields, updatedAtRange, publishedAtRange, handle, collectionIds, productId, publishedStatus, title] =
      this.codaParams as CodaSyncParams<typeof Sync_Collections>;
    return {
      syncMetafields,
      updatedAtRange,
      publishedAtRange,
      handle,
      collectionIds,
      productId,
      publishedStatus,
      title,
    };
  }

  protected codaParamsToListArgs(): Omit<ListCustomCollectionsArgs, 'limit' | 'options'> {
    const { updatedAtRange, publishedAtRange, handle, collectionIds, productId, publishedStatus, title } =
      this.codaParamsMap;

    return {
      fields: this.syncedStandardFields.join(','),
      ids: collectionIds && collectionIds.length ? collectionIds.join(',') : undefined,
      handle,
      product_id: productId,
      title,
      published_status: publishedStatus,
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      published_at_min: dateRangeMin(publishedAtRange),
      published_at_max: dateRangeMax(publishedAtRange),
    };
  }
}
