import * as coda from '@codahq/packs-sdk';

import { deepCopy, handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { augmentSchemaWithMetafields } from '../../schemas/schema-helpers';
import { collectionFieldDependencies } from '../../schemas/syncTable/CollectionSchema';
import { getTemplateSuffixesFor } from '../themes/themes-functions';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { collectionResource } from './collectionResource';
import { Sync_Collections } from './collections-coda';
import { CustomCollection } from './custom_collection/customCollectionResource';
import { SmartCollection } from './smart_collection/smartCollectionResource';

export class CollectionSyncTableBase<T extends CustomCollection | SmartCollection> extends SyncTableRest<T> {
  static dynamicOptions: coda.DynamicOptions = {
    getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
      let { schema, metafields } = collectionResource;
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
        return getTemplateSuffixesFor('collection', context);
      }
    },
  };

  setSyncParams() {
    const [syncMetafields, created_at, updated_at, published_at, handle, ids, product_id, published_status, title] =
      this.codaParams as SyncTableParamValues<typeof Sync_Collections>;
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, collectionFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      handle,
      product_id,
      title,
      published_status,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      published_at_min: published_at ? published_at[0] : undefined,
      published_at_max: published_at ? published_at[1] : undefined,
    });
  }
}
