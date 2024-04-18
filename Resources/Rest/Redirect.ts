// #region Imports
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { BaseContext } from '../../Clients/Client.types';
import { SearchParams } from '../../Clients/RestClient';
import { Sync_Redirects } from '../../coda/setup/redirects-setup';
import { PACK_IDENTITIES, Identity, REST_DEFAULT_LIMIT } from '../../constants';
import { RedirectRow } from '../../schemas/CodaRows.types';
import { RedirectSyncTableSchema, redirectFieldDependencies } from '../../schemas/syncTable/RedirectSchema';
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
  path?: unknown;
  target?: unknown;
  fields?: unknown;
}

export class Redirect extends AbstractSyncedRestResource {
  public apiData: {
    id: number | null;
    path: string | null;
    target: string | null;
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.Redirect;

  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'redirects/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'redirects.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'redirects/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'redirects.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'redirects/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Redirect,
      plural: RestResourcesPlural.Redirect,
    },
  ];

  public static getStaticSchema() {
    return RedirectSyncTableSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncRestFunctionArgs<Redirect, typeof Sync_Redirects>): SyncRestFunction<Redirect> {
    const [path, target] = codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,
        fields: syncTableManager.getSyncedStandardFields(redirectFieldDependencies).join(','),
        limit: adjustLimit ?? REST_DEFAULT_LIMIT,
        path,
        target,

        ...nextPageQuery,
      });
  }

  public static async find({ context, id, fields = null, options }: FindArgs): Promise<Redirect | null> {
    const result = await this.baseFind<Redirect>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Redirect>({
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
    path = null,
    target = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Redirect>> {
    const response = await this.baseFind<Redirect>({
      context: context,
      urlIds: {},
      params: { limit, since_id, path, target, fields, ...otherArgs },
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO
  protected formatToApi({ row }: FromRow<RedirectRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = ['id', 'path', 'target'];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): RedirectRow {
    const { apiData } = this;
    let obj: RedirectRow = {
      ...apiData,
      admin_url: `${this.context.endpoint}/admin/redirects/${apiData.id}`,
    };

    if (apiData.path) {
      obj.test_url = `${this.context.endpoint}${apiData.path}`;
    }

    return obj;
  }
}
