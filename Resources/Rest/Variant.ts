// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_ProductVariants } from '../../coda/setup/productVariants-setup';
import { Sync_Products } from '../../coda/setup/products-setup';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import {
  ProductVariantSyncTableSchema,
  productVariantFieldDependencies,
} from '../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { arrayUnique, deepCopy, excludeObjectKeys } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { SupportedMetafieldOwnerResource } from './Metafield';
import { Product } from './Product';

// #endregion

interface FindArgs extends BaseContext {
  id: number | string;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
  product_id?: number | string | null;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  product_id?: number | string | null;
  limit?: unknown;
  presentment_currencies?: unknown;
  since_id?: unknown;
  fields?: unknown;
}

export interface VariantData {
  barcode: string | null;
  compare_at_price: string | null;
  created_at: string | null;
  fulfillment_service: string | null;
  grams: number | null;
  id: number | null;
  image_id: number | null;
  inventory_item_id: number | null;
  inventory_management: string | null;
  inventory_policy: string | null;
  inventory_quantity: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  position: number | null;
  presentment_prices: { [key: string]: unknown }[] | null;
  price: string | null;
  product_id: number | null;
  sku: string | null;
  tax_code: string | null;
  taxable: boolean | null;
  title: string | null;
  updated_at: string | null;
  weight: number | null;
  weight_unit: string | null;
}

export class Variant extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields &
    VariantData & {
      // custom properties
      product_handle: Product['apiData']['handle'];
      product_images: Product['apiData']['images'];
      product_status: Product['apiData']['status'];
      product_title: Product['apiData']['title'];
    };

  public static readonly displayName: Identity = PACK_IDENTITIES.ProductVariant;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.ProductVariant;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Productvariant;

  protected static readonly graphQlName = GraphQlResourceNames.ProductVariant;
  protected static readonly paths: ResourcePath[] = [
    {
      http_method: 'delete',
      operation: 'delete',
      ids: ['product_id', 'id'],
      path: 'products/<product_id>/variants/<id>.json',
    },

    // we could call this "get variants" directly but then we wouldn't have the product title, status etc…
    // { http_method: 'get', operation: 'get', ids: [], path: 'variants.json' },

    { http_method: 'get', operation: 'get', ids: ['product_id'], path: 'products/<product_id>/variants.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'variants/<id>.json' },
    { http_method: 'post', operation: 'post', ids: ['product_id'], path: 'products/<product_id>/variants.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'variants/<id>.json' },
  ];
  protected static readOnlyAttributes: string[] = ['inventory_quantity'];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.ProductVariant,
      plural: RestResourcesPlural.ProductVariant,
    },
  ];

  protected static translateCodaSyncParamsFromVariantToProduct(
    codaSyncParams: CodaSyncParams<typeof Sync_ProductVariants>
  ): CodaSyncParams<typeof Sync_Products> {
    const [
      product_type, // productType
      syncMetafields, // syncMetafields
      created_at, // createdAtRange
      updated_at, // updatedAtRange
      published_at, // publishedAtRange
      status, // statusArray
      published_status, // publishedStatus
      vendor, // vendor
      handles, // handleArray
      ids, // idArray
    ] = codaSyncParams;

    return [
      product_type, // productType
      syncMetafields, // syncMetafields
      created_at, // createdAtRange
      updated_at, // updatedAtRange
      published_at, // publishedAtRange
      status, // statusArray
      published_status, // publishedStatus
      vendor, // vendor
      handles, // handleArray
      ids, // idArray
      undefined, // collectionId
    ];
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_ProductVariants,
    SyncTableManagerRestWithMetafieldsType<Variant>
  >): SyncRestFunction<Variant> {
    const codaProductSyncParams = this.translateCodaSyncParamsFromVariantToProduct(codaSyncParams);
    const requiredProductFields = ['id', 'variants'];
    const allowedProductFields = ['handle', 'id', 'images', 'status', 'title', 'variants'];

    return async ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: Product.getFirstPageParams({
          codaSyncParams: codaProductSyncParams,
          fields: arrayUnique(
            syncTableManager
              .getSyncedStandardFields(productVariantFieldDependencies)
              .concat(requiredProductFields)
              .filter((fromKey) => allowedProductFields.includes(fromKey))
          ),
        }),
      });
      const productsResponse = await Product.all(params);

      return {
        ...productsResponse,
        data: productsResponse.data.flatMap((product) =>
          product.apiData.variants.map(
            (variant) =>
              new Variant({
                context,
                fromData: {
                  ...variant,
                  product_handle: product.apiData.handle,
                  product_images: product.apiData.images,
                  product_status: product.apiData.status,
                  product_title: product.apiData.title,
                },
              })
          )
        ),
      };
    };
  }

  public static getStaticSchema() {
    return ProductVariantSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [, syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_ProductVariants>;
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

  public static async find({ id, fields = null, context, options }: FindArgs): Promise<Variant | null> {
    const result = await this.baseFind<Variant>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Variant>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  /**
   * This will not sync 'all' variants, but just all variants of a specific product
   * To sync all variants, use the variants sync table
   */
  public static async all({
    context,
    product_id = null,
    limit = null,
    presentment_currencies = null,
    since_id = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<Variant>> {
    const response = await this.baseFind<Variant>({
      context,
      urlIds: { product_id: product_id },
      params: {
        limit,
        presentment_currencies,
        since_id,
        fields,
        ...otherArgs,
      },
      options,
    });

    return response;
  }
  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async refreshDataWithtParentProduct() {
    const product = await Product.find({
      id: this.apiData.product_id,
      fields: ['images', 'handle', 'status', 'title'].join(','),
      context: this.context,
    });
    this.setData({
      ...this.apiData,
      product_images: product.apiData.images,
      product_handle: product.apiData.handle,
      product_status: product.apiData.status,
      product_title: product.apiData.title,
    });
  }

  protected formatToApi({ row, metafields }: FromRow<ProductVariantRow>) {
    let apiData: Partial<RestApiDataWithMetafields & VariantData> = {
      barcode: row.barcode,
      compare_at_price: row.compare_at_price ? row.compare_at_price.toString() : undefined,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      grams: row.grams,
      id: row.id,
      inventory_item_id: row.inventory_item?.id,
      inventory_management: row.inventory_management,
      inventory_policy: row.inventory_policy,
      inventory_quantity: row.inventory_quantity,
      option1: row.option1,
      option2: row.option2,
      option3: row.option3,
      position: row.position,
      price: row.price ? row.price.toString() : undefined,
      product_id: row.product?.id,
      sku: row.sku,
      tax_code: row.tax_code,
      taxable: row.taxable,
      title: row.title,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
      weight_unit: row.weight_unit,
      weight: row.weight,

      metafields,
    };

    return apiData;
  }

  public formatToRow(): ProductVariantRow {
    const { apiData } = this;

    let obj: ProductVariantRow = {
      ...excludeObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/products/${apiData.product_id}/variants/${apiData.id}`,
      product: formatProductReference(apiData.product_id),
      price: apiData.price ? parseFloat(apiData.price) : undefined,
      compare_at_price: apiData.compare_at_price ? parseFloat(apiData.compare_at_price) : undefined,
    };

    // throw new Error('d');
    if (apiData.product_title) {
      obj.displayTitle = `${apiData.product_title} - ${apiData.title}`;
    }
    if (apiData.product_status === 'active' && apiData.product_handle) {
      obj.storeUrl = `${this.context.endpoint}/products/${apiData.product_handle}?variant=${apiData.id}`;
    }
    if (apiData.product_images && apiData.product_images.length > 0 && apiData.image_id) {
      obj.image = apiData.product_images.find((image) => image.id === apiData.image_id)?.src;
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
