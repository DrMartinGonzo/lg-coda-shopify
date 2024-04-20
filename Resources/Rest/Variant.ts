// #region Imports
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { Sync_ProductVariants } from '../../coda/setup/productVariants-setup';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, filterObjectKeys } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import { CodaSyncParams, FromRow } from '../Abstract/Rest/AbstractSyncedRestResource';
import { AbstractSyncedRestResourceWithGraphQLMetafields } from '../Abstract/Rest/AbstractSyncedRestResourceWithGraphQLMetafields';
import { RestApiDataWithMetafields } from '../Abstract/Rest/AbstractSyncedRestResourceWithMetafields';
import { BaseContext, GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/Resource.types';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';
import { Product } from './Product';
import { Shop } from './Shop';

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

export class Variant extends AbstractSyncedRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields & {
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
    old_inventory_quantity: number | null;
    option: { [key: string]: unknown } | null;
    position: number | null;
    presentment_prices: { [key: string]: unknown }[] | null;
    price: string | null;
    product_id: number | null;
    requires_shipping: boolean | null;
    sku: string | null;
    tax_code: string | null;
    taxable: boolean | null;
    title: string | null;
    updated_at: string | null;
    weight: number | null;
    weight_unit: string | null;

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
  protected static readonly supportsDefinitions = true;
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

    const shopCurrencyCode = await Shop.activeCurrency({ context });
    // Main props
    augmentedSchema.properties.price['currencyCode'] = shopCurrencyCode;
    augmentedSchema.properties.compare_at_price['currencyCode'] = shopCurrencyCode;

    // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
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
   * To sync all variants, use {@link Product.syncVariants}
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
  protected formatToApi({ row, metafields = [] }: FromRow<ProductVariantRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id', "barcode", "compare_at_price", "option1", "option2", "option3",
      "price", "position", "sku", "taxable", "weight", "weight_unit",
    ];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (row.product) {
      apiData.product_id = row.product.id;
    }

    if (metafields.length) {
      apiData.metafields = metafields;
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): ProductVariantRow {
    const { apiData } = this;

    let obj: ProductVariantRow = {
      ...filterObjectKeys(apiData, ['metafields']),
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
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
