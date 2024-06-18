// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ListVariantsArgs, VariantFieldsArgs } from '../../Clients/GraphQlClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_ProductVariants } from '../../coda/setup/productVariants-setup';
import { VARIANT_OPTION_KEYS, VARIANT_WEIGHT_KEYS, VariantModel } from '../../models/graphql/VariantModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncVariantsParams = CodaSyncParams<typeof Sync_ProductVariants>;
// #endregion

export class SyncedVariants extends AbstractSyncedGraphQlResources<VariantModel> {
  public static schemaDependencies: FieldDependency<typeof ProductVariantSyncTableSchema.properties>[] = [
    {
      field: 'images',
      dependencies: ['image'],
    },
    {
      field: 'handle',
      dependencies: ['storeUrl'],
    },
    {
      field: 'status',
      dependencies: ['storeUrl'],
    },
    {
      field: 'title',
      dependencies: ['product'],
    },
  ];

  public static staticSchema = ProductVariantSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as SyncVariantsParams;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Productvariant, context);
    }

    augmentedSchema = await updateCurrencyCodesInSchema(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [
      syncMetafields,
      productTypes,
      createdAtRange,
      updatedAtRange,
      status,
      publishedStatus,
      vendors,
      skus,
      productIds,
    ] = this.codaParams as SyncVariantsParams;
    return {
      syncMetafields,
      productTypes,
      createdAtRange,
      updatedAtRange,
      status,
      publishedStatus,
      vendors,
      skus,
      productIds,
    };
  }

  protected codaParamsToListArgs() {
    const {
      syncMetafields,
      productTypes,
      createdAtRange,
      updatedAtRange,
      status,
      publishedStatus,
      vendors,
      skus,
      productIds,
    } = this.codaParamsMap;

    const hasEffectiveKey = (key: string) => this.effectiveStandardFromKeys.includes(key);

    const fields: VariantFieldsArgs = { metafields: this.shouldSyncMetafields };
    if (['image'].some(hasEffectiveKey)) {
      fields.image = true;
    }
    if (VARIANT_WEIGHT_KEYS.concat(['inventory_item_id']).some(hasEffectiveKey)) {
      fields.inventoryItem = true;
      if (VARIANT_WEIGHT_KEYS.some(hasEffectiveKey)) {
        fields.weight = true;
      }
    }
    if (['product_id', 'product', 'storeUrl'].some(hasEffectiveKey)) {
      fields.product = true;
    }
    if (VARIANT_OPTION_KEYS.some(hasEffectiveKey)) {
      fields.options = true;
    }

    return {
      fields,
      metafieldKeys: this.effectiveMetafieldKeys,

      created_at_min: dateRangeMin(createdAtRange),
      created_at_max: dateRangeMax(createdAtRange),
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      product_ids: productIds,
      product_publication_status: publishedStatus,
      product_status: status,
      product_types: productTypes,
      vendors,
      skus,
      // inventory_quantity_min,
      // inventory_quantity_max,
      // optionsFilter,
    } as ListVariantsArgs;
  }

  /**
   * {@link VariantModel} has some additional required properties :
   * - weight: when requesting an update on weight_unit
   * - weight_unit: when requesting an update on weight
   * - options: all options are required as soon as we want to update one
   */
  protected getAdditionalRequiredKeysForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const { updatedFields } = update;
    let additionalKeys = [];
    if (updatedFields.includes('weight')) {
      additionalKeys.push('weight_unit');
    }
    if (updatedFields.includes('weight_unit')) {
      additionalKeys.push('weight');
    }
    if (VARIANT_OPTION_KEYS.some((key) => updatedFields.includes(key))) {
      additionalKeys = additionalKeys.concat(VARIANT_OPTION_KEYS);
    }
    return [...super.getAdditionalRequiredKeysForUpdate(update), ...additionalKeys];
  }
}
