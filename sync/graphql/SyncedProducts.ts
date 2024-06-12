// #region Imports

import { ListProductsArgs } from '../../Clients/GraphQlApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Products } from '../../coda/setup/products-setup';
import { ProductModel } from '../../models/graphql/ProductModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ProductSyncTableSchema } from '../../schemas/syncTable/ProductSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedProducts extends AbstractSyncedGraphQlResources<ProductModel> {
  public static schemaDependencies: FieldDependency<typeof ProductSyncTableSchema.properties>[] = [
    {
      field: 'storeUrl',
      dependencies: ['published'],
    },
    // {
    //   field: 'handle',
    //   dependencies: ['storeUrl'],
    // },
    // {
    //   field: 'status',
    //   dependencies: ['storeUrl'],
    // },
  ];

  public static staticSchema = ProductSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Products>;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Product, context);
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [
      syncMetafields,
      productTypesArray,
      createdAtRange,
      updatedAtRange,
      statusArray,
      publishedStatus,
      vendorsArray,
      idArray,
      tagsArray,
    ] = this.codaParams as CodaSyncParams<typeof Sync_Products>;
    return {
      syncMetafields,
      productTypesArray,
      createdAtRange,
      updatedAtRange,
      statusArray,
      publishedStatus,
      vendorsArray,
      idArray,
      tagsArray,
    };
  }

  protected codaParamsToListArgs() {
    const {
      createdAtRange,
      idArray,
      productTypesArray,
      publishedStatus,
      statusArray,
      tagsArray,
      updatedAtRange,
      vendorsArray,
    } = this.codaParamsMap;
    const fields: ListProductsArgs['fields'] = {
      metafields: this.shouldSyncMetafields,
    };

    ['options', 'featuredImage', 'images'].forEach((key) => {
      fields[key] = this.effectiveStandardFromKeys.includes(key);
    });

    return {
      fields,
      metafieldKeys: this.effectiveMetafieldKeys,
      created_at_min: dateRangeMin(createdAtRange),
      created_at_max: dateRangeMax(createdAtRange),
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      tags: tagsArray,
      // gift_card: false,
      ids: idArray,
      status: statusArray,
      published_status: publishedStatus,
      product_types: productTypesArray,
      vendors: vendorsArray,
    } as ListProductsArgs;
  }

  /**
   * {@link Product} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_type
   * - owner_id if not a Shop metafield
   */
  // protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
  //   const additionalProperties = ['label', 'type', 'owner_type'];
  //   if (update.newValue.owner_type !== ProductOwnerType.Shop) {
  //     additionalProperties.push('owner_id');
  //   }

  //   return super.getRequiredPropertiesForUpdate(update).concat(additionalProperties);
  // }
}
