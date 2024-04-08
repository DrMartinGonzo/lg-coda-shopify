// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_LIMIT } from '../../../../constants';
import { GraphQlResourceName } from '../../../../resources/ShopifyResource.types';
import { Sync_Pages } from '../../../../resources/pages/pages-coda';
import { PageRow } from '../../../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../../../schemas/schema-helpers';
import { PageSyncTableSchema, pageFieldDependencies } from '../../../../schemas/syncTable/PageSchema';
import { MetafieldOwnerType } from '../../../../types/admin.types';
import { deepCopy, filterObjectKeys } from '../../../../utils/helpers';
import { SyncTableParamValues } from '../../../SyncTable/SyncTable.types';
import { BaseContext, FindAllResponse } from '../../AbstractResource';
import { FromRow, GetSchemaArgs, MakeSyncFunctionArgs, SyncFunction } from '../../AbstractResource_Synced';
import {
  AbstractResource_Synced_HasMetafields,
  ApiDataWithMetafields,
} from '../../AbstractResource_Synced_HasMetafields';
import { Metafield, RestMetafieldOwnerType } from '../Metafield';
import { SyncTableRestHasRestMetafields } from '../../SyncTableRestHasRestMetafields';
import { SearchParams } from '../../RestClientNEW';

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
  title?: unknown;
  handle?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  fields?: unknown;
  published_status?: string;
}

export class Page extends AbstractResource_Synced_HasMetafields {
  public apiData: ApiDataWithMetafields & {
    admin_graphql_api_id: string | null;
    author: string | null;
    body_html: string | null;
    created_at: string | null;
    handle: string | null;
    id: number | null;
    metafield: Metafield | null | { [key: string]: any };
    published_at: string | null;
    shop_id: number | null;
    template_suffix: string | null;
    title: string | null;
    updated_at: string | null;
  };

  protected static graphQlName = GraphQlResourceName.OnlineStorePage;
  static readonly metafieldRestOwnerType: RestMetafieldOwnerType = 'page';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Page;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'pages/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'pages.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'pages/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'pages.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'pages/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: 'page',
      plural: 'pages',
    },
  ];

  public static getStaticSchema() {
    return PageSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as SyncTableParamValues<typeof Sync_Pages>;
    let augmentedSchema = deepCopy(PageSyncTableSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, this.metafieldGraphQlOwnerType, context);
    }
    // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  protected static makeSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<Page, typeof Sync_Pages, SyncTableRestHasRestMetafields<Page>>): SyncFunction {
    const [syncMetafields, created_at, updated_at, published_at, handle, published_status, since_id, title] =
      codaSyncParams;

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,
        fields: syncTableManager.getSyncedStandardFields(pageFieldDependencies).join(', '),
        // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
        // TODO: calculate best possible value based on effectiveMetafieldKeys.length
        limit: adjustLimit ?? syncTableManager.shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
        created_at_min: created_at ? created_at[0] : undefined,
        created_at_max: created_at ? created_at[1] : undefined,
        updated_at_min: updated_at ? updated_at[0] : undefined,
        updated_at_max: updated_at ? updated_at[1] : undefined,
        published_at_min: published_at ? published_at[0] : undefined,
        published_at_max: published_at ? published_at[1] : undefined,
        handle,
        published_status,
        since_id,
        title,

        ...nextPageQuery,
      });
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<Page | null> {
    const result = await this.baseFind<Page>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Page>({
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
    title = null,
    handle = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    published_at_min = null,
    published_at_max = null,
    fields = null,
    published_status = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Page>> {
    const response = await this.baseFind<Page>({
      context,
      urlIds: {},
      params: {
        limit: limit,
        since_id: since_id,
        title: title,
        handle: handle,
        created_at_min: created_at_min,
        created_at_max: created_at_max,
        updated_at_min: updated_at_min,
        updated_at_max: updated_at_max,
        published_at_min: published_at_min,
        published_at_max: published_at_max,
        fields: fields,
        published_status: published_status,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO: Add validation
  validateParams = (params: AllArgs) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  protected formatToApi({ row, metafields = [] }: FromRow<PageRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id','author', 'body_html', 'handle',
      'published', 'published_at', 'title','template_suffix',
    ];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (metafields.length) {
      apiData.metafields = metafields.map((m) => {
        m.apiData.owner_id = row.id;
        m.apiData.owner_resource = 'page';
        return m;
      });
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): PageRow {
    const { apiData } = this;
    let obj: PageRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/pages/${apiData.id}`,
      body: striptags(apiData.body_html),
      created_at: new Date(apiData.created_at),
      published_at: new Date(apiData.published_at),
      published: !!apiData.published_at,
      updated_at: new Date(apiData.updated_at),
    };

    if (!!apiData.published_at && apiData.handle) {
      obj.shop_url = `${this.context.endpoint}/pages/${apiData.handle}`;
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForRow();
      });
    }

    return obj;
  }
}
