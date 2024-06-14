// #region Imports

import { ListBlogsArgs } from '../../Clients/RestClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Blogs } from '../../coda/setup/blogs-setup';
import { BlogModel } from '../../models/rest/BlogModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { BlogSyncTableSchema } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedBlogs extends AbstractSyncedRestResources<BlogModel> {
  public static schemaDependencies: FieldDependency<typeof BlogSyncTableSchema.properties>[] = [
    {
      field: 'id',
      dependencies: ['graphql_gid', 'admin_url'],
    },
  ];

  public static staticSchema = BlogSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Blogs>;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Blog, context);
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [syncMetafields] = this.codaParams as CodaSyncParams<typeof Sync_Blogs>;
    return { syncMetafields };
  }

  protected codaParamsToListArgs(): Omit<ListBlogsArgs, 'limit' | 'options'> {
    return { fields: this.syncedStandardFields.join(',') };
  }
}
