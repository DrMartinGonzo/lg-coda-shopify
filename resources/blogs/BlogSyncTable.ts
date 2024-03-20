import * as coda from '@codahq/packs-sdk';

import { SyncTableRest } from '../../Fetchers/SyncTableRest';
import { cleanQueryParams } from '../../helpers-rest';
import { augmentSchemaWithMetafields } from '../../schemas/schema-helpers';
import { blogFieldDependencies } from '../../schemas/syncTable/BlogSchema';
import { handleFieldDependencies } from '../../utils/helpers';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { BlogRestFetcher } from './BlogRestFetcher';
import { Blog, blogResource } from './blogResource';

// #endregion

// #region Class
export class BlogSyncTable extends SyncTableRest<Blog> {
  constructor(fetcher: BlogRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(blogResource, fetcher, params);
  }

  static dynamicOptions: coda.DynamicOptions = {
    getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
      let { schema, metafields } = blogResource;
      let augmentedSchema = schema;
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
        return getTemplateSuffixesFor('blog', context);
      }
    },
  };

  setSyncParams() {
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, blogFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
    });
  }
}
