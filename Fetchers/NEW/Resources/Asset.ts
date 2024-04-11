// #region Imports
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { AbstractResource, BaseContext, FindAllResponse, ResourceDisplayName } from '../AbstractResource';
import { RestResourcePlural, RestResourceSingular } from '../../../resources/ShopifyResource.types';

// #endregion

interface DeleteArgs extends BaseContext {
  theme_id?: number | string | null;
  asset?: { [key: string]: unknown } | null;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  theme_id?: number | string | null;
  fields?: unknown;
  asset?: { [key: string]: unknown } | null;
}

export class Asset extends AbstractResource {
  public apiData: {
    attachment: string | null;
    checksum: string | null;
    content_type: string | null;
    created_at: string | null;
    key: string | null;
    public_url: string | null;
    size: number | null;
    theme_id: number | null;
    updated_at: string | null;
    value: string | null;
  };

  static readonly displayName = 'Asset' as ResourceDisplayName;
  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
    { http_method: 'get', operation: 'get', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
    { http_method: 'get', operation: 'get', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
    { http_method: 'put', operation: 'put', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
  ];
  protected static primaryKey: string = 'key';
  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Asset,
      plural: RestResourcePlural.Asset,
    },
  ];

  public static async delete({ theme_id = null, asset = null, context, options }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Asset>({
      urlIds: { theme_id: theme_id },
      params: {},
      context,
      options,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    theme_id = null,
    fields = null,
    asset = null,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Asset>> {
    const response = await this.baseFind<Asset>({
      urlIds: { theme_id: theme_id },
      params: { fields: fields, asset: asset, ...otherArgs },
      context,
      options,
    });

    return response;
  }
}
