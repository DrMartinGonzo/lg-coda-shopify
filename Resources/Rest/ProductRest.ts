// #region Imports
import striptags from 'striptags';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import {
  CodaSyncParams,
  MakeSyncFunctionArgs,
  SyncRestFunction,
} from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Products } from '../../coda/setup/products-setup';
import { DEFAULT_PRODUCTVARIANT_OPTION_VALUE } from '../../config';
import { Identity, OPTIONS_PRODUCT_STATUS_REST, OPTIONS_PUBLISHED_STATUS, PACK_IDENTITIES } from '../../constants';
import { ProductRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ProductSyncTableSchemaRest, productFieldDependencies } from '../../schemas/syncTable/ProductSchemaRest';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, excludeObjectKeys, isDefinedEmpty, splitAndTrimValues } from '../../utils/helpers';
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
import { VariantData } from './Variant';

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
  ids?: unknown;
  limit?: unknown;
  since_id?: unknown;
  title?: unknown;
  vendor?: unknown;
  handle?: unknown;
  product_type?: unknown;
  status?: unknown;
  collection_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  published_status?: unknown;
  fields?: unknown;
  presentment_currencies?: unknown;
}

interface ImageData {
  alt: string | null;
  admin_graphql_api_id: string | null;
  created_at: string | null;
  height: number | null;
  id: number | null;
  position: number | null;
  product_id: number | null;
  src: string | null;
  updated_at: string | null;
  variant_ids: number[] | null;
  width: number | null;
}

export class ProductRest extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields & {
    admin_graphql_api_id: string | null;
    title: string | null;
    body_html: string | null;
    created_at: string | null;
    handle: string | null;
    id: number | null;
    images: ImageData[] | null;
    // image: Array<{
    //   src?: string;
    //   alt?: string;
    // }> | null;
    options: { [key: string]: unknown } | { [key: string]: unknown }[] | null;
    product_type: string | null;
    published_at: string | null;
    published_scope: string | null;
    status: string | null;
    tags: string | null;
    template_suffix: string | null;
    updated_at: string | null;
    variants: VariantData[] | null;
    vendor: string | null;
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.Product;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Product;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Product;

  protected static readonly graphQlName = GraphQlResourceNames.Product;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'products/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'products.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'products/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'products.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'products/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Product,
      plural: RestResourcesPlural.Product,
    },
  ];

  public static getStaticSchema() {
    return ProductSyncTableSchemaRest;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [, syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Products>;
    let augmentedSchema = deepCopy(ProductSyncTableSchemaRest);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(
        ProductSyncTableSchemaRest,
        this.metafieldGraphQlOwnerType,
        context
      );
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  /**
   * Separated function to get the first page sync params
   * in order to be able to use it from Variant class
   */
  public static getFirstPageParams({
    codaSyncParams,
    fields,
  }: {
    codaSyncParams: CodaSyncParams<typeof Sync_Products>;
    fields: Array<string>;
  }) {
    const [
      syncMetafields,
      product_type,
      created_at,
      updated_at,
      // published_at,
      status,
      published_status,
      vendor,
      handles,
      ids,
      collectionId,
    ] = codaSyncParams;

    return {
      fields: fields.join(','),
      collection_id: collectionId,
      handle: handles && handles.length ? handles.join(',') : undefined,
      ids: ids && ids.length ? ids.join(',') : undefined,
      product_type,
      published_status,
      status: status && status.length ? status.join(',') : undefined,
      vendor,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      // published_at_min: published_at ? published_at[0] : undefined,
      // published_at_max: published_at ? published_at[1] : undefined,
    };
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_Products,
    SyncTableManagerRestWithMetafieldsType<ProductRest>
  >): SyncRestFunction<ProductRest> {
    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: this.getFirstPageParams({
          codaSyncParams,
          fields: syncTableManager.getSyncedStandardFields(productFieldDependencies),
        }),
      });

      return this.all(params);
    };
  }

  public static async find({ id, fields = null, context, options }: FindArgs): Promise<ProductRest | null> {
    const result = await this.baseFind<ProductRest>({
      urlIds: { id },
      params: { fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  /*
  public static async findVariant({
    id,
    variant_id,
    context,
    options,
  }: FindArgs & { variant_id: number }): Promise<Variant | null> {
    const requiredProductFields = ['handle', 'images', 'status', 'title', 'variants'];
    const productsResult = await this.baseFind<Product>({
      urlIds: { id },
      params: { fields: requiredProductFields.join(',') },
      context,
      options,
    });

    const product = productsResult.data ? productsResult.data[0] : null;
    if (product) {
      const variantApiData = product.apiData.variants.find((variant) => variant.id === variant_id);
      return variantApiData
        ? new Variant({
            context,
            fromData: {
              ...variantApiData,
              product_handle: product.apiData.handle,
              product_images: product.apiData.images,
              product_status: product.apiData.status,
              product_title: product.apiData.title,
            },
          })
        : null;
    }
  }
  */

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<ProductRest>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    ids = null,
    limit = null,
    since_id = null,
    title = null,
    vendor = null,
    handle = null,
    product_type = null,
    status = null,
    collection_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    published_at_min = null,
    published_at_max = null,
    published_status = null,
    fields = null,
    presentment_currencies = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<ProductRest>> {
    const response = await this.baseFind<ProductRest>({
      context,
      urlIds: {},
      params: {
        ids,
        limit,
        since_id,
        title,
        vendor,
        handle,
        product_type,
        status,
        collection_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        published_at_min,
        published_at_max,
        published_status,
        fields,
        presentment_currencies,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  protected static validateParams(params: AllArgs) {
    if (params.status) {
      const validStatuses = OPTIONS_PRODUCT_STATUS_REST.map((status) => status.value);
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('product status: ' + statuses.join(', '));
      }
    }
    if (params.published_status) {
      const validStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
      const statuses = Array.isArray(params.published_status) ? params.published_status : [params.published_status];
      if (!statuses.every((s) => validStatuses.includes(s))) {
        throw new InvalidValueVisibleError('published_status: ' + statuses.join(', '));
      }
    }
    if (isDefinedEmpty(params.title)) {
      throw new InvalidValueVisibleError("Product title can't be blank");
    }

    return super.validateParams(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi({ row, metafields }: FromRow<ProductRow>) {
    let apiData: Partial<typeof this.apiData> = {
      id: row.id,
      body_html: row.body_html,
      handle: row.handle,
      product_type: row.product_type,
      template_suffix: row.template_suffix,
      title: row.title,
      vendor: row.vendor,
      status: row.status,
      images: row.images !== undefined ? row.images.map((url) => ({ src: url } as ImageData)) : [],
      admin_graphql_api_id: row.admin_graphql_api_id,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      published_at: row.published_at ? row.published_at.toString() : undefined,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
      published_scope: row.published_scope,
      tags: row.tags,

      metafields,
    };

    if (row.options !== undefined) {
      apiData.options = splitAndTrimValues(row.options).map((option) => ({
        name: option,
        values: [DEFAULT_PRODUCTVARIANT_OPTION_VALUE],
      }));

      // We need to add a default variant to the product if some options are defined
      if (apiData.options.length) {
        (apiData.variants as Partial<VariantData>[]) = [
          {
            option1: DEFAULT_PRODUCTVARIANT_OPTION_VALUE,
            option2: DEFAULT_PRODUCTVARIANT_OPTION_VALUE,
            option3: DEFAULT_PRODUCTVARIANT_OPTION_VALUE,
          },
        ];
      }
    }

    return apiData;
  }

  public formatToRow(): ProductRow {
    const { apiData } = this;

    let obj: ProductRow = {
      ...excludeObjectKeys(apiData, ['metafields', 'images', 'options']),
      admin_url: `${this.context.endpoint}/admin/products/${apiData.id}`,
      body: striptags(apiData.body_html),
      published: !!apiData.published_at,
      storeUrl: apiData.status === 'active' ? `${this.context.endpoint}/products/${apiData.handle}` : '',
    };

    if (apiData.options && Array.isArray(apiData.options)) {
      obj.options = apiData.options.map((option) => option.name).join(',');
    }
    if (apiData.images && Array.isArray(apiData.images)) {
      obj.featuredImage = apiData.images.find((image) => image.position === 1)?.src;
      obj.images = apiData.images.map((image) => image.src);
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
