// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
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
import { MergedCollectionHelper } from './MergedCollectionHelper';
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

export interface CustomCollectionData extends RestApiDataWithMetafields {
  title: string | null;
  body_html: string | null;
  handle: string | null;
  id: number | null;
  image: {
    src?: string;
    alt?: string;
  } | null;
  // image: string | { [key: string]: unknown } | null;
  published: boolean | null;
  published_at: string | null;
  published_scope: string | null;
  sort_order: string | null;
  template_suffix: string | null;
  updated_at: string | null;
}

export class CustomCollection extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: CustomCollectionData;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;

  protected static readonly graphQlName = GraphQlResourceNames.Collection;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'custom_collections/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'custom_collections.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'custom_collections/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'custom_collections.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'custom_collections/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.CustomCollection,
      plural: RestResourcesPlural.CustomCollection,
    },
  ];

  public static getStaticSchema() {
    return MergedCollectionHelper.getStaticSchema();
  }

  public static async getDynamicSchema(params: GetSchemaArgs) {
    return MergedCollectionHelper.getDynamicSchema(params);
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_Collections,
    SyncTableManagerRestWithMetafieldsType<MergedCollection>
  >): SyncRestFunction<MergedCollection> {
    const [syncMetafields, updated_at, published_at, handle, ids, product_id, published_status, title] = codaSyncParams;

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
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
          published_at_min: published_at ? published_at[0] : undefined,
          published_at_max: published_at ? published_at[1] : undefined,
        },
      });

      return CustomCollection.all(params);
    };
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<MergedCollection | null> {
    const result = await this.baseFind<MergedCollection>({
      urlIds: { id: id },
      params: { fields: fields },
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

    return super.validateParams(params);
  }

  protected static validateUpdateJob(prevRow: CollectionRow, newRow: CollectionRow): boolean {
    if (
      !isNullishOrEmpty(newRow.image_alt_text) &&
      isNullishOrEmpty(newRow.image_url) &&
      isNullishOrEmpty(prevRow.image_url)
    ) {
      throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
    }

    return super.validateUpdateJob(prevRow, newRow);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi(params: FromRow<CollectionRow>) {
    return MergedCollectionHelper.formatToApi(params);
  }

  public formatToRow(): CollectionRow {
    return MergedCollectionHelper.formatToRow(this.context, this.apiData as MergedCollection['apiData']);
  }
}
