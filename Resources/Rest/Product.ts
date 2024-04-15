// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { SearchParams } from '../../Clients/RestClient';
import { SyncTableSyncResult } from '../../SyncTableManager/types/SyncTable.types';
import { SyncTableManagerRestWithGraphQlMetafields } from '../../SyncTableManager/Rest/SyncTableManagerRestWithGraphQlMetafields';
import { Sync_ProductVariants } from '../../coda/setup/productVariants-setup';
import { Sync_Products } from '../../coda/setup/products-setup';
import {
  DEFAULT_PRODUCT_OPTION_NAME,
  OPTIONS_PRODUCT_STATUS_REST,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_LIMIT,
} from '../../constants';
import { ProductRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ProductSyncTableSchemaRest, productFieldDependencies } from '../../schemas/syncTable/ProductSchemaRest';
import { productVariantFieldDependencies } from '../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { arrayUnique, deepCopy, filterObjectKeys } from '../../utils/helpers';
import { BaseContext, FindAllResponse, ResourceDisplayName } from '../Abstract/Rest/AbstractRestResource';
import {
  CodaSyncParams,
  FromRow,
  GetSchemaArgs,
  MakeSyncFunctionArgs,
  SyncFunction,
} from '../Abstract/Rest/AbstractSyncedRestResource';
import { RestApiDataWithMetafields } from '../Abstract/Rest/AbstractSyncedRestResourceWithRestMetafields';
import { AbstractSyncedRestResourceWithGraphQLMetafields } from '../Abstract/Rest/AbstractSyncedRestResourceWithGraphQLMetafields';
import { GraphQlResourceName } from '../types/GraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../types/RestResource.types';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';
import { Variant } from './Variant';

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

export class Product extends AbstractSyncedRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields & {
    admin_graphql_api_id: string | null;
    title: string | null;
    body_html: string | null;
    created_at: string | null;
    handle: string | null;
    id: number | null;
    // TODO: fix this
    // images: Image[] | null | { [key: string]: any };
    images: any[] | null | { [key: string]: any };
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
    // TODO: fix this
    // variants: Variant[] | null | { [key: string]: any };
    variants: any[] | null | { [key: string]: any };
    vendor: string | null;
  };

  static readonly displayName = 'Product' as ResourceDisplayName;
  protected static graphQlName = GraphQlResourceName.Product;
  static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = 'product';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Product;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'products/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'products.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'products/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'products.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'products/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Product,
      plural: RestResourcePlural.Product,
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
    // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  /**
   * Shared function to generate the sync function for Products or Variants
   */
  protected static generateSharedSyncFunction<
    ResourceT extends Product | Variant,
    CodaSyncT extends typeof Sync_Products | typeof Sync_ProductVariants
  >({
    context,
    codaSyncParams,
    fields,
  }: MakeSyncFunctionArgs<ResourceT, CodaSyncT, SyncTableManagerRestWithGraphQlMetafields<ResourceT>> & {
    fields: Array<string>;
  }): SyncFunction {
    const [
      product_type,
      syncMetafields,
      created_at,
      updated_at,
      published_at,
      status,
      published_status,
      vendor,
      handles,
      ids,
    ] = codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,

        fields: fields.join(','),
        limit: adjustLimit ?? REST_DEFAULT_LIMIT,
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
        published_at_min: published_at ? published_at[0] : undefined,
        published_at_max: published_at ? published_at[1] : undefined,

        ...nextPageQuery,
      });
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    Product,
    typeof Sync_Products,
    SyncTableManagerRestWithGraphQlMetafields<Product>
  >): SyncFunction {
    return this.generateSharedSyncFunction({
      context,
      codaSyncParams,
      fields: syncTableManager.getSyncedStandardFields(productFieldDependencies),
    });
  }

  /**
   * Edge case: The Product class is responsible for syncing all Variants
   */
  protected static makeVariantsSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    Variant,
    typeof Sync_ProductVariants,
    SyncTableManagerRestWithGraphQlMetafields<Variant>
  >): SyncFunction {
    const requiredProductFields = ['id', 'variants'];
    const allowedProductFields = ['handle', 'id', 'images', 'status', 'title', 'variants'];

    return this.generateSharedSyncFunction({
      context,
      codaSyncParams,
      fields: arrayUnique(
        syncTableManager
          .getSyncedStandardFields(productVariantFieldDependencies)
          .concat(requiredProductFields)
          .filter((fromKey) => allowedProductFields.includes(fromKey))
      ),
    });
  }

  public static async syncVariants(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await Variant.getSyncTableManager(context, codaSyncParams);
    const sync = this.makeVariantsSyncFunction({
      codaSyncParams: codaSyncParams as CodaSyncParams<typeof Sync_ProductVariants>,
      context,
      syncTableManager,
    });

    const { response, continuation } = await syncTableManager.executeSync({
      sync,
      getNestedData(response, context) {
        return response.data.flatMap((product) =>
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
        );
      },
    });

    return {
      result: response.data.map((variant) => variant.formatToRow()),
      continuation,
    };
  }

  public static async find({ id, fields = null, context, options }: FindArgs): Promise<Product | null> {
    const result = await this.baseFind<Product>({
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
    const response = await this.baseDelete<Product>({
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
  }: AllArgs): Promise<FindAllResponse<Product>> {
    const response = await this.baseFind<Product>({
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

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO: Add validation
  validateParams = (
    // TODO: fix params
    params: any
  ) => {
    if (params.status) {
      const validStatuses = OPTIONS_PRODUCT_STATUS_REST.map((status) => status.value);
      (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown product status: ' + status);
      });
    }
    if ('title' in params && params.title === '') {
      throw new coda.UserVisibleError("Product title can't be blank");
    }
    if ('published_status' in params) {
      const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
      (Array.isArray(params.published_status) ? params.published_status : [params.published_status]).forEach(
        (published_status) => {
          if (!validPublishedStatuses.includes(published_status))
            throw new coda.UserVisibleError('Unknown published_status: ' + published_status);
        }
      );
    }
    return true;
  };

  protected formatToApi({ row, metafields = [] }: FromRow<ProductRow>) {
    // let apiData: UpdateArgs | CreateArgs = {};
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id', 'body_html', 'handle', 'product_type', 'tags',
      'template_suffix', 'title', 'vendor', 'status'
    ];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (row.options !== undefined) {
      apiData.options = row.options
        .split(',')
        .map((str) => str.trim())
        .map((option) => ({ name: option, values: [DEFAULT_PRODUCT_OPTION_NAME] }));

      // We need to add a default variant to the product if some options are defined
      if (apiData.options.length) {
        apiData.variants = [
          {
            option1: DEFAULT_PRODUCT_OPTION_NAME,
            option2: DEFAULT_PRODUCT_OPTION_NAME,
            option3: DEFAULT_PRODUCT_OPTION_NAME,
          },
        ];
      }
    }
    if (row.images !== undefined) {
      apiData.images = row.images.map((url) => ({ src: url }));
    }

    if (metafields.length) {
      apiData.metafields = metafields;
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): ProductRow {
    const { apiData } = this;

    // const filterOutTheseKeys = Object.keys(apiData)
    //   .map((key) => {
    //     if ((Array.isArray(apiData[key]) && apiData[key][0] instanceof Object) || apiData[key] instanceof Object) {
    //       return key;
    //     }
    //   })
    //   .filter(Boolean);
    // if (filterOutTheseKeys.length) {
    //   console.log('filterOutTheseKeys', filterOutTheseKeys);
    //   throw new Error('d');
    // }

    let obj: ProductRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/products/${apiData.id}`,
      body: striptags(apiData.body_html),
      published: !!apiData.published_at,
      storeUrl: apiData.status === 'active' ? `${this.context.endpoint}/products/${apiData.handle}` : '',

      // keep typescript happy
      // TODO: fix
      images: undefined,
      options: undefined,
    };

    if (apiData.options && Array.isArray(apiData.options)) {
      obj.options = apiData.options.map((option) => option.name).join(',');
    }
    if (apiData.images && Array.isArray(apiData.images)) {
      obj.featuredImage = apiData.images.find((image) => image.position === 1)?.src;
      obj.images = apiData.images.map((image) => image.src);
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
