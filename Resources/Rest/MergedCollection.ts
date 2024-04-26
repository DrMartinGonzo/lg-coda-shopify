// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import {
  CodaSyncParams,
  SyncTableMixedContinuation,
  SyncTableSyncResult,
  SyncTableUpdateResult,
} from '../../SyncTableManager/types/SyncTable.types';
import { Sync_Collections } from '../../coda/setup/collections-setup';
import { Identity, OPTIONS_PUBLISHED_STATUS, PACK_IDENTITIES } from '../../constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { getCollectionType, getCollectionTypes } from '../../utils/collections-utils';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { deepCopy, filterObjectKeys } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { SaveArgs } from '../Abstract/Rest/AbstractRestResource';
import { AbstractRestResourceWithGraphQLMetafields } from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourceSingular, RestResourcesSingular } from '../types/SupportedResource';
import { hasMetafieldsInUpdate } from '../utils/abstractResource-utils';
import { CustomCollection, CustomCollectionData } from './CustomCollection';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';
import { SmartCollection, SmartCollectionData } from './SmartCollection';

// #endregion

// #region Types
interface FindArgs extends BaseContext {
  id: number;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number;
}
interface GetCollectionClassFromIdArgs {
  id: number;
  context: coda.ExecutionContext;
}
interface ParseCollectionClassesFromUpdatesArgs {
  updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>;
  context: coda.ExecutionContext;
}
// #endregion

/**
 * A special class responsible for handling both the `custom` and `smart`
 * collections as a single resource in Coda
 */
export class MergedCollection extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: CustomCollectionData & SmartCollectionData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Collection;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;

  protected static readonly graphQlName = GraphQlResourceNames.Collection;

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

  public static async getCollectionClassFromId({
    id,
    context,
  }: GetCollectionClassFromIdArgs): Promise<typeof CustomCollection | typeof SmartCollection> {
    const collectionType = await getCollectionType(idToGraphQlGid(GraphQlResourceNames.Collection, id), context);
    return collectionType === RestResourcesSingular.SmartCollection ? SmartCollection : CustomCollection;
  }

  public static async parseCollectionClassesFromUpdates({ updates, context }: ParseCollectionClassesFromUpdatesArgs) {
    const gids = updates.map(({ previousValue }) =>
      idToGraphQlGid(GraphQlResourceNames.Collection, previousValue.id as number)
    );
    const collectionTypes = await getCollectionTypes(gids, context);
    const filterUpdatesByType = (type: string) => {
      const typeIds = collectionTypes.filter(({ type: t }) => t === type).map(({ id }) => graphQlGidToId(id));
      return updates.filter(({ previousValue }) => typeIds.includes(previousValue.id as number));
    };

    return {
      customCollectionsUpdates: filterUpdatesByType(RestResourcesSingular.CustomCollection),
      smartCollectionsUpdates: filterUpdatesByType(RestResourcesSingular.SmartCollection),
    };
  }

  public static async sync(
    codaSyncParams: CodaSyncParams<any>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const { CustomCollection: singularCustom, SmartCollection: singularSmart } = RestResourcesSingular;

    const currResourceName: RestResourceSingular =
      (context.sync?.continuation as SyncTableMixedContinuation<CollectionRow>)?.extraData?.currResourceName ??
      singularCustom;
    const CurrResource = currResourceName === singularCustom ? CustomCollection : SmartCollection;

    let { result, continuation } = await CurrResource.sync(
      codaSyncParams as CodaSyncParams<typeof Sync_Collections>,
      context
    );

    if (!continuation && currResourceName === singularCustom) {
      continuation = {
        extraData: {
          currResourceName: singularSmart,
        },
      };
    }

    return {
      result,
      continuation,
    };
  }

  public static async syncUpdate(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableUpdateResult> {
    // Warm up metafield definitions cache
    if (updates.map(hasMetafieldsInUpdate).some(Boolean)) {
      await this.getMetafieldDefinitions(context);
    }

    const { customCollectionsUpdates, smartCollectionsUpdates } = await this.parseCollectionClassesFromUpdates({
      updates,
      context,
    });

    const syncUpdateJobs = [
      customCollectionsUpdates.length
        ? CustomCollection.syncUpdate(codaSyncParams, customCollectionsUpdates, context)
        : undefined,
      smartCollectionsUpdates.length
        ? SmartCollection.syncUpdate(codaSyncParams, smartCollectionsUpdates, context)
        : undefined,
    ].filter(Boolean);

    const results = await Promise.all(syncUpdateJobs);
    return {
      result: results.flatMap((r) => r.result),
    };
  }

  public static async find({ id, context, ...otherArgs }: FindArgs): Promise<MergedCollection | null> {
    const CurrResource = await this.getCollectionClassFromId({ id, context });
    return CurrResource.find({ context, id, ...otherArgs });
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const CurrResource = await this.getCollectionClassFromId({ id, context });
    return CurrResource.delete({ context, id });
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async save({ update = false }: SaveArgs = {}): Promise<void> {
    const staticResource = this.resource<typeof MergedCollection>();
    const CurrResource = await staticResource.getCollectionClassFromId({ id: this.apiData.id, context: this.context });
    return new CurrResource({ context: this.context, fromData: this.apiData }).save({ update });
  }

  public async delete(): Promise<void> {
    const staticResource = this.resource<typeof MergedCollection>();
    const CurrResource = await staticResource.getCollectionClassFromId({ id: this.apiData.id, context: this.context });
    await CurrResource.request({
      http_method: 'delete',
      operation: 'delete',
      context: this.context,
      urlIds: {},
      entity: this,
    });
  }

  public formatToApi({ row, metafields = [] }: FromRow<CollectionRow>) {
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
      apiData.metafields = metafields;
    }

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
    };

    if (apiData.image) {
      obj.image_alt_text = apiData.image.alt;
      obj.image_url = apiData.image.src;
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
