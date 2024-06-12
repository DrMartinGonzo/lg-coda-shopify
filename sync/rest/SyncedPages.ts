// #region Imports

import { ListPagesArgs } from '../../Clients/RestApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Pages } from '../../coda/setup/pages-setup';
import { PageModel } from '../../models/rest/PageModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { PageSyncTableSchema } from '../../schemas/syncTable/PageSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedPages extends AbstractSyncedRestResources<PageModel> {
  public static schemaDependencies: FieldDependency<typeof PageSyncTableSchema.properties>[] = [
    {
      field: 'body_html',
      dependencies: ['body'],
    },
    {
      field: 'id',
      dependencies: ['graphql_gid', 'admin_url'],
    },
    {
      field: 'published_at',
      dependencies: ['published', 'store_url'],
    },
    {
      field: 'handle',
      dependencies: ['store_url'],
    },
  ];

  public static staticSchema = PageSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Pages>;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Page, context);
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [syncMetafields, createdAtRange, updatedAtRange, publishedAtRange, handle, publishedStatus, sinceId, title] =
      this.codaParams as CodaSyncParams<typeof Sync_Pages>;
    return {
      syncMetafields,
      createdAtRange,
      updatedAtRange,
      publishedAtRange,
      handle,
      publishedStatus,
      sinceId,
      title,
    };
  }

  protected codaParamsToListArgs(): Omit<ListPagesArgs, 'limit' | 'options'> {
    const { handle, title, publishedStatus, sinceId, createdAtRange, updatedAtRange, publishedAtRange } =
      this.codaParamsMap;
    return {
      fields: this.syncedStandardFields.join(','),
      created_at_min: dateRangeMin(createdAtRange),
      created_at_max: dateRangeMax(createdAtRange),
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      published_at_min: dateRangeMin(publishedAtRange),
      published_at_max: dateRangeMax(publishedAtRange),
      handle,
      published_status: publishedStatus,
      since_id: sinceId,
      title,
    };
  }
}
