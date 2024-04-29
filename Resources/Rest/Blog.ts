// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithRestMetafields } from '../../SyncTableManager/Rest/SyncTableManagerRestWithMetafields';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTable.types';
import { MakeSyncRestFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Blogs } from '../../coda/setup/blogs-setup';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { BlogRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { BlogSyncTableSchema, COMMENTABLE_OPTIONS, blogFieldDependencies } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, filterObjectKeys, isNullishOrEmpty } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithRestMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';

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

export class Blog extends AbstractRestResourceWithRestMetafields {
  public apiData: RestApiDataWithMetafields & {
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

  public static readonly displayName: Identity = PACK_IDENTITIES.Blog;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Blog;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Blog;

  protected static readonly graphQlName = GraphQlResourceNames.Blog;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'blogs/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'blogs.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'blogs/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'blogs.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'blogs/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Blog,
      plural: RestResourcesPlural.Blog,
    },
  ];

  public static getStaticSchema() {
    return BlogSyncTableSchema;
  }

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

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncRestFunctionArgs<
    Blog,
    typeof Sync_Blogs,
    SyncTableManagerRestWithRestMetafields<Blog>
  >): SyncRestFunction<Blog> {
    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit: syncTableManager.shouldSyncMetafields ? 30 : limit,
        firstPageParams: {
          fields: syncTableManager.getSyncedStandardFields(blogFieldDependencies).join(','),
        },
      });

      return this.all(params);
    };
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<Blog | null> {
    const result = await this.baseFind<Blog>({
      urlIds: { id },
      params: { fields },
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
  }: AllArgs): Promise<FindAllRestResponse<Blog>> {
    const response = await this.baseFind<Blog>({
      context,
      urlIds: {},
      params: { limit, since_id, handle, fields, ...otherArgs },
      options,
    });

    return response;
  }

  protected static validateParams(params: AllArgs) {
    const validCommentableOptions = COMMENTABLE_OPTIONS.map((option) => option.value);
    if (!isNullishOrEmpty(params.commentable) && !validCommentableOptions.includes(params.commentable)) {
      throw new InvalidValueVisibleError('commentable: ' + params.commentable);
    }
    return super.validateParams(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi({ row, metafields = [] }: FromRow<BlogRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    const oneToOneMappingKeys = ['id', 'title', 'handle', 'commentable', 'template_suffix'];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (metafields.length) {
      apiData.metafields = metafields;
    }

    return apiData;
  }

  public formatToRow(): BlogRow {
    const { apiData } = this;
    let obj: BlogRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/blogs/${apiData.id}`,
    };

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
