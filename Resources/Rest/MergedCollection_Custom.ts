// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { BaseContext } from '../../Clients/Client.types';
import { SearchParams } from '../../Clients/RestClient';
import { SyncTableManagerRestWithGraphQlMetafields } from '../../SyncTableManager/Rest/SyncTableManagerRestWithGraphQlMetafields';
import { Sync_Collections } from '../../coda/setup/collections-setup';
import { REST_DEFAULT_LIMIT } from '../../constants';
import { collectionFieldDependencies } from '../../schemas/syncTable/CollectionSchema';
import { ResourceName } from '../Abstract/AbstractResource';
import { FindAllResponse } from '../Abstract/Rest/AbstractRestResource';
import { MakeSyncFunctionArgs, SyncFunction } from '../Abstract/Rest/AbstractSyncedRestResource';
import { RestResourcePlural, RestResourceSingular } from '../types/RestResource.types';
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

export class MergedCollection_Custom extends MergedCollection {
  protected static readonly restName: ResourceName = 'custom_collection';
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'custom_collections/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'custom_collections.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'custom_collections/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'custom_collections.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'custom_collections/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.CustomCollection,
      plural: RestResourcePlural.CustomCollection,
    },
  ];

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    MergedCollection_Custom,
    typeof Sync_Collections,
    SyncTableManagerRestWithGraphQlMetafields<MergedCollection_Custom>
  >): SyncFunction {
    const [syncMetafields, created_at, updated_at, published_at, handle, ids, product_id, published_status, title] =
      codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      MergedCollection_Custom.all({
        context,

        fields: syncTableManager.getSyncedStandardFields(collectionFieldDependencies).join(','),
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

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<MergedCollection_Custom | null> {
    const result = await this.baseFind<MergedCollection_Custom>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<MergedCollection_Custom>({
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
  }: AllArgs): Promise<FindAllResponse<MergedCollection_Custom>> {
    const response = await this.baseFind<MergedCollection_Custom>({
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
}
