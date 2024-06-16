// #region Imports

import { ListArticlesArgs } from '../../Clients/RestClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/sync-utils';
import { Sync_Articles } from '../../coda/setup/articles-setup';
import { ArticleModel } from '../../models/rest/ArticleModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { ArticleSyncTableSchema } from '../../schemas/syncTable/ArticleSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  arrayUnique,
  dateRangeMax,
  dateRangeMin,
  deepCopy,
  parseOptionId,
  splitAndTrimValues,
} from '../../utils/helpers';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedArticles extends AbstractSyncedRestResources<ArticleModel> {
  private currentBlogId: number | null;
  private blogIdsLeft: number[];

  public static schemaDependencies: FieldDependency<typeof ArticleSyncTableSchema.properties>[] = [
    {
      field: 'summary_html',
      dependencies: ['summary'],
    },
    {
      field: 'body_html',
      dependencies: ['body'],
    },
    {
      field: 'blog_id',
      dependencies: ['blog'],
    },
    {
      field: 'id',
      dependencies: ['blog', 'admin_url'],
    },
    {
      field: 'published_at',
      dependencies: ['published'],
    },
    {
      field: 'image',
      dependencies: ['image_url', 'image_alt_text'],
    },
  ];

  public static staticSchema = ArticleSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Articles>;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Article, context);
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [
      syncMetafields,
      restrictToBlogIds,
      author,
      createdAt,
      updatedAt,
      publishedAt,
      handle,
      published_status,
      tags,
    ] = this.codaParams as CodaSyncParams<typeof Sync_Articles>;
    return {
      syncMetafields,
      restrictToBlogIds,
      author,
      createdAt,
      updatedAt,
      publishedAt,
      handle,
      published_status,
      tags,
    };
  }

  private getCurrentAndRemainingBlogIds(restrictToBlogIds: string[]) {
    let blogIdsLeft: number[] = [];
    if (this.prevContinuation?.extraData?.blogIdsLeft) {
      blogIdsLeft = parseContinuationProperty(this.prevContinuation.extraData.blogIdsLeft);
    }

    // Should trigger only on first run when user
    // has specified the blogs he wants to sync articles from
    else if (restrictToBlogIds && restrictToBlogIds.length) {
      blogIdsLeft = restrictToBlogIds.map(parseOptionId);
    }

    const currentBlogId = blogIdsLeft.shift() ?? null;
    return {
      currentBlogId,
      blogIdsLeft,
    };
  }

  protected async beforeSync(): Promise<void> {
    const { currentBlogId, blogIdsLeft } = this.getCurrentAndRemainingBlogIds(this.codaParamsMap.restrictToBlogIds);
    this.currentBlogId = currentBlogId;
    this.blogIdsLeft = blogIdsLeft;
  }

  protected async afterSync(): Promise<void> {
    const { tags: tagsFilter } = this.codaParamsMap;
    // The api only supports filtering by a single tag, so we retrieve all and filter after
    if (tagsFilter && tagsFilter.length) {
      this.models = this.models.filter((d) => {
        const restTagsArray = splitAndTrimValues(d.data?.tags ?? '');
        return restTagsArray.length && restTagsArray.some((t) => tagsFilter.includes(t));
      });
    }

    if (this.blogIdsLeft.length) {
      // Force set continuation to trigger next sync with remaining blogs
      this.continuation = {
        skipNextRestSync: 'false',
        extraData: { blogIdsLeft: stringifyContinuationProperty(this.blogIdsLeft) },
      };
    }
  }

  protected get syncedStandardFields(): string[] {
    // Add required fields needed for certain filters
    if (this.codaParamsMap.tags) return arrayUnique([...super.syncedStandardFields, 'tags']);
    return super.syncedStandardFields;
  }

  protected codaParamsToListArgs(): Omit<ListArticlesArgs, 'limit' | 'options'> {
    const { author, createdAt, handle, publishedAt, published_status, tags, updatedAt } = this.codaParamsMap;
    return {
      blog_id: this.currentBlogId,
      fields: this.syncedStandardFields.join(','),
      author,
      tags,
      handle,
      published_status,
      created_at_min: dateRangeMin(createdAt),
      created_at_max: dateRangeMax(createdAt),
      updated_at_min: dateRangeMin(updatedAt),
      updated_at_max: dateRangeMax(updatedAt),
      published_at_min: dateRangeMin(publishedAt),
      published_at_max: dateRangeMax(publishedAt),
    };
  }
}
