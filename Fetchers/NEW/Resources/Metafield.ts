import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { CACHE_DISABLED, CUSTOM_FIELD_PREFIX_KEY } from '../../../constants';
import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';
import { GraphQlResourceName } from '../../../resources/ShopifyResource.types';
import { shouldDeleteMetafield } from '../../../resources/metafields/utils/metafields-utils';
import { formatMetaFieldValueForSchema } from '../../../resources/metafields/utils/metafields-utils-formatToRow';
import { splitMetaFieldFullKey } from '../../../resources/metafields/utils/metafields-utils-keys';
import { MetafieldRow } from '../../../schemas/CodaRows.types';
import { isString } from '../../../utils/helpers';
import { FetchRequestOptions } from '../../Fetcher.types';
import { BaseContext, FindAllResponse } from '../AbstractResource';
import { AbstractResource_Synced, FromRow } from '../AbstractResource_Synced';
import { RestMetafieldOwnerType } from '../AbstractResource_Synced_HasMetafields';

interface FindArgs extends BaseContext {
  id: number | string;
  article_id?: number | string | null;
  blog_id?: number | string | null;
  collection_id?: number | string | null;
  customer_id?: number | string | null;
  draft_order_id?: number | string | null;
  order_id?: number | string | null;
  page_id?: number | string | null;
  product_image_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
  article_id?: number | string | null;
  blog_id?: number | string | null;
  collection_id?: number | string | null;
  customer_id?: number | string | null;
  draft_order_id?: number | string | null;
  order_id?: number | string | null;
  page_id?: number | string | null;
  product_image_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  article_id?: number | string | null;
  blog_id?: number | string | null;
  collection_id?: number | string | null;
  customer_id?: number | string | null;
  draft_order_id?: number | string | null;
  order_id?: number | string | null;
  page_id?: number | string | null;
  product_image_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  limit?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  namespace?: unknown;
  key?: unknown;
  type?: unknown;
  fields?: unknown;
  metafield?: { [key: string]: unknown } | null;
  options?: FetchRequestOptions;
}

function buildMetafieldResourcePaths() {
  const paths = [
    { http_method: 'get', operation: 'get', ids: [], path: 'metafields.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'metafields/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'metafields.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'metafields/<id>.json' },
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'metafields/<id>.json' },
  ];

  [
    ['articles', 'article_id'],
    ['blogs', 'blog_id'],
    ['collections', 'collection_id'],
    ['customers', 'customer_id'],
    ['draft_orders', 'draft_order_id'],
    ['orders', 'order_id'],
    ['pages', 'page_id'],
    ['product_images', 'product_image_id'],
    ['products', 'product_id'],
    ['variants', 'variant_id'],
  ].forEach(([ownerPath, ownerIdKey]) => {
    paths.push({
      http_method: 'get',
      operation: 'get',
      ids: [ownerIdKey],
      path: `${ownerPath}/<${ownerIdKey}>/metafields.json`,
    });
    paths.push({
      http_method: 'get',
      operation: 'get',
      ids: [ownerIdKey, 'id'],
      path: `${ownerPath}/<${ownerIdKey}>/metafields/<id>.json`,
    });
    paths.push({
      http_method: 'post',
      operation: 'post',
      ids: [ownerIdKey],
      path: `${ownerPath}/<${ownerIdKey}>/metafields.json`,
    });
    paths.push({
      http_method: 'put',
      operation: 'put',
      ids: [ownerIdKey, 'id'],
      path: `${ownerPath}/<${ownerIdKey}>/metafields/<id>.json`,
    });
    paths.push({
      http_method: 'delete',
      operation: 'delete',
      ids: [ownerIdKey, 'id'],
      path: `${ownerPath}/<${ownerIdKey}>/metafields/<id>.json`,
    });
  });

  return paths;
}

export class Metafield extends AbstractResource_Synced {
  apiData: {
    key: string | null;
    namespace: string | null;
    value: string | number | number | boolean | string | null;
    article_id: number | null;
    blog_id: number | null;
    collection_id: number | null;
    created_at: string | null;
    customer_id: number | null;
    description: string | null;
    draft_order_id: number | null;
    id: number | null;
    order_id: number | null;
    owner_id: number | null;
    owner_resource: RestMetafieldOwnerType | null;
    page_id: number | null;
    product_id: number | null;
    product_image_id: number | null;
    type: string | null;
    updated_at: string | null;
    variant_id: number | null;
  };

  protected static graphQlName = GraphQlResourceName.Metafield;

  protected static paths: ResourcePath[] = buildMetafieldResourcePaths();
  // protected static paths: ResourcePath[] = [
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['article_id', 'id'],
  //     path: 'articles/<article_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['blog_id', 'id'],
  //     path: 'blogs/<blog_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['blog_id', 'id'],
  //     path: 'blogs/<blog_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['collection_id', 'id'],
  //     path: 'collections/<collection_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['customer_id', 'id'],
  //     path: 'customers/<customer_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['draft_order_id', 'id'],
  //     path: 'draft_orders/<draft_order_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'metafields/<id>.json' },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['order_id', 'id'],
  //     path: 'orders/<order_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['page_id', 'id'],
  //     path: 'pages/<page_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['product_image_id', 'id'],
  //     path: 'product_images/<product_image_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['product_id', 'id'],
  //     path: 'products/<product_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'delete',
  //     operation: 'delete',
  //     ids: ['variant_id', 'id'],
  //     path: 'variants/<variant_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'get', operation: 'get', ids: ['article_id'], path: 'articles/<article_id>/metafields.json' },

  //   // // TODO ——————————————————————————————
  //   // { http_method: 'get', operation: 'get', ids: ['owner_id'], path: 'articles/<article_id>/metafields.json' },
  //   // // TODO ——————————————————————————————

  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['article_id', 'id'],
  //     path: 'articles/<article_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'get', operation: 'get', ids: ['blog_id'], path: 'blogs/<blog_id>/metafields.json' },
  //   { http_method: 'get', operation: 'get', ids: ['blog_id', 'id'], path: 'blogs/<blog_id>/metafields/<id>.json' },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['collection_id'],
  //     path: 'collections/<collection_id>/metafields.json',
  //   },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['collection_id', 'id'],
  //     path: 'collections/<collection_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'get', operation: 'get', ids: ['customer_id'], path: 'customers/<customer_id>/metafields.json' },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['customer_id', 'id'],
  //     path: 'customers/<customer_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['draft_order_id'],
  //     path: 'draft_orders/<draft_order_id>/metafields.json',
  //   },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['draft_order_id', 'id'],
  //     path: 'draft_orders/<draft_order_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'get', operation: 'get', ids: [], path: 'metafields.json' },
  //   { http_method: 'get', operation: 'get', ids: ['id'], path: 'metafields/<id>.json' },
  //   { http_method: 'get', operation: 'get', ids: ['order_id'], path: 'orders/<order_id>/metafields.json' },
  //   { http_method: 'get', operation: 'get', ids: ['order_id', 'id'], path: 'orders/<order_id>/metafields/<id>.json' },
  //   { http_method: 'get', operation: 'get', ids: ['page_id'], path: 'pages/<page_id>/metafields.json' },
  //   { http_method: 'get', operation: 'get', ids: ['page_id', 'id'], path: 'pages/<page_id>/metafields/<id>.json' },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['product_image_id'],
  //     path: 'product_images/<product_image_id>/metafields.json',
  //   },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['product_image_id', 'id'],
  //     path: 'product_images/<product_image_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'get', operation: 'get', ids: ['product_id'], path: 'products/<product_id>/metafields.json' },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['product_id', 'id'],
  //     path: 'products/<product_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'get', operation: 'get', ids: ['variant_id'], path: 'variants/<variant_id>/metafields.json' },
  //   {
  //     http_method: 'get',
  //     operation: 'get',
  //     ids: ['variant_id', 'id'],
  //     path: 'variants/<variant_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'post', operation: 'post', ids: ['article_id'], path: 'articles/<article_id>/metafields.json' },
  //   { http_method: 'post', operation: 'post', ids: ['blog_id'], path: 'blogs/<blog_id>/metafields.json' },
  //   { http_method: 'post', operation: 'post', ids: ['blog_id'], path: 'blogs/<blog_id>/metafields.json' },
  //   {
  //     http_method: 'post',
  //     operation: 'post',
  //     ids: ['collection_id'],
  //     path: 'collections/<collection_id>/metafields.json',
  //   },
  //   { http_method: 'post', operation: 'post', ids: ['customer_id'], path: 'customers/<customer_id>/metafields.json' },
  //   {
  //     http_method: 'post',
  //     operation: 'post',
  //     ids: ['draft_order_id'],
  //     path: 'draft_orders/<draft_order_id>/metafields.json',
  //   },
  //   { http_method: 'post', operation: 'post', ids: [], path: 'metafields.json' },
  //   { http_method: 'post', operation: 'post', ids: ['order_id'], path: 'orders/<order_id>/metafields.json' },
  //   { http_method: 'post', operation: 'post', ids: ['page_id'], path: 'pages/<page_id>/metafields.json' },
  //   {
  //     http_method: 'post',
  //     operation: 'post',
  //     ids: ['product_image_id'],
  //     path: 'product_images/<product_image_id>/metafields.json',
  //   },
  //   { http_method: 'post', operation: 'post', ids: ['product_id'], path: 'products/<product_id>/metafields.json' },
  //   { http_method: 'post', operation: 'post', ids: ['variant_id'], path: 'variants/<variant_id>/metafields.json' },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['article_id', 'id'],
  //     path: 'articles/<article_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'put', operation: 'put', ids: ['blog_id', 'id'], path: 'blogs/<blog_id>/metafields/<id>.json' },
  //   { http_method: 'put', operation: 'put', ids: ['blog_id', 'id'], path: 'blogs/<blog_id>/metafields/<id>.json' },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['collection_id', 'id'],
  //     path: 'collections/<collection_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['customer_id', 'id'],
  //     path: 'customers/<customer_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['draft_order_id', 'id'],
  //     path: 'draft_orders/<draft_order_id>/metafields/<id>.json',
  //   },
  //   { http_method: 'put', operation: 'put', ids: ['id'], path: 'metafields/<id>.json' },
  //   { http_method: 'put', operation: 'put', ids: ['order_id', 'id'], path: 'orders/<order_id>/metafields/<id>.json' },
  //   { http_method: 'put', operation: 'put', ids: ['page_id', 'id'], path: 'pages/<page_id>/metafields/<id>.json' },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['product_image_id', 'id'],
  //     path: 'product_images/<product_image_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['product_id', 'id'],
  //     path: 'products/<product_id>/metafields/<id>.json',
  //   },
  //   {
  //     http_method: 'put',
  //     operation: 'put',
  //     ids: ['variant_id', 'id'],
  //     path: 'variants/<variant_id>/metafields/<id>.json',
  //   },
  // ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: 'metafield',
      plural: 'metafields',
    },
  ];

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return CUSTOM_FIELD_PREFIX_KEY + this.fullKey;
  }

  public static async find({
    context,
    id,
    article_id = null,
    blog_id = null,
    collection_id = null,
    customer_id = null,
    draft_order_id = null,
    order_id = null,
    page_id = null,
    product_image_id = null,
    product_id = null,
    variant_id = null,
    fields = null,
  }: FindArgs): Promise<Metafield | null> {
    const result = await this.baseFind<Metafield>({
      context,
      urlIds: {
        id,
        article_id,
        blog_id,
        collection_id,
        customer_id,
        draft_order_id,
        order_id,
        page_id,
        product_image_id,
        product_id,
        variant_id,
      },
      params: { fields },
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({
    context,
    id,
    article_id = null,
    blog_id = null,
    collection_id = null,
    customer_id = null,
    draft_order_id = null,
    order_id = null,
    page_id = null,
    product_image_id = null,
    product_id = null,
    variant_id = null,
  }: DeleteArgs): Promise<unknown> {
    const response = await this.request<Metafield>({
      http_method: 'delete',
      operation: 'delete',
      context,
      urlIds: {
        id,
        article_id,
        blog_id,
        collection_id,
        customer_id,
        draft_order_id,
        order_id,
        page_id,
        product_image_id,
        product_id,
        variant_id,
      },
      params: {},
    });

    return response ? response.body : null;
  }

  public static async createOrUpdate({
    context,
    metafields,
    owner_id,
    owner_resource,
  }: {
    context: coda.ExecutionContext;
    metafields: Array<Metafield>;
    owner_id: number;
    owner_resource: RestMetafieldOwnerType;
  }) {
    const existingMetafields = await Metafield.all({
      context,
      ['metafield[owner_id]']: owner_id,
      ['metafield[owner_resource]']: owner_resource,
      options: { cacheTtlSecs: CACHE_DISABLED },
    });

    const setsToDelete = metafields.filter((set) => shouldDeleteMetafield(set.apiData.value as string));
    console.log('———————————————————setsToDelete', setsToDelete);
    const metafieldsToDelete = existingMetafields.data.filter((m) => {
      return setsToDelete.some((set) => {
        return m.apiData.key === set.apiData.key && m.apiData.namespace === set.apiData.namespace;
      });
    });
    // const metafieldsToDelete = existingMetafields.data.filter((m) => {
    //   return setsToDelete.some((set) => {
    //     // const { metaKey, metaNamespace } = splitMetaFieldFullKey(set.key);
    //     return m.apiData.key === set.key && m.apiData.namespace === set.namespace;
    //   });
    // });

    const metafieldsToUpdate = metafields.filter((set) => !shouldDeleteMetafield(set.apiData.value as string));
    // .map((m) => new Metafield({ context, fromData: m }));

    await Promise.all([
      ...metafieldsToDelete.map((m) => m.delete()),
      ...metafieldsToUpdate.map((m) => m.saveAndUpdate()),
    ]);

    return {
      deletedMetafields: metafieldsToDelete,
      updatedMetafields: metafieldsToUpdate,
    };
  }

  public static async all({
    context,
    article_id = null,
    blog_id = null,
    collection_id = null,
    customer_id = null,
    draft_order_id = null,
    order_id = null,
    page_id = null,
    product_image_id = null,
    product_id = null,
    variant_id = null,
    limit = null,
    since_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    namespace = null,
    key = null,
    type = null,
    fields = null,
    metafield = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Metafield>> {
    const response = await this.baseFind<Metafield>({
      context: context,
      urlIds: {
        article_id,
        blog_id,
        collection_id,
        customer_id,
        draft_order_id,
        order_id,
        page_id,
        product_image_id,
        product_id,
        variant_id,
      },
      params: {
        limit,
        since_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        namespace,
        key,
        type,
        fields,
        metafield,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  static createInstancesFromMetafieldSet(
    context: coda.ExecutionContext,
    metafieldSet: CodaMetafieldKeyValueSet,
    owner_id?: string | number
  ): Metafield {
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldSet.key);
    return new Metafield({
      context,
      fromData: {
        namespace: metaNamespace,
        key: metaKey,
        type: metafieldSet.type,
        owner_id: owner_id ?? null,
        value:
          metafieldSet.value === null
            ? ''
            : isString(metafieldSet.value)
            ? metafieldSet.value
            : JSON.stringify(metafieldSet.value),
      } as Metafield['apiData'],
    });
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async delete(): Promise<void> {
    await super.delete();
    // make sure to nullify the metafield value
    this.apiData.value = null;
  }

  // #region Formatting
  public formatToApi({ row }: FromRow<MetafieldRow>) {
    // let apiData: UpdateArgs | CreateArgs = {};
    let apiData: Partial<typeof this.apiData> = {};

    return apiData;
  }

  public formatToRow(): MetafieldRow {
    const { apiData } = this;
    // @ts-ignore
    let obj: MetafieldRow = {
      ...apiData,
    };

    return obj;
  }

  public formatValueForRow() {
    return formatMetaFieldValueForSchema({
      // TODO: fix type
      value: this.apiData.value,
      type: this.apiData.type,
    });
  }
}
