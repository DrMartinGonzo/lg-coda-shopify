// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { SearchParams } from '../../Clients/RestClient';
import { Sync_Articles } from '../../coda/setup/articles-setup';
import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_LIMIT } from '../../constants';
import { ArticleRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ArticleSyncTableSchema, articleFieldDependencies } from '../../schemas/syncTable/ArticleSchema';
import { formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, filterObjectKeys, parseOptionId } from '../../utils/helpers';
import { BaseContext, FindAllResponse, ResourceDisplayName } from '../AbstractResource';
import { CodaSyncParams, FromRow, GetSchemaArgs, MakeSyncFunctionArgs, SyncFunction } from '../AbstractResource_Synced';
import {
  AbstractResource_Synced_HasMetafields,
  RestApiDataWithMetafields,
} from '../AbstractResource_Synced_HasMetafields';
import { SyncTableRestHasRestMetafields } from '../../SyncTableManager/SyncTableManagerRestHasRestMetafields';
import { GraphQlResourceName } from '../types/GraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../types/RestResource.types';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';

// #endregion

// #region Types
interface FindArgs extends BaseContext {
  id: number | string;
  blog_id?: number | string | null;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
  blog_id?: number | string | null;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  blog_id?: number | string | null;
  limit?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  published_at_min?: unknown;
  published_at_max?: unknown;
  published_status?: string;
  handle?: unknown;
  tag?: unknown;
  author?: unknown;
  fields?: unknown;
}

// #endregion

export class Article extends AbstractResource_Synced_HasMetafields {
  public apiData: RestApiDataWithMetafields & {
    author: string | null;
    blog_id: number | null;
    body_html: string | null;
    created_at: string | null;
    handle: string | null;
    id: number | null;
    admin_graphql_api_id: string | null;
    image: {
      src?: string;
      alt?: string;
    } | null;
    published: boolean | null;
    published_at: string | null;
    summary_html: string | null;
    tags: string | null;
    template_suffix: string | null;
    title: string | null;
    updated_at: string | null;
    user_id: number | null;
  };

  static readonly displayName = 'Article' as ResourceDisplayName;
  protected static graphQlName = GraphQlResourceName.OnlineStoreArticle;
  static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = 'article';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Article;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'articles/<id>.json' },
    { http_method: 'get', operation: 'get', ids: ['blog_id'], path: 'blogs/<blog_id>/articles.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'articles.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'articles/<id>.json' },
    { http_method: 'post', operation: 'post', ids: ['blog_id'], path: 'blogs/<blog_id>/articles.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'articles/<id>.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Article,
      plural: RestResourcePlural.Article,
    },
  ];

  public static getStaticSchema() {
    return ArticleSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Articles>;
    let augmentedSchema = deepCopy(this.getStaticSchema());
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
  }: MakeSyncFunctionArgs<Article, typeof Sync_Articles, SyncTableRestHasRestMetafields<Article>>): SyncFunction {
    const [syncMetafields, restrictToBlogIds, author, createdAt, updatedAt, publishedAt, handle, publishedStatus, tag] =
      codaSyncParams;

    let blogIdsLeft: number[] = [];
    if (syncTableManager.prevContinuation) {
      blogIdsLeft = syncTableManager.prevContinuation.extraContinuationData?.blogIdsLeft ?? [];
    }
    // Should trigger only on first run when user
    // has specified the blogs he wants to sync articles from
    else if (restrictToBlogIds && restrictToBlogIds.length) {
      blogIdsLeft = restrictToBlogIds.map(parseOptionId);
    }

    const currentBlogId = blogIdsLeft.shift() ?? null;
    if (blogIdsLeft.length) {
      syncTableManager.extraContinuationData = { blogIdsLeft };
    }

    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,
        blog_id: currentBlogId,
        fields: syncTableManager.getSyncedStandardFields(articleFieldDependencies).join(','),
        limit: adjustLimit ?? syncTableManager.shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
        author,
        tag,
        handle,
        published_status: publishedStatus,
        created_at_min: createdAt ? createdAt[0] : undefined,
        created_at_max: createdAt ? createdAt[1] : undefined,
        updated_at_min: updatedAt ? updatedAt[0] : undefined,
        updated_at_max: updatedAt ? updatedAt[1] : undefined,
        published_at_min: publishedAt ? publishedAt[0] : undefined,
        published_at_max: publishedAt ? publishedAt[1] : undefined,

        ...nextPageQuery,
      });
  }

  public static async find({ id, blog_id = null, fields = null, context, options }: FindArgs): Promise<Article | null> {
    const result = await this.baseFind<Article>({
      urlIds: { id, blog_id },
      params: { fields },
      context,
      options,
    });

    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, blog_id = null, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Article>({
      urlIds: { id, blog_id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    blog_id = null,
    limit = null,
    since_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    published_at_min = null,
    published_at_max = null,
    published_status = null,
    handle = null,
    tag = null,
    author = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Article>> {
    const response = await this.baseFind<Article>({
      context,
      urlIds: { blog_id: blog_id },
      params: {
        limit,
        since_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        published_at_min,
        published_at_max,
        published_status,
        handle,
        tag,
        author,
        fields,
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

  protected formatToApi({ row, metafields = [] }: FromRow<ArticleRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id', 'author', 'blog_id', 'body_html', 'handle', 'published',
      'published_at', 'summary_html', 'template_suffix', 'tags', 'title',
    ];
    oneToOneMappingKeys.forEach((key) => {
      if (row[key] !== undefined) apiData[key] = row[key];
    });

    if (row.image_alt_text !== undefined || row.image_url !== undefined) {
      apiData.image = {};
      if (row.image_alt_text !== undefined) apiData.image.alt = row.image_alt_text;
      if (row.image_url !== undefined) apiData.image.src = row.image_url;
    }

    if (metafields.length) {
      apiData.metafields = metafields;
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): ArticleRow {
    const { apiData } = this;
    let obj: ArticleRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/articles/${apiData.id}`,
      body: striptags(apiData.body_html),
      published: !!apiData.published_at,
      summary: striptags(apiData.summary_html),
    };

    if (apiData.blog_id) {
      obj.blog = formatBlogReference(apiData.blog_id);
    }

    if (apiData.image) {
      obj.image_alt_text = apiData.image.alt;
      obj.image_url = apiData.image.src;
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
