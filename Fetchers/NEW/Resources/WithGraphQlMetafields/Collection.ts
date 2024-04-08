// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { OPTIONS_PUBLISHED_STATUS } from '../../../../constants';
import { GraphQlResourceName } from '../../../../resources/ShopifyResource.types';
import { Sync_Collections } from '../../../../resources/collections/collections-coda';
import { CollectionRow } from '../../../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../../../schemas/schema-helpers';
import { CollectionSyncTableSchema } from '../../../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../../../types/admin.types';
import { deepCopy, filterObjectKeys } from '../../../../utils/helpers';
import { BaseContext } from '../../AbstractResource';
import { CodaSyncParams, FromRow, GetSchemaArgs } from '../../AbstractResource_Synced';
import { ApiDataWithMetafields } from '../../AbstractResource_Synced_HasMetafields';
import { AbstractResource_Synced_HasMetafields_GraphQl } from '../../AbstractResource_Synced_HasMetafields_GraphQl';
import { RestMetafieldOwnerType } from '../Metafield';

// #endregion

interface FindArgs extends BaseContext {
  id: number | string;
  fields?: unknown;
}
interface ProductsArgs extends BaseContext {
  [key: string]: unknown;
  id: number | string;
  limit?: unknown;
}

export class Collection extends AbstractResource_Synced_HasMetafields_GraphQl {
  public apiData: ApiDataWithMetafields & {
    title: string | null;
    body_html: string | null;
    handle: string | null;
    id: number | null;
    // image: Image | null | { [key: string]: any };
    images: any[] | null | { [key: string]: any };
    published_at: string | null;
    published_scope: string | null;
    sort_order: string | null;
    template_suffix: string | null;
    updated_at: string | null;
  };

  protected static graphQlName = GraphQlResourceName.Collection;
  static readonly metafieldRestOwnerType: RestMetafieldOwnerType = 'collection';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'collections/<id>.json' },
    { http_method: 'get', operation: 'products', ids: ['id'], path: 'collections/<id>/products.json' },
  ];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: 'collection',
      plural: 'collections',
    },
  ];

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

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<Collection | null> {
    const result = await this.baseFind<Collection>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  // TODO: keep this ?
  public static async products({ context, id, limit = null, options, ...otherArgs }: ProductsArgs): Promise<unknown> {
    const response = await this.request<Collection>({
      http_method: 'get',
      operation: 'products',
      context: context,
      urlIds: { id: id },
      params: { limit: limit, ...otherArgs },
      body: {},
      entity: null,
      options,
    });

    return response ? response.body : null;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  // TODO: Add validation
  validateParams = (
    // TODO: fix params
    params:
      | Collection['rest']['params']['sync']
      | Collection['rest']['params']['create']
      | Collection['rest']['params']['update']
  ) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
    }
    return true;
  };

  protected formatToApi({ row, metafields = [] }: FromRow<CollectionRow>) {
    let apiData: Partial<typeof this.apiData> = {};
    return apiData;
  }

  public formatToRow(): CollectionRow {
    const { apiData } = this;
    // @ts-ignore
    let obj: CollectionRow = {
      ...filterObjectKeys(apiData, ['metafields']),
    };

    return obj;
  }
}
