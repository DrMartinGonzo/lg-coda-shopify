// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { AbstractResource, BaseContext, FindAllResponse, ResourceDisplayName } from '../AbstractResource';
import { RestResourcePlural, RestResourceSingular } from '../../../resources/ShopifyResource.types';

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
  fields?: unknown;
}

export class Theme extends AbstractResource {
  public apiData: {
    created_at: string | null;
    id: number | null;
    name: string | null;
    previewable: boolean | null;
    processing: boolean | null;
    role: string | null;
    src: string | null;
    theme_store_id: number | null;
    updated_at: string | null;
  };

  static readonly displayName = 'Theme' as ResourceDisplayName;

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'themes/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'themes.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'themes/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'themes.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'themes/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Theme,
      plural: RestResourcePlural.Theme,
    },
  ];

  public static async find({ context, id, fields = null, options }: FindArgs): Promise<Theme | null> {
    const result = await this.baseFind<Theme>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async findActive({ context, fields = null, options }: AllArgs): Promise<Theme | null> {
    const result = await this.all({ context, fields, options });
    return result.data.find((theme) => theme.apiData.role === 'main');
  }

  public static async delete({ id, context, options }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Theme>({
      urlIds: { id },
      params: {},
      context,
      options,
    });
    return response ? response.body : null;
  }

  public static async all({ context, fields = null, options, ...otherArgs }: AllArgs): Promise<FindAllResponse<Theme>> {
    const response = await this.baseFind<Theme>({
      urlIds: {},
      params: { fields: fields, ...otherArgs },
      context,
      options,
    });

    return response;
  }
}