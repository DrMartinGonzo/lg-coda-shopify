// #region Imports
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { BaseContext } from '../../Clients/Client.types';
import { SearchParams } from '../../Clients/RestClient';
import { Sync_Collects } from '../../coda/setup/collects-setup';
import { PACK_IDENTITIES, Identity, REST_DEFAULT_LIMIT } from '../../constants';
import { CollectRow } from '../../schemas/CodaRows.types';
import { CollectSyncTableSchema, collectFieldDependencies } from '../../schemas/syncTable/CollectSchema';
import { formatCollectionReference } from '../../schemas/syncTable/CollectionSchema';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { FindAllResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractSyncedRestResource,
  FromRow,
  MakeSyncRestFunctionArgs,
  SyncRestFunction,
} from '../Abstract/Rest/AbstractSyncedRestResource';
import { RestResourcesPlural, RestResourcesSingular } from '../types/Resource.types';

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
  since_id?: unknown;
  fields?: unknown;
}

export class Collect extends AbstractSyncedRestResource {
  public apiData: {
    collection_id: number | null;
    created_at: string | null;
    id: number | null;
    position: number | null;
    product_id: number | null;
    sort_value: string | null;
    updated_at: string | null;
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.Collect;

  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'collects/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'collects.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'collects/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'collects.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Collect,
      plural: RestResourcesPlural.Collect,
    },
  ];

  public static getStaticSchema() {
    return CollectSyncTableSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncRestFunctionArgs<Collect, typeof Sync_Collects>): SyncRestFunction<Collect> {
    const [collectionId] = codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,
        fields: syncTableManager.getSyncedStandardFields(collectFieldDependencies).join(','),
        limit: adjustLimit ?? REST_DEFAULT_LIMIT,
        collection_id: collectionId,

        ...nextPageQuery,
      });
  }

  public static async find({ context, id, fields = null, options }: FindArgs): Promise<Collect | null> {
    const result = await this.baseFind<Collect>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Collect>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    limit = null,
    since_id = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Collect>> {
    const response = await this.baseFind<Collect>({
      context,
      urlIds: {},
      params: { limit, since_id, fields, ...otherArgs },
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO
  protected formatToApi({ row }: FromRow<CollectRow>) {
    let apiData: Partial<typeof this.apiData> = {};
    return apiData;
  }

  public formatToRow(): CollectRow {
    const { apiData } = this;
    let obj: CollectRow = {
      ...apiData,
    };

    if (apiData.collection_id) {
      obj.collection = formatCollectionReference(apiData.collection_id);
    }
    if (apiData.product_id) {
      obj.product = formatProductReference(apiData.product_id);
    }

    return obj;
  }
}
