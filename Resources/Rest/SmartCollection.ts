// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithGraphQlMetafields } from '../../SyncTableManager/Rest/SyncTableManagerRestWithMetafields';
import { MakeSyncRestFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Collections } from '../../coda/setup/collections-setup';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { collectionFieldDependencies } from '../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { isNullishOrEmpty } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { MergedCollection } from './MergedCollection';
import { SupportedMetafieldOwnerResource } from './Metafield';

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
  published_status?: string;
  fields?: unknown;
}
interface OrderArgs extends BaseContext {
  [key: string]: unknown;
  products?: unknown;
  sort_order?: unknown;
  body?: { [key: string]: unknown } | null;
}

export interface SmartCollectionData extends RestApiDataWithMetafields {
  rules: Array<{ column: string; relation: string; condition: string }> | null;
  // rules: { [key: string]: unknown } | { [key: string]: unknown }[] | null;
  title: string | null;
  body_html: string | null;
  disjunctive: boolean | null;
  handle: string | null;
  id: number | null;
  image: string | { [key: string]: unknown } | null;
  published_at: string | null;
  published_scope: string | null;
  sort_order: string | null;
  template_suffix: string | null;
  updated_at: string | null;
}

export class SmartCollection extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: SmartCollectionData;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;

  protected static readonly graphQlName = GraphQlResourceNames.Collection;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'smart_collections/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'smart_collections.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'smart_collections/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'smart_collections.json' },
    { http_method: 'put', operation: 'order', ids: ['id'], path: 'smart_collections/<id>/order.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'smart_collections/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.SmartCollection,
      plural: RestResourcesPlural.SmartCollection,
    },
  ];

  public static getStaticSchema() {
    return MergedCollection.getStaticSchema();
  }

  public static async getDynamicSchema(params: GetSchemaArgs) {
    return MergedCollection.getDynamicSchema(params);
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncRestFunctionArgs<
    MergedCollection,
    typeof Sync_Collections,
    SyncTableManagerRestWithGraphQlMetafields<MergedCollection>
  >): SyncRestFunction<MergedCollection> {
    const [syncMetafields, created_at, updated_at, published_at, handle, ids, product_id, published_status, title] =
      codaSyncParams;

    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: {
          fields: syncTableManager.getSyncedStandardFields(collectionFieldDependencies).join(','),
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
        },
      });

      return SmartCollection.all(params);
    };
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<MergedCollection | null> {
    const result = await this.baseFind<MergedCollection>({
      urlIds: { id },
      params: { fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<MergedCollection>({
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
  }: AllArgs): Promise<FindAllRestResponse<MergedCollection>> {
    const response = await this.baseFind<MergedCollection>({
      context,
      urlIds: {},
      params: {
        limit,
        ids,
        since_id,
        title,
        product_id,
        handle,
        updated_at_min,
        updated_at_max,
        published_at_min,
        published_at_max,
        published_status,
        fields,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  protected static validateParams(params: AllArgs) {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (!isNullishOrEmpty(params.published_status) && !validPublishedStatuses.includes(params.published_status)) {
      throw new InvalidValueVisibleError('published_status: ' + params.published_status);
    }

    // TODO implement this for update jobs
    //  if (
    //    !isNullOrEmpty(update.newValue.image_alt_text) &&
    //    (isNullOrEmpty(update.newValue.image_url) || isNullOrEmpty(update.previousValue.image_url))
    //  ) {
    //    throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
    //  }

    return super.validateParams(params);
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
    const response = await this.request<SmartCollection>({
      http_method: 'put',
      operation: 'order',
      context: this.context,
      urlIds: { id: this.apiData.id },
      params: { products, sort_order, ...otherArgs },
      body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }

  protected formatToApi(params: FromRow<CollectionRow>) {
    return new MergedCollection({ context: this.context }).formatToApi(params);
  }

  public formatToRow(): CollectionRow {
    return new MergedCollection({ context: this.context, fromData: this.apiData }).formatToRow();
  }
}
