// #region Imports
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { InvalidValueVisibleError, RequiredSyncTableMissingVisibleError } from '../../Errors/Errors';
import { SyncTableManagerGraphQlWithMetafieldsType } from '../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import {
  CodaSyncParams,
  MakeSyncFunctionArgs,
  SyncGraphQlFunction,
} from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_ProductVariants } from '../../coda/setup/productVariants-setup';
import { Sync_Products } from '../../coda/setup/products-setup';
import {
  CACHE_DISABLED,
  GRAPHQL_NODES_LIMIT,
  Identity,
  OPTIONS_PRODUCT_STATUS_GRAPHQL,
  OPTIONS_PUBLISHED_STATUS,
  PACK_IDENTITIES,
} from '../../constants';
import {
  ProductVariantFilters,
  buildProductVariantsSearchQuery,
  createProductVariantMutation,
  deleteProductVariantMutation,
  getProductVariantsQuery,
  getSingleProductVariantQuery,
  productVariantFieldsFragment,
  updateProductVariantMutation,
} from '../../graphql/productVariants-graphql';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { formatProductReference } from '../../schemas/syncTable/ProductSchema';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType, ProductVariantInput } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import {
  deepCopy,
  excludeUndefinedObjectKeys,
  getUnitMap,
  isDefinedEmpty,
  isNullish,
  isNullishOrEmpty,
  unitToShortName,
  weightUnitsMap,
} from '../../utils/helpers';
import { AbstractResource, GetSchemaArgs } from '../Abstract/AbstractResource';
import {
  FindAllGraphQlResponse,
  GraphQlApiDataWithMetafields,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractGraphQlResourceWithMetafields } from '../Abstract/GraphQl/AbstractGraphQlResourceWithMetafields';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { SupportedMetafieldOwnerResource } from '../../models/rest/MetafieldModel';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesSingular } from '../types/SupportedResource';

// #endregion

// #region Types
interface FieldsArgs {
  image?: boolean;
  inventoryItem?: boolean;
  metafields?: boolean;
  options?: boolean;
  product?: boolean;
  weight?: boolean;
}
interface FindArgs extends BaseContext {
  id: number | string;
  fields?: FieldsArgs;
}
interface DeleteArgs extends BaseContext {
  id: string;
}
interface AllArgs extends BaseContext, ProductVariantFilters {
  [key: string]: unknown;
  limit?: number;
  fields?: FieldsArgs;
  metafieldKeys?: Array<string>;
}

// #endregion

// Related keys
const VARIANT_OPTION_KEYS = ['option1', 'option2', 'option3'];
const VARIANT_WEIGHT_KEYS = ['grams', 'weight', 'weight_unit'];

export class VariantGraphQl extends AbstractGraphQlResourceWithMetafields {
  public apiData: ResultOf<typeof productVariantFieldsFragment> & GraphQlApiDataWithMetafields;

  public static readonly displayName: Identity = PACK_IDENTITIES.ProductVariant;
  protected static readonly graphQlName = GraphQlResourceNames.ProductVariant;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.ProductVariant;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Productvariant;

  protected static readonly paths: Array<GraphQlResourcePath> = [
    'node',
    'productVariant',
    'productVariants',
    'productVariantCreate.productVariant',
    'productVariantUpdate.productVariant',
  ];

  public static getStaticSchema() {
    return ProductVariantSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_ProductVariants>;
    let augmentedSchema = deepCopy(ProductVariantSyncTableSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(
        ProductVariantSyncTableSchema,
        this.metafieldGraphQlOwnerType,
        context
      );
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
    typeof Sync_Products,
    SyncTableManagerGraphQlWithMetafieldsType<VariantGraphQl>
  >): SyncGraphQlFunction<VariantGraphQl> {
    const [
      //
      syncMetafields,
      product_types,
      createdAt,
      updatedAt,
      status,
      publishedStatus,
      vendors,
      skus,
      product_ids,
      // optionsFilter,
    ] = codaSyncParams;

    const { effectiveStandardFromKeys, shouldSyncMetafields } = syncTableManager;
    const hasEffectiveKey = (key: string) => effectiveStandardFromKeys.includes(key);

    const fields: AllArgs['fields'] = { metafields: shouldSyncMetafields };
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

    this.validateParams({
      product_publication_status: publishedStatus,
      product_status: status,
    });

    return ({ cursor = null, limit }) =>
      this.all({
        context,
        fields,
        metafieldKeys: syncTableManager.effectiveMetafieldKeys,
        cursor,
        limit,

        created_at_min: createdAt ? createdAt[0] : undefined,
        created_at_max: createdAt ? createdAt[1] : undefined,
        updated_at_min: updatedAt ? updatedAt[0] : undefined,
        updated_at_max: updatedAt ? updatedAt[1] : undefined,
        product_ids,
        product_publication_status: publishedStatus,
        product_status: status,
        product_types,
        vendors,
        skus,
        // inventory_quantity_min,
        // inventory_quantity_max,
        // optionsFilter,

        options: { cacheTtlSecs: CACHE_DISABLED },
      });
  }

  public static async find({ id, fields = {}, context, options }: FindArgs): Promise<VariantGraphQl | null> {
    const result = await this.baseFind<VariantGraphQl, typeof getSingleProductVariantQuery>({
      documentNode: getSingleProductVariantQuery,
      variables: {
        id,
        // TODO: retrieve metafields ?
        includeMetafields: fields?.metafields ?? false,
        countMetafields: 0,
        metafieldKeys: [],
        includeInventoryItem: fields?.inventoryItem ?? true,
        includeProduct: fields?.product ?? true,
        includeImage: fields?.image ?? true,
        includeOptions: fields?.options ?? true,
        includeWeight: fields?.weight ?? true,
      } as VariablesOf<typeof getSingleProductVariantQuery>,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context, options }: DeleteArgs) {
    return this.baseDelete<typeof deleteProductVariantMutation>({
      documentNode: deleteProductVariantMutation,
      variables: {
        id,
      },
      context,
      options,
    });
  }

  public static async all({
    context,
    limit = null,
    cursor = null,
    fields = {},
    metafieldKeys = [],

    // filters
    created_at_max = null,
    created_at_min = null,
    inventory_quantity_max = null,
    inventory_quantity_min = null,
    product_ids = null,
    product_publication_status = null,
    product_status = null,
    product_types = null,
    skus = null,
    updated_at_max = null,
    updated_at_min = null,
    vendors = null,
    // optionsFilter = null,

    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<VariantGraphQl>> {
    const queryFilters: ProductVariantFilters = {
      created_at_min,
      created_at_max,
      updated_at_min,
      updated_at_max,
      inventory_quantity_max,
      inventory_quantity_min,
      product_ids,
      product_publication_status,
      product_status,
      product_types,
      skus,
      vendors,
      // optionsFilter,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (isNullish(queryFilters[key])) delete queryFilters[key];
    });
    const searchQuery = buildProductVariantsSearchQuery(queryFilters);

    const response = await this.baseFind<VariantGraphQl, typeof getProductVariantsQuery>({
      documentNode: getProductVariantsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,
        includeImage: fields?.image ?? false,
        includeInventoryItem: fields?.inventoryItem ?? false,
        includeMetafields: fields?.metafields ?? false,
        includeOptions: fields?.options ?? false,
        includeProduct: fields?.product ?? false,
        includeWeight: fields?.weight ?? false,
        countMetafields: metafieldKeys.length,
        metafieldKeys,

        ...otherArgs,
      } as VariablesOf<typeof getProductVariantsQuery>,
      context,
      options,
    });

    return response;
  }

  /**
   * {@link VariantGraphQl} has some additional required properties :
   * - weight: when requesting an update on weight_unit
   * - weight_unit: when requesting an update on weight
   * - options: all options are required as soon as we want to update one
   */
  // public static getRequiredPropertiesForUpdate(
  //   schema: coda.ArraySchema<coda.ObjectSchema<string, string>>,
  //   updatedFields: string[] = []
  // ) {
  //   let extraRequiredFields = [];
  //   if (updatedFields.includes('weight')) {
  //     extraRequiredFields.push('weight_unit');
  //   }
  //   if (updatedFields.includes('weight_unit')) {
  //     extraRequiredFields.push('weight');
  //   }
  //   if (VARIANT_OPTION_KEYS.some((key) => updatedFields.includes(key))) {
  //     extraRequiredFields = extraRequiredFields.concat(VARIANT_OPTION_KEYS);
  //   }

  //   return super.getRequiredPropertiesForUpdate(schema, updatedFields).concat(extraRequiredFields);
  // }

  protected static validateUpdateJob(prevRow: ProductVariantRow, newRow: ProductVariantRow): boolean {
    if (isDefinedEmpty(newRow.title)) {
      throw new InvalidValueVisibleError("Product title can't be blank");
    }

    if (!isNullishOrEmpty(newRow.weight) && isNullishOrEmpty(newRow.weight_unit)) {
      throw new RequiredSyncTableMissingVisibleError('weight_unit');
    }
    if (isNullishOrEmpty(newRow.weight) && !isNullishOrEmpty(newRow.weight_unit)) {
      throw new RequiredSyncTableMissingVisibleError('weight');
    }

    const hasOptionsKeySet = VARIANT_OPTION_KEYS.some((key) => newRow.hasOwnProperty(key));
    const hasAllOptionKeysSet = VARIANT_OPTION_KEYS.every((key) => newRow.hasOwnProperty(key));
    if (hasOptionsKeySet && !hasAllOptionKeysSet) {
      throw new RequiredSyncTableMissingVisibleError(
        VARIANT_OPTION_KEYS.filter((key) => !newRow.hasOwnProperty(key)).join(', ')
      );
    }

    return super.validateUpdateJob(prevRow, newRow);
  }

  protected static validateParams(params: Partial<AllArgs>) {
    if (params.status) {
      const validStatuses = OPTIONS_PRODUCT_STATUS_GRAPHQL.map((status) => status.value);
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('product status: ' + statuses.join(', '));
      }
    }
    if (params.product_publication_status) {
      const validStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
      const statuses = Array.isArray(params.product_publication_status)
        ? params.product_publication_status
        : [params.product_publication_status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('published_status: ' + statuses.join(', '));
      }
    }

    return super.validateParams(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected async getFullFreshData() {
    const staticResource = this.resource<typeof VariantGraphQl>();
    const res = await staticResource.find({
      context: this.context,
      id: this.graphQlGid,
      fields: {
        image: true,
        inventoryItem: true,
        metafields: true,
        options: true,
        product: true,
        weight: true,
      },
      options: {
        cacheTtlSecs: CACHE_DISABLED,
      },
    });
    return res?.apiData;
  }

  public async save({ update = false }: SaveArgs): Promise<void> {
    const { primaryKey } = VariantGraphQl;
    const isUpdate = this.apiData[primaryKey];

    const documentNode = isUpdate ? updateProductVariantMutation : createProductVariantMutation;
    const input = isUpdate ? this.formatUpdateInput() : this.formatCreateInput();

    // TODO: on check pas input car il pourrait y avoir des metafields a update, il faudrait gérer ça mieux
    // if (input) {
    const variables = {
      input: input ?? {},
      includeImage: true,
      includeInventoryItem: true,
      includeMetafields: true,
      includeOptions: true,
      includeProduct: true,
      includeWeight: true,
      countMetafields: 0,
      metafieldKeys: [],
    } as VariablesOf<typeof updateProductVariantMutation> | VariablesOf<typeof createProductVariantMutation>;

    await this._baseSave<typeof documentNode>({ documentNode, variables, update });
    // }
  }

  // TODO: clean this format methods
  formatBaseInput(): ProductVariantInput | undefined {
    let input: ProductVariantInput = {
      barcode: this.apiData.barcode,
      compareAtPrice: this.apiData.compareAtPrice,
      inventoryPolicy: this.apiData.inventoryPolicy as any,
      position: this.apiData.position,
      price: this.apiData.price,
      sku: this.apiData.sku,
      taxable: this.apiData.taxable,
      taxCode: this.apiData.taxCode,
    };
    if (this.apiData.selectedOptions && this.apiData.selectedOptions.length) {
      input.options = this.apiData.selectedOptions.map((option) => option.value);
    }
    if (this.apiData.inventoryItem?.measurement) {
      input.inventoryItem = {
        measurement: this.apiData.inventoryItem?.measurement as ProductVariantInput['inventoryItem']['measurement'],
      };
    }

    const filteredInput = excludeUndefinedObjectKeys(input);

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  formatCreateInput(): ProductVariantInput | undefined {
    const baseInput = this.formatBaseInput();
    const input = {
      ...(baseInput ?? {}),
      productOptions: this.apiData.options,
      productId: this.apiData.product?.id,
      metafields: this.apiData.restMetafieldInstances
        ? this.apiData.restMetafieldInstances.map((metafield) => {
            const { key, namespace, type, value } = metafield.apiData;
            return {
              key,
              namespace,
              type,
              value,
            };
          })
        : undefined,
    };
    const filteredInput = excludeUndefinedObjectKeys(input);
    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  formatUpdateInput(): ProductVariantInput | undefined {
    const baseInput = this.formatBaseInput();
    const input = {
      ...(baseInput ?? {}),
      id: this.graphQlGid,
    };
    const filteredInput = excludeUndefinedObjectKeys(input);
    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  protected formatToApi({ row, metafields }: FromRow<ProductVariantRow>) {
    let apiData: Partial<typeof this.apiData> = {
      id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, row.id),
      barcode: row.barcode,
      compareAtPrice: row.compare_at_price,
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      displayName: row.displayTitle,
      inventoryPolicy: row.inventory_policy as any,
      inventoryQuantity: row.inventory_quantity,
      position: row.position,
      price: row.price,
      product: row.product?.id
        ? {
            onlineStoreUrl: row.storeUrl ? row.storeUrl.split('?')[0] : undefined,
            id: idToGraphQlGid(GraphQlResourceNames.Product, row.product?.id),
          }
        : undefined,
      sku: row.sku,
      taxCode: row.tax_code,
      taxable: row.taxable,
      title: row.title,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      image: row.image
        ? {
            url: row.image,
          }
        : undefined,
      restMetafieldInstances: metafields,
    };

    /**
     * For options, the previous value must always be present.
     * We can only update options for a variant with two or three options if two
     * or three option values are present. So we set the option values until the
     * last defined value and if an update is needed, the
     * {@link AbstractResource.addMissingData} method will fill in the rest
     */
    const options = [row.option1, row.option2, row.option3];
    const lastOptionValueIndex = options.map((option) => !!option).lastIndexOf(true) as number;
    if (lastOptionValueIndex !== -1) {
      for (let i = 0; i < options.length; i++) {
        apiData.selectedOptions = apiData.selectedOptions || [];
        apiData.selectedOptions.push({ value: options[i] });
        if (i === lastOptionValueIndex) break;
      }
    }

    if (row.inventory_item_id || row.weight || row.weight_unit) {
      (apiData.inventoryItem as Partial<typeof apiData.inventoryItem>) = {};
      if (row.inventory_item_id) {
        apiData.inventoryItem.id = idToGraphQlGid(GraphQlResourceNames.InventoryItem, row.inventory_item_id);
      }
      if (row.weight || row.weight_unit) {
        (apiData.inventoryItem.measurement as Partial<typeof apiData.inventoryItem.measurement>) = {};
        (apiData.inventoryItem.measurement.weight as Partial<typeof apiData.inventoryItem.measurement.weight>) = {
          value: row.weight,
        };
        /** Only add weight_unit if it's not undefined.
         * If needed by an update, {@link AbstractResource.addMissingData} will fill in the rest */
        if (row.weight_unit) {
          apiData.inventoryItem.measurement.weight.unit = Object.entries(getUnitMap('weight')).find(([key, value]) => {
            return value === row.weight_unit;
          })[0] as any;
        }
      }
    }

    return apiData;
  }

  public formatToRow(): ProductVariantRow {
    const { apiData: data } = this;

    const productId = graphQlGidToId(data.product?.id);
    const inventoryItemId = graphQlGidToId(data.inventoryItem?.id);

    let obj: ProductVariantRow = {
      admin_graphql_api_id: this.graphQlGid,
      barcode: data.barcode,
      compare_at_price: data.compareAtPrice ? parseFloat(data.compareAtPrice) : undefined,
      created_at: data.createdAt,
      displayTitle: data.displayName,
      id: this.restId,
      image: data.image?.url,
      inventory_policy: data.inventoryPolicy,
      inventory_quantity: data.inventoryQuantity,
      position: data.position,
      price: data.price ? parseFloat(data.price) : undefined,
      sku: data.sku,
      tax_code: data.taxCode,
      taxable: data.taxable,
      title: data.title,
      updated_at: data.updatedAt,
    };

    if (data.selectedOptions) {
      obj.option1 = data.selectedOptions[0]?.value ?? null;
      obj.option2 = data.selectedOptions[1]?.value ?? null;
      obj.option3 = data.selectedOptions[2]?.value ?? null;
    }

    if (inventoryItemId) {
      obj.inventory_item_id = inventoryItemId;
    }
    if (data.inventoryItem?.measurement?.weight) {
      obj.weight = data.inventoryItem.measurement.weight?.value;
      obj.weight_unit = unitToShortName(data.inventoryItem.measurement.weight?.unit);
      switch (obj.weight_unit) {
        case weightUnitsMap.GRAMS:
          obj.grams = obj.weight;
          break;
        case weightUnitsMap.KILOGRAMS:
          obj.grams = obj.weight * 1000;
          break;
        case weightUnitsMap.OUNCES:
          obj.grams = obj.weight * 28.34952;
          break;
        case weightUnitsMap.POUNDS:
          obj.grams = obj.weight * 453.59237;
          break;
      }
    }

    if (productId) {
      obj.admin_url = `${this.context.endpoint}/admin/products/${productId}/variants/${this.restId}`;
      obj.product_id = productId;
      obj.product = formatProductReference(productId);
    }

    if (data.product?.onlineStoreUrl) {
      obj.storeUrl = `${data.product.onlineStoreUrl}?variant=${this.restId}`;
    }

    if (data.restMetafieldInstances) {
      data.restMetafieldInstances.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
