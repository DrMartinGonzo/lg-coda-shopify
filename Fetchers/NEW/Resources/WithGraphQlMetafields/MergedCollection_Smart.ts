// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { REST_DEFAULT_LIMIT } from '../../../../constants';
import { Sync_Collections } from '../../../../resources/collections/collections-coda';
import { collectionFieldDependencies } from '../../../../schemas/syncTable/CollectionSchema';
import { BaseContext, FindAllResponse } from '../../AbstractResource';
import { MakeSyncFunctionArgs, SyncFunction } from '../../AbstractResource_Synced';
import { SearchParams } from '../../RestClientNEW';
import { SyncTableRestHasGraphQlMetafields } from '../../SyncTableRestHasGraphQlMetafields';
import { MergedCollection } from './MergedCollection';

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
  limit?: unknown;
  ids?: unknown;
  since_id?: unknown;
  title?: unknown;
  product_id?: unknown;
  handle?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  published_status?: unknown;
  fields?: unknown;
}
interface OrderArgs extends BaseContext {
  [key: string]: unknown;
  products?: unknown;
  sort_order?: unknown;
  body?: { [key: string]: unknown } | null;
}

export class MergedCollection_Smart extends MergedCollection {
  protected static jsonBodyName = 'smart_collection';

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'smart_collections/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'smart_collections.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'smart_collections/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'smart_collections.json' },
    { http_method: 'put', operation: 'order', ids: ['id'], path: 'smart_collections/<id>/order.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'smart_collections/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: 'smart_collection',
      plural: 'smart_collections',
    },
  ];

  protected static makeSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    MergedCollection_Smart,
    typeof Sync_Collections,
    SyncTableRestHasGraphQlMetafields<MergedCollection_Smart>
  >): SyncFunction {
    const [syncMetafields, created_at, updated_at, published_at, handle, ids, product_id, published_status, title] =
      codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      MergedCollection_Smart.all({
        context,

        fields: syncTableManager.getSyncedStandardFields(collectionFieldDependencies).join(', '),
        limit: adjustLimit ?? REST_DEFAULT_LIMIT,
        ids: ids && ids.length ? ids.join(',') : undefined,
        handle,
        product_id,
        title,
        published_status,
        created_at_min: created_at ? created_at[0] : undefined,
        created_at_max: created_at ? created_at[1] : undefined,
        updated_at_min: updated_at ? updated_at[0] : undefined,
        updated_at_max: updated_at ? updated_at[1] : undefined,
        published_at_min: published_at ? published_at[0] : undefined,
        published_at_max: published_at ? published_at[1] : undefined,

        ...nextPageQuery,
      });
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<MergedCollection_Smart | null> {
    const result = await this.baseFind<MergedCollection_Smart>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<MergedCollection_Smart>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    limit = null,
    ids = null,
    since_id = null,
    title = null,
    product_id = null,
    handle = null,
    updated_at_min = null,
    updated_at_max = null,
    published_at_min = null,
    published_at_max = null,
    published_status = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<MergedCollection_Smart>> {
    const response = await this.baseFind<MergedCollection_Smart>({
      context,
      urlIds: {},
      params: {
        limit: limit,
        ids: ids,
        since_id: since_id,
        title: title,
        product_id: product_id,
        handle: handle,
        updated_at_min: updated_at_min,
        updated_at_max: updated_at_max,
        published_at_min: published_at_min,
        published_at_max: published_at_max,
        published_status: published_status,
        fields: fields,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async order({
    products = null,
    sort_order = null,
    body = null,
    options,
    ...otherArgs
  }: OrderArgs): Promise<unknown> {
    const response = await this.request<MergedCollection_Smart>({
      http_method: 'put',
      operation: 'order',
      context: this.context,
      urlIds: { id: this.id },
      params: { products: products, sort_order: sort_order, ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }
}
