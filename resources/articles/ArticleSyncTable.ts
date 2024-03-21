import * as coda from '@codahq/packs-sdk';

import { RestResourcePlural } from '../../Fetchers/ShopifyRestResource.types';
import { MultipleFetchResponse, SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { REST_DEFAULT_LIMIT } from '../../constants';
import { cleanQueryParams, getRestBaseUrl } from '../../helpers-rest';
import { augmentSchemaWithMetafields } from '../../schemas/schema-helpers';
import { articleFieldDependencies } from '../../schemas/syncTable/ArticleSchema';
import { deepCopy, handleFieldDependencies, parseOptionId } from '../../utils/helpers';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { ArticleRestFetcher } from './ArticleRestFetcher';
import { Article, articleResource } from './articleResource';
import { Sync_Articles } from './articles-coda';

export class ArticleSyncTable extends SyncTableRest<Article> {
  blogIdsLeft: number[];
  currentBlogId: number;

  constructor(fetcher: ArticleRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(articleResource, fetcher, params);
  }

  static dynamicOptions: coda.DynamicOptions = {
    getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
      let { schema, metafields } = articleResource;
      let augmentedSchema = deepCopy(schema);
      if (formulaContext.syncMetafields) {
        augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, metafields.ownerType, context);
      }
      // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
      augmentedSchema.featuredProperties.push('admin_url');
      return augmentedSchema;
    },
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor('article', context);
      }
    },
  };

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

  afterSync(response: MultipleFetchResponse<Article>) {
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
