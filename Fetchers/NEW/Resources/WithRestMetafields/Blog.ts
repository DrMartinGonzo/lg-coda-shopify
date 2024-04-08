// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { REST_DEFAULT_LIMIT } from '../../../../constants';
import { GraphQlResourceName } from '../../../../resources/ShopifyResource.types';
import { Sync_Blogs } from '../../../../resources/blogs/blogs-coda';
import { BlogRow } from '../../../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../../../schemas/schema-helpers';
import {
  BlogSyncTableSchema,
  COMMENTABLE_OPTIONS,
  blogFieldDependencies,
} from '../../../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../../../types/admin.types';
import { deepCopy, filterObjectKeys } from '../../../../utils/helpers';
import { BaseContext, FindAllResponse } from '../../AbstractResource';
import {
  CodaSyncParams,
  FromRow,
  GetSchemaArgs,
  MakeSyncFunctionArgs,
  SyncFunction,
} from '../../AbstractResource_Synced';
import {
  AbstractResource_Synced_HasMetafields,
  ApiDataWithMetafields,
} from '../../AbstractResource_Synced_HasMetafields';
import { SearchParams } from '../../RestClientNEW';
import { SyncTableRestHasRestMetafields } from '../../SyncTableRestHasRestMetafields';
import { Metafield, RestMetafieldOwnerType } from '../Metafield';

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
  commentable?: string;
  limit?: unknown;
  since_id?: unknown;
  handle?: unknown;
  fields?: unknown;
}

export class Blog extends AbstractResource_Synced_HasMetafields {
  public apiData: ApiDataWithMetafields & {
    admin_graphql_api_id: string | null;
    commentable: string | null;
    created_at: string | null;
    feedburner: string | null;
    feedburner_location: string | null;
    handle: string | null;
    id: number | null;
    tags: string | null;
    template_suffix: string | null;
    title: string | null;
    updated_at: string | null;
  };

  protected static graphQlName = GraphQlResourceName.OnlineStoreBlog;
  static readonly metafieldRestOwnerType: RestMetafieldOwnerType = 'blog';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Blog;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'blogs/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'blogs.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'blogs/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'blogs.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'blogs/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: 'blog',
      plural: 'blogs',
    },
  ];

  public static getStaticSchema() {
    return BlogSyncTableSchema;
  }

  // TODO: helper function for all dynamic schemas that share this simple augmentation
  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Blogs>;
    let augmentedSchema = deepCopy(BlogSyncTableSchema);
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
  }: MakeSyncFunctionArgs<Blog, typeof Sync_Blogs, SyncTableRestHasRestMetafields<Blog>>): SyncFunction {
    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,
        fields: syncTableManager.getSyncedStandardFields(blogFieldDependencies).join(', '),
        limit: adjustLimit ?? syncTableManager.shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,

        ...nextPageQuery,
      });
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<Blog | null> {
    const result = await this.baseFind<Blog>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Blog>({
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
    handle = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Blog>> {
    const response = await this.baseFind<Blog>({
      context,
      urlIds: {},
      params: { limit: limit, since_id: since_id, handle: handle, fields: fields, ...otherArgs },
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO: Add validation
  validateParams = (params: AllArgs) => {
    const validCommentableOptions = COMMENTABLE_OPTIONS.map((option) => option.value);
    if ('commentable' in params && !validCommentableOptions.includes(params.commentable)) {
      throw new coda.UserVisibleError('Unknown commentable option: ' + params.commentable);
    }
    return true;
  };

  protected formatToApi({ row, metafields = [] }: FromRow<BlogRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    const oneToOneMappingKeys = ['id', 'title', 'handle', 'commentable', 'template_suffix'];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (metafields.length) {
      apiData.metafields = metafields.map((m) => {
        m.apiData.owner_id = row.id;
        m.apiData.owner_resource = 'blog';
        return m;
      });
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): BlogRow {
    const { apiData } = this;
    let obj: BlogRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/blogs/${apiData.id}`,
      created_at: new Date(apiData.created_at),
      updated_at: new Date(apiData.updated_at),
    };

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForRow();
      });
    }

    return obj;
  }
}
