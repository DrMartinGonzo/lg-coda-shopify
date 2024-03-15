// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_LIMIT } from '../constants';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { RestResourcePlural } from '../typesNew/ShopifyRestResourceTypes';
import { formatBlogReference } from '../schemas/syncTable/BlogSchema';
import { cleanQueryParams, getRestBaseUrl } from '../helpers-rest';
import { articleFieldDependencies } from '../schemas/syncTable/ArticleSchema';
import { handleFieldDependencies, parseOptionId } from '../helpers';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';
import { SimpleRestNew } from '../Fetchers/SimpleRest';

import type { Article } from '../typesNew/Resources/Article';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { Sync_Articles } from './articles-setup';
import type { MultipleFetchResponse, SyncTableParamValues } from '../Fetchers/SyncTableRest';
import type { SyncTableType } from '../types/SyncTable';
import { articleResource } from '../allResources';

export type ArticleSyncTableType = SyncTableType<
  typeof articleResource,
  Article.Row,
  Article.Params.Sync,
  Article.Params.Create,
  Article.Params.Update
>;

export class ArticleSyncTable extends SyncTableRestNew<ArticleSyncTableType> {
  blogIdsLeft: number[];
  currentBlogId: number;

  constructor(fetcher: ArticleRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(articleResource, fetcher, params);
  }

  setSyncParams() {
    const [syncMetafields, restrictToBlogIds, author, createdAt, updatedAt, publishedAt, handle, publishedStatus, tag] =
      this.codaParams as SyncTableParamValues<typeof Sync_Articles>;

    this.blogIdsLeft = this.prevContinuation?.extraContinuationData?.blogIdsLeft ?? [];
    // Should trigger only on first run when user has specified the blogs he
    // wants to sync articles from
    if (!this.blogIdsLeft.length && restrictToBlogIds && restrictToBlogIds.length) {
      this.blogIdsLeft = restrictToBlogIds.map(parseOptionId);
    }
    if (this.blogIdsLeft.length) {
      this.currentBlogId = this.blogIdsLeft.shift();
    }

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, articleFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
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
    });
  }

  setSyncUrl() {
    super.setSyncUrl();

    // User has specified the blogs he wants to sync articles from
    if (this.currentBlogId !== undefined) {
      this.syncUrl = coda.withQueryParams(
        coda.joinUrl(
          getRestBaseUrl(this.fetcher.context),
          `${RestResourcePlural.Blog}/${this.currentBlogId}/${this.fetcher.plural}.json`
        ),
        this.syncParams
      );
    }
  }

  afterSync(response: MultipleFetchResponse<ArticleSyncTableType>) {
    this.extraContinuationData = { blogIdsLeft: this.blogIdsLeft };
    let { restItems, continuation } = super.afterSync(response);
    // If we still have blogs left to fetch articles from, we create a
    // continuation object to force the next sync
    if (this.blogIdsLeft && this.blogIdsLeft.length && !continuation?.nextUrl) {
      // @ts-ignore
      continuation = {
        ...(continuation ?? {}),
        extraContinuationData: this.extraContinuationData,
      };
    }
    return { restItems, continuation };
  }
}

export class ArticleRestFetcher extends SimpleRestNew<ArticleSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(articleResource, context);
  }

  getFetchAllFromBlogUrl = (blogId: number, params: Article.Params.Sync) => {
    return coda.withQueryParams(
      coda.joinUrl(getRestBaseUrl(this.context), `${RestResourcePlural.Blog}/${blogId}/${this.plural}.json`),
      cleanQueryParams(params)
    );
  };

  validateParams = (params: Article.Params.Sync | Article.Params.Create | Article.Params.Update) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Article.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Article.Params.Update | Article.Params.Create | undefined => {
    let restParams: Article.Params.Update | Article.Params.Create = {};

    if (row.author !== undefined) restParams.author = row.author;
    if (row.blog !== undefined) restParams.blog_id = row.blog.id;
    if (row.blog_id !== undefined) restParams.blog_id = row.blog_id;
    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.image_alt_text !== undefined || row.image_url !== undefined) {
      restParams.image = {};
      if (row.image_alt_text !== undefined) restParams.image.alt = row.image_alt_text;
      if (row.image_url !== undefined) restParams.image.src = row.image_url;
    }
    if (row.published !== undefined) restParams.published = row.published;
    if (row.published_at !== undefined) restParams.published_at = row.published_at;
    if (row.summary_html !== undefined) restParams.summary_html = row.summary_html;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;
    if (row.tags !== undefined) restParams.tags = row.tags;
    if (row.title !== undefined) restParams.title = row.title;

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Article.Params.Create;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (article) => {
    let obj: Article.Row = {
      ...article,
      body: striptags(article.body_html),
      summary: striptags(article.summary_html),
      admin_url: `${this.context.endpoint}/admin/articles/${article.id}`,
      published: !!article.published_at,
    };

    if (article.blog_id) {
      obj.blog = formatBlogReference(article.blog_id);
    }

    if (article.image) {
      obj.image_alt_text = article.image.alt;
      obj.image_url = article.image.src;
    }

    return obj;
  };
}
// #endregion
