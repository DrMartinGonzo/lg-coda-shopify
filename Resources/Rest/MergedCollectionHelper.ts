// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Collections } from '../../coda/setup/collections-setup';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy, excludeObjectKeys } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { FromRow } from '../types/Resource.types';
import { MergedCollection } from './MergedCollection';
import { SmartCollectionRule } from './SmartCollection';

// #endregion

/**
 * Helper class to avoid circular dependencies
 */
export class MergedCollectionHelper {
  public static getStaticSchema() {
    return CollectionSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Collections>;
    let augmentedSchema = deepCopy(CollectionSyncTableSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(
        CollectionSyncTableSchema,
        MetafieldOwnerType.Collection,
        context
      );
    }
    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static formatToApi({ row, metafields }: FromRow<CollectionRow>) {
    let apiData: Partial<MergedCollection['apiData']> = {
      body_html: row.body_html,
      disjunctive: row.disjunctive,
      handle: row.handle,
      id: row.id,
      image: {
        src: row.image_url,
        alt: row.image_alt_text,
      },
      published: row.published,
      published_at: row.published_at ? row.published_at.toString() : undefined,
      published_scope: row.published_scope,
      rules: row.rules as SmartCollectionRule[],
      sort_order: row.sort_order,
      template_suffix: row.template_suffix,
      title: row.title,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,

      metafields,
    };

    return apiData;
  }

  public static formatToRow(context: coda.ExecutionContext, apiData: MergedCollection['apiData']): CollectionRow {
    let obj: CollectionRow = {
      ...excludeObjectKeys(apiData, ['metafields']),
      admin_url: `${context.endpoint}/admin/collections/${apiData.id}`,
      body: striptags(apiData.body_html),
      published: !!apiData.published_at,
      disjunctive: apiData.disjunctive ?? false,
    };

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
