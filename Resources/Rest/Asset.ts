// #region Imports
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { FetchRequestOptions } from '../../Clients/Client.types';
import { CACHE_DEFAULT, Identity, PACK_IDENTITIES } from '../../constants';
import { AbstractRestResource, FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import { BaseContext } from '../types/Resource.types';
import { RestResourceSingular, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { Theme } from './Theme';

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
interface TemplateSuffixesArgs extends BaseContext {
  kind: RestResourceSingular;
}

export class Asset extends AbstractRestResource {
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

  public static readonly displayName: Identity = PACK_IDENTITIES.Asset;

  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
    { http_method: 'get', operation: 'get', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
    { http_method: 'get', operation: 'get', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
    { http_method: 'put', operation: 'put', ids: ['theme_id'], path: 'themes/<theme_id>/assets.json' },
  ];
  protected static readonly primaryKey: string = 'key';
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Asset,
      plural: RestResourcesPlural.Asset,
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
  }: AllArgs): Promise<FindAllRestResponse<Asset>> {
    const response = await this.baseFind<Asset>({
      urlIds: { theme_id: theme_id },
      params: { fields: fields, asset: asset, ...otherArgs },
      context,
      options,
    });

    return response;
  }

  public static async getTemplateSuffixesFor({ context, kind }: TemplateSuffixesArgs): Promise<Array<string>> {
    const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DEFAULT };
    const activeTheme = await Theme.findActive({ context, fields: 'id,role', options });
    if (activeTheme) {
      const assets = await Asset.all({ theme_id: activeTheme.apiData.id, fields: 'key', context, options });
      if (assets.data.length) {
        const regex = new RegExp(`templates\\\/${kind}\\.(.*)\\.`, '');

        return assets.data
          .map((asset) => asset.apiData.key)
          .map((key) => {
            const match = key.match(regex);
            return match ? match[1] : null;
          })
          .filter(Boolean);
      }
    }

    return [];
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi(): any {
    return;
  }
  public formatToRow(): any {
    return;
  }
}
