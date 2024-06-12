// #region Imports
import striptags from 'striptags';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { SyncTableManagerGraphQlWithMetafieldsType } from '../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import {
  CodaSyncParams,
  MakeSyncFunctionArgs,
  SyncGraphQlFunction,
} from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Products } from '../../coda/setup/products-setup';
import { DEFAULT_PRODUCTVARIANT_OPTION_VALUE } from '../../config';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
import {
  ProductFilters,
  buildProductsSearchQuery,
  createProductMutation,
  deleteProductMutation,
  getProductsQuery,
  getSingleProductQuery,
  productFieldsFragment,
  updateProductMutation,
} from '../../graphql/products-graphql';
import { ProductRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ProductSyncTableSchema } from '../../schemas/syncTable/ProductSchema';
import { MetafieldOwnerType, ProductInput } from '../../types/admin.types';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import {
  dateRangeMax,
  dateRangeMin,
  deepCopy,
  excludeUndefinedObjectKeys,
  isNullish,
  splitAndTrimValues,
} from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
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
  metafields?: boolean;
  featuredImage?: boolean;
  images?: boolean;
  options?: boolean;
}
interface FindArgs extends BaseContext {
  id: number | string;
  fields?: FieldsArgs;
}
interface DeleteArgs extends BaseContext {
  id: string;
}
interface AllArgs extends BaseContext, ProductFilters {
  [key: string]: unknown;
  ids?: string[];
  limit?: number;
  fields?: FieldsArgs;
  metafieldKeys?: Array<string>;
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
// #endregion

export class ProductGraphQl extends AbstractGraphQlResourceWithMetafields {
  public apiData: ResultOf<typeof productFieldsFragment> & GraphQlApiDataWithMetafields;

  public static readonly displayName: Identity = PACK_IDENTITIES.Product;
  protected static readonly graphQlName = GraphQlResourceNames.Product;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Product;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Product;

  protected static readonly paths: Array<GraphQlResourcePath> = [
    'node',
    'product',
    'products',
    'productCreate.product',
    'productUpdate.product',
  ];

  public static getStaticSchema() {
    return ProductSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Products>;
    let augmentedSchema = deepCopy(ProductSyncTableSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(
        ProductSyncTableSchema,
        this.metafieldGraphQlOwnerType,
        context
      );
    }
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
    SyncTableManagerGraphQlWithMetafieldsType<ProductGraphQl>
  >): SyncGraphQlFunction<ProductGraphQl> {
    const [syncMetafields, product_types, createdAt, updatedAt, status, publishedStatus, vendors, idArray, tags] =
      codaSyncParams;

    const fields: AllArgs['fields'] = {
      metafields: syncTableManager.shouldSyncMetafields,
    };

    ['options', 'featuredImage', 'images'].forEach((key) => {
      fields[key] = syncTableManager.effectiveStandardFromKeys.includes(key);
    });

    return ({ cursor = null, limit }) =>
      this.all({
        context,
        fields,
        metafieldKeys: syncTableManager.effectiveMetafieldKeys,
        cursor,
        limit,

        created_at_min: dateRangeMin(createdAt),
        created_at_max: dateRangeMax(createdAt),
        updated_at_min: dateRangeMin(updatedAt),
        updated_at_max: dateRangeMax(updatedAt),

        tags,
        // gift_card: false,
        ids: idArray,
        status,
        published_status: publishedStatus,
        product_types,
        vendors,

        options: { cacheTtlSecs: CACHE_DISABLED },
      });
  }

  public static async find({ id, fields = {}, context, options }: FindArgs): Promise<ProductGraphQl | null> {
    const result = await this.baseFind<ProductGraphQl, typeof getSingleProductQuery>({
      documentNode: getSingleProductQuery,
      variables: {
        id,

        // TODO: retrieve metafields ?
        includeMetafields: fields?.metafields ?? false,
        countMetafields: 0,
        metafieldKeys: [],
        includeFeaturedImage: fields?.featuredImage ?? true,
        includeImages: fields?.images ?? true,
        includeOptions: fields?.options ?? true,
      } as VariablesOf<typeof getSingleProductQuery>,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context, options }: DeleteArgs) {
    return this.baseDelete<typeof deleteProductMutation>({
      documentNode: deleteProductMutation,
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
    gift_card = null,
    ids,
    since_id = null,
    title = null,
    vendors = null,
    handle = null,
    product_types = null,
    status = null,
    collection_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    published_status = null,
    tags = null,

    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<ProductGraphQl>> {
    const queryFilters: ProductFilters = {
      created_at_min,
      created_at_max,
      updated_at_min,
      updated_at_max,

      gift_card,
      published_status,
      title,
      status,
      vendors,
      product_types,
      ids,
      tags,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (isNullish(queryFilters[key])) delete queryFilters[key];
    });
    const searchQuery = buildProductsSearchQuery(queryFilters);

    const response = await this.baseFind<ProductGraphQl, typeof getProductsQuery>({
      documentNode: getProductsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,
        includeFeaturedImage: fields?.featuredImage ?? false,
        includeMetafields: fields?.metafields ?? false,
        includeImages: fields?.images ?? false,
        metafieldKeys,
        countMetafields: metafieldKeys.length,
        includeOptions: fields?.options ?? false,

        ...otherArgs,
      } as VariablesOf<typeof getProductsQuery>,
      context,
      options,
    });

    return response;
  }

  // protected static validateParams(params: AllArgs) {
  //   if (params.status) {
  //     const validStatuses = OPTIONS_PRODUCT_STATUS_REST.map((status) => status.value);
  //     const statuses = Array.isArray(params.status) ? params.status : [params.status];
  //     if (!statuses.every((s) => validStatuses.includes(s))) {
  //       throw new InvalidValueVisibleError('product status: ' + statuses.join(', '));
  //     }
  //   }
  //   if (params.published_status) {
  //     const validStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  //     const statuses = Array.isArray(params.published_status) ? params.published_status : [params.published_status];
  //     if (!statuses.every((s) => validStatuses.includes(s))) {
  //       throw new InvalidValueVisibleError('published_status: ' + statuses.join(', '));
  //     }
  //   }
  //   if (isDefinedEmpty(params.title)) {
  //     throw new InvalidValueVisibleError("Product title can't be blank");
  //   }

  //   return super.validateParams(params);
  // }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async save({ update = false }: SaveArgs): Promise<void> {
    const { primaryKey } = ProductGraphQl;
    const isUpdate = this.apiData[primaryKey];

    const documentNode = isUpdate ? updateProductMutation : createProductMutation;
    const input = isUpdate ? this.formatUpdateInput() : this.formatCreateInput();

    // if (input) {
    const variables = {
      productInput: input ?? {},
      includeFeaturedImage: true,
      includeOptions: true,
      metafieldKeys: [],
      includeMetafields: false,
      countMetafields: 0,
      includeImages: true,
    } as VariablesOf<typeof updateProductMutation> | VariablesOf<typeof createProductMutation>;

    await this._baseSave<typeof documentNode>({ documentNode, variables, update });
    // }
  }

  formatBaseInput(): ProductInput | undefined {
    let input: ProductInput = {
      descriptionHtml: this.apiData.descriptionHtml,
      giftCard: this.apiData.isGiftCard,
      handle: this.apiData.handle,
      productType: this.apiData.productType,
      status: this.apiData.status as any,
      tags: this.apiData.tags,
      templateSuffix: this.apiData.templateSuffix,
      title: this.apiData.title,
      vendor: this.apiData.vendor,
    };
    const filteredInput = excludeUndefinedObjectKeys(input);

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  formatCreateInput(): ProductInput | undefined {
    const baseInput = this.formatBaseInput();
    const input = {
      ...(baseInput ?? {}),
      productOptions: this.apiData.options,
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

  formatUpdateInput(): ProductInput | undefined {
    const baseInput = this.formatBaseInput();
    return {
      ...(baseInput ?? {}),
      id: this.graphQlGid,
    };
  }

  protected formatToApi({ row, metafields }: FromRow<ProductRow>) {
    let apiData: Partial<typeof this.apiData> = {
      id: idToGraphQlGid(GraphQlResourceNames.Product, row.id),
      descriptionHtml: row.body_html,
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      publishedAt: row.published_at ? row.published_at.toString() : undefined,
      templateSuffix: row.template_suffix,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,

      handle: row.handle,
      title: row.title,
      productType: row.product_type,
      isGiftCard: row.giftCard,
      options: row.options
        ? splitAndTrimValues(row.options).map((name) => ({
            name,
            values: [
              {
                // We need to add a default variant to the product if some options are defined
                name: DEFAULT_PRODUCTVARIANT_OPTION_VALUE,
              },
            ],
          }))
        : undefined,
      onlineStoreUrl: row.storeUrl,
      status: row.status as any,
      tags: row.tags ? splitAndTrimValues(row.tags) : undefined,
      vendor: row.vendor,
      featuredImage: row.featuredImage ? { url: row.featuredImage } : undefined,
      restMetafieldInstances: metafields,
      images: row.images
        ? {
            nodes: row.images.map((url) => ({ url })),
          }
        : undefined,
    };

    return apiData;
  }

  public formatToRow(): ProductRow {
    const { apiData: data } = this;

    let obj: ProductRow = {
      id: this.restId,
      title: data.title,
      admin_url: `${this.context.endpoint}/admin/products/${this.restId}`,
      body: striptags(data.descriptionHtml),
      body_html: data.descriptionHtml,
      published: !!data.onlineStoreUrl,
      status: data.status,
      admin_graphql_api_id: this.graphQlGid,
      created_at: data.createdAt,
      published_at: data.publishedAt,
      updated_at: data.updatedAt,
      handle: data.handle,
      product_type: data.productType,
      tags: data.tags ? data.tags.join(', ') : undefined,
      template_suffix: data.templateSuffix,
      vendor: data.vendor,
      storeUrl: data.onlineStoreUrl,
      featuredImage: data.featuredImage ? data.featuredImage.url : undefined,
      giftCard: data.isGiftCard,
    };

    if (data.options && Array.isArray(data.options)) {
      obj.options = data.options.map((option) => option.name).join(',');
    }
    if (data.images?.nodes && Array.isArray(data.images.nodes)) {
      obj.images = data.images.nodes.map((image) => image.url);
    }

    if (data.restMetafieldInstances) {
      data.restMetafieldInstances.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
