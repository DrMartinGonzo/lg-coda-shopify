// #region Imports
import striptags from 'striptags';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Articles } from '../../coda/setup/articles-setup';
import { Identity, OPTIONS_PUBLISHED_STATUS, PACK_IDENTITIES } from '../../constants';
import { ArticleRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ArticleSyncTableSchema, articleFieldDependencies } from '../../schemas/syncTable/ArticleSchema';
import { formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, excludeObjectKeys, isNullishOrEmpty, parseOptionId } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithRestMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { SupportedMetafieldOwnerResource } from './Metafield';

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

export class Article extends AbstractRestResourceWithRestMetafields {
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

  public static readonly displayName: Identity = PACK_IDENTITIES.Article;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Article;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Article;

  protected static readonly graphQlName = GraphQlResourceNames.Article;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'articles/<id>.json' },
    { http_method: 'get', operation: 'get', ids: ['blog_id'], path: 'blogs/<blog_id>/articles.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'articles.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'articles/<id>.json' },
    { http_method: 'post', operation: 'post', ids: ['blog_id'], path: 'blogs/<blog_id>/articles.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'articles/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Article,
      plural: RestResourcesPlural.Article,
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
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_Articles,
    SyncTableManagerRestWithMetafieldsType<Article>
  >): SyncRestFunction<Article> {
    const [syncMetafields, restrictToBlogIds, author, createdAt, updatedAt, publishedAt, handle, publishedStatus, tag] =
      codaSyncParams;

    let blogIdsLeft: number[] = [];
    if (syncTableManager.prevContinuation) {
      blogIdsLeft = syncTableManager.prevContinuation.extraData?.blogIdsLeft ?? [];
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

    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit: syncTableManager.shouldSyncMetafields ? 30 : limit,
        firstPageParams: {
          blog_id: currentBlogId,
          fields: syncTableManager.getSyncedStandardFields(articleFieldDependencies).join(','),
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
        },
      });

      return this.all(params);
    };
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
  }: AllArgs): Promise<FindAllRestResponse<Article>> {
    const response = await this.baseFind<Article>({
      context,
      urlIds: { blog_id },
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

  protected static validateParams(params: AllArgs) {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((s) => s.value);
    if (!isNullishOrEmpty(params.published_status) && !validPublishedStatuses.includes(params.published_status)) {
      throw new InvalidValueVisibleError('published_status: ' + params.published_status);
    }
    return super.validateParams(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi({ row, metafields }: FromRow<ArticleRow>) {
    let apiData: Partial<typeof this.apiData> = {
      admin_graphql_api_id: row.admin_graphql_api_id,
      author: row.author,
      blog_id: row.blog_id,
      body_html: row.body_html,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      handle: row.handle,
      id: row.id,
      image: {
        alt: row.image_alt_text,
        src: row.image_url,
      },
      published_at: row.published_at ? row.published_at.toString() : undefined,
      published: row.published,
      summary_html: row.summary_html,
      tags: row.tags,
      template_suffix: row.template_suffix,
      title: row.title,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
      user_id: row.user_id,

      metafields: metafields,
    };
    return apiData;
  }

  public formatToRow(): ArticleRow {
    const { apiData } = this;
    let obj: ArticleRow = {
      ...excludeObjectKeys(apiData, ['metafields']),
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
      apiData.metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
