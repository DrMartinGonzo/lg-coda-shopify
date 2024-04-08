// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART, OPTIONS_PUBLISHED_STATUS } from '../../../../constants';
import { GraphQlResourceName } from '../../../../resources/ShopifyResource.types';
import { Sync_Collections } from '../../../../resources/collections/collections-coda';
import { CollectionRow } from '../../../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../../../schemas/schema-helpers';
import { CollectionSyncTableSchema } from '../../../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../../../types/admin.types';
import { deepCopy, filterObjectKeys } from '../../../../utils/helpers';
import { SyncTableSyncResult } from '../../../SyncTable/SyncTable.types';
import { CodaSyncParams, FromRow, GetSchemaArgs } from '../../AbstractResource_Synced';
import { ApiDataWithMetafields } from '../../AbstractResource_Synced_HasMetafields';
import { AbstractResource_Synced_HasMetafields_GraphQl } from '../../AbstractResource_Synced_HasMetafields_GraphQl';
import { Metafield, RestMetafieldOwnerType } from '../Metafield';

// #endregion

export abstract class MergedCollection extends AbstractResource_Synced_HasMetafields_GraphQl {
  public apiData: ApiDataWithMetafields & {
    // Collection —————————————————————————————————————————————————————————————————————————————————
    title: string | null;
    body_html: string | null;
    handle: string | null;
    id: number | null;
    images: any[] | null | { [key: string]: any };
    // image: Image | null | { [key: string]: any };
    published_at: string | null;
    published_scope: string | null;
    sort_order: string | null;
    template_suffix: string | null;
    updated_at: string | null;
  } & {
    // SmartCollection ————————————————————————————————————————————————————————————————————————————
    rules: Array<{ column: string; relation: string; condition: string }> | null;
    // rules: { [key: string]: unknown } | { [key: string]: unknown }[] | null;
    title: string | null;
    body_html: string | null;
    disjunctive: boolean | null;
    handle: string | null;
    id: number | null;
    image: string | { [key: string]: unknown } | null;
    published_at: string | null;
    published_scope: string | null;
    sort_order: string | null;
    template_suffix: string | null;
    updated_at: string | null;
  } & {
    // CustomCollection ———————————————————————————————————————————————————————————————————————————
    title: string | null;
    body_html: string | null;
    handle: string | null;
    id: number | null;
    image: {
      src?: string;
      alt?: string;
    } | null;
    // image: string | { [key: string]: unknown } | null;
    published: boolean | null;
    published_at: string | null;
    published_scope: string | null;
    sort_order: string | null;
    template_suffix: string | null;
    updated_at: string | null;
  };

  // public apiData: ApiDataWithMetafields & {
  //   title: string | null;
  //   body_html: string | null;
  //   handle: string | null;
  //   id: number | null;
  //   // image: string | { [key: string]: unknown } | null;
  //   image: {
  //     src?: string;
  //     alt?: string;
  //   } | null;
  //   published: boolean | null;
  //   published_at: string | null;
  //   published_scope: string | null;
  //   sort_order: string | null;
  //   template_suffix: string | null;
  //   updated_at: string | null;
  // };

  protected static graphQlName = GraphQlResourceName.Collection;
  static readonly metafieldRestOwnerType: RestMetafieldOwnerType = 'collection';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;
  static readonly supportsDefinitions = true;

  public static getStaticSchema() {
    return CollectionSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Collections>;
    let augmentedSchema = deepCopy(CollectionSyncTableSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(
        CollectionSyncTableSchema,
        this.metafieldGraphQlOwnerType,
        context
      );
    }
    // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static async sync(
    codaSyncParams: CodaSyncParams<any>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(
      context,
      codaSyncParams as CodaSyncParams<typeof Sync_Collections>
    );
    const syncFunction = this.makeSyncFunction({
      codaSyncParams: codaSyncParams as CodaSyncParams<typeof Sync_Collections>,
      context,
      syncTableManager,
    });

    let { response, continuation } = await syncTableManager.executeSync({ sync: syncFunction });
    // console.log('response', response);

    const restType = syncTableManager.prevContinuation?.extraContinuationData?.restType ?? COLLECTION_TYPE__CUSTOM;

    if (!response.pageInfo?.nextPage && restType === COLLECTION_TYPE__CUSTOM) {
      continuation = {
        // ...continuation,
        extraContinuationData: {
          restType: COLLECTION_TYPE__SMART,
        },
      };
    }

    return {
      // result: response.data.map((data) => new MergedCollection({ context, fromData: data.apiData }).formatToRow()),
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO: Add validation
  validateParams = (
    // TODO: fix params
    params: any
  ) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
    }

    // TODO implement this for update jobs
    //  if (
    //    !isNullOrEmpty(update.newValue.image_alt_text) &&
    //    (isNullOrEmpty(update.newValue.image_url) || isNullOrEmpty(update.previousValue.image_url))
    //  ) {
    //    throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
    //  }
    return true;
  };

  protected formatToApi({ row, metafields = [] }: FromRow<CollectionRow>) {
    let apiData: Partial<typeof this.apiData> = {};

    // prettier-ignore
    const oneToOneMappingKeys = [
      'id', 'body_html', 'handle', 'published', 'template_suffix', 'title',
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
      apiData.metafields = metafields.map((m) => {
        m.apiData.owner_id = row.id;
        m.apiData.owner_resource = 'collection';
        return m;
      });
    }

    // TODO: not sure we need to keep this
    // Means we have nothing to update/create
    if (Object.keys(apiData).length === 0) return undefined;
    return apiData;
  }

  public formatToRow(): CollectionRow {
    const { apiData } = this;
    let obj: CollectionRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin/collections/${apiData.id}`,
      body: striptags(apiData.body_html),
      published: !!apiData.published_at,
      disjunctive: apiData.disjunctive ?? false,
      published_at: new Date(apiData.published_at),
      updated_at: new Date(apiData.updated_at),
    };

    // console.log('apiData', apiData);
    if (apiData.image) {
      obj.image_alt_text = apiData.image.alt;
      obj.image_url = apiData.image.src;
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForRow();
      });
    }

    return obj;
  }
}
