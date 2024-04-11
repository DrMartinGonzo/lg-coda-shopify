// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { FragmentOf, readFragment } from '../../../utils/graphql';

import { RequiredParameterMissingVisibleError } from '../../../Errors';
import { CUSTOM_FIELD_PREFIX_KEY } from '../../../constants';
import { graphQlGidToId } from '../../../helpers-graphql';
import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';
import {
  GraphQlResourceName,
  RestResourcePlural,
  RestResourceSingular,
} from '../../../resources/ShopifyResource.types';
import { AllMetafieldTypeValue } from '../../../resources/metafields/Metafield.types';
import { metafieldFieldsFragment } from '../../../resources/metafields/metafields-graphql';
import { shouldDeleteMetafield } from '../../../resources/metafields/utils/metafields-utils';
import { formatMetafieldValueForApi } from '../../../resources/metafields/utils/metafields-utils-formatToApi';
import { formatMetaFieldValueForSchema } from '../../../resources/metafields/utils/metafields-utils-formatToRow';
import { getMetaFieldFullKey, splitMetaFieldFullKey } from '../../../resources/metafields/utils/metafields-utils-keys';
import { MetafieldRow } from '../../../schemas/CodaRows.types';
import { ArticleReference, formatArticleReference } from '../../../schemas/syncTable/ArticleSchema';
import { BlogReference, formatBlogReference } from '../../../schemas/syncTable/BlogSchema';
import { CollectionReference, formatCollectionReference } from '../../../schemas/syncTable/CollectionSchema';
import { CustomerReference, formatCustomerReference } from '../../../schemas/syncTable/CustomerSchema';
import { DraftOrderReference, formatDraftOrderReference } from '../../../schemas/syncTable/DraftOrderSchema';
import { LocationReference, formatLocationReference } from '../../../schemas/syncTable/LocationSchema';
import {
  formatMetafieldDefinitionReference,
  getMetafieldDefinitionReferenceSchema,
} from '../../../schemas/syncTable/MetafieldDefinitionSchema';
import {
  MetafieldSyncTableSchema,
  metafieldSyncTableHelperEditColumns,
} from '../../../schemas/syncTable/MetafieldSchema';
import { OrderReference, formatOrderReference } from '../../../schemas/syncTable/OrderSchema';
import { PageReference, formatPageReference } from '../../../schemas/syncTable/PageSchema';
import { ProductReference, formatProductReference } from '../../../schemas/syncTable/ProductSchemaRest';
import {
  ProductVariantReference,
  formatProductVariantReference,
} from '../../../schemas/syncTable/ProductVariantSchema';
import { formatShopReference } from '../../../schemas/syncTable/ShopSchema';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { deepCopy, isNullOrEmpty, isString } from '../../../utils/helpers';
import { SyncTableSyncResult, SyncTableUpdateResult } from '../../SyncTable/SyncTable.types';
import { BaseContext, FindAllResponse, ResourceDisplayName } from '../AbstractResource';
import { AbstractResource_Synced, FromRow, GetSchemaArgs } from '../AbstractResource_Synced';
import { AbstractResource_Synced_HasMetafields } from '../AbstractResource_Synced_HasMetafields';

// #endregion

// #region Types
type OwnerReference = coda.GenericObjectSchema & coda.ObjectSchemaProperty;

interface SupportedSyncTable {
  display: string;
  ownerReference?: OwnerReference | undefined;
  formatOwnerReference?: CallableFunction | undefined;
  singular: string;
  ownerType: MetafieldOwnerType;
  noDefinitions?: boolean;
  useRest?: boolean;
}

interface OwnerInfo {
  display: string;
  ownerReference?: OwnerReference | undefined;
  adminDefinitionUrl: string;
  supportDefinition: boolean;
  syncWith: 'rest' | 'graphQl';
}

export type RestMetafieldOwnerType =
  | 'article'
  | 'blog'
  | 'collection'
  | 'customer'
  | 'draft_order'
  | 'location'
  | 'order'
  | 'page'
  // | 'product_image'
  | 'product'
  | 'variant'
  | 'shop';

const restToGraphQLMap: Record<RestMetafieldOwnerType, MetafieldOwnerType> = {
  article: MetafieldOwnerType.Article,
  blog: MetafieldOwnerType.Blog,
  collection: MetafieldOwnerType.Collection,
  customer: MetafieldOwnerType.Customer,
  draft_order: MetafieldOwnerType.Draftorder,
  location: MetafieldOwnerType.Location,
  order: MetafieldOwnerType.Order,
  page: MetafieldOwnerType.Page,
  product: MetafieldOwnerType.Product,
  variant: MetafieldOwnerType.Productvariant,
  shop: MetafieldOwnerType.Shop,
};
export const graphQLToRestMap = {};
Object.keys(restToGraphQLMap).forEach((key) => {
  graphQLToRestMap[restToGraphQLMap[key]] = key;
});

interface FindArgs extends BaseContext {
  id: number | string;
  article_id?: number | string | null;
  blog_id?: number | string | null;
  collection_id?: number | string | null;
  customer_id?: number | string | null;
  draft_order_id?: number | string | null;
  order_id?: number | string | null;
  page_id?: number | string | null;
  product_image_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
  article_id?: number | string | null;
  blog_id?: number | string | null;
  collection_id?: number | string | null;
  customer_id?: number | string | null;
  draft_order_id?: number | string | null;
  order_id?: number | string | null;
  page_id?: number | string | null;
  product_image_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
}
interface SetArgs extends BaseContext {
  id: number;
  key: string;
  namespace: string;
  type: string;
  value: string | null;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  article_id?: number | string | null;
  blog_id?: number | string | null;
  collection_id?: number | string | null;
  customer_id?: number | string | null;
  draft_order_id?: number | string | null;
  order_id?: number | string | null;
  page_id?: number | string | null;
  product_image_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  limit?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  namespace?: unknown;
  key?: unknown;
  type?: unknown;
  fields?: unknown;
  metafield?: { [key: string]: unknown } | null;
}
// #endregion

function buildMetafieldResourcePaths() {
  const paths = [
    { http_method: 'get', operation: 'get', ids: [], path: 'metafields.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'metafields/<id>.json' },
    { http_method: 'post', operation: 'post', ids: [], path: 'metafields.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'metafields/<id>.json' },
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'metafields/<id>.json' },
  ];

  [
    ['articles', 'article_id'],
    ['blogs', 'blog_id'],
    ['collections', 'collection_id'],
    ['customers', 'customer_id'],
    ['draft_orders', 'draft_order_id'],
    ['orders', 'order_id'],
    ['pages', 'page_id'],
    ['product_images', 'product_image_id'],
    ['products', 'product_id'],
    ['variants', 'variant_id'],
  ].forEach(([ownerPath, ownerIdKey]) => {
    paths.push({
      http_method: 'get',
      operation: 'get',
      ids: [ownerIdKey],
      path: `${ownerPath}/<${ownerIdKey}>/metafields.json`,
    });
    paths.push({
      http_method: 'get',
      operation: 'get',
      ids: [ownerIdKey, 'id'],
      path: `${ownerPath}/<${ownerIdKey}>/metafields/<id>.json`,
    });
    paths.push({
      http_method: 'post',
      operation: 'post',
      ids: [ownerIdKey],
      path: `${ownerPath}/<${ownerIdKey}>/metafields.json`,
    });
    paths.push({
      http_method: 'put',
      operation: 'put',
      ids: [ownerIdKey, 'id'],
      path: `${ownerPath}/<${ownerIdKey}>/metafields/<id>.json`,
    });
    paths.push({
      http_method: 'delete',
      operation: 'delete',
      ids: [ownerIdKey, 'id'],
      path: `${ownerPath}/<${ownerIdKey}>/metafields/<id>.json`,
    });
  });

  return paths;
}

export class Metafield extends AbstractResource_Synced {
  apiData: {
    key: string | null;
    namespace: string | null;
    value: string | null;
    article_id: number | null;
    blog_id: number | null;
    collection_id: number | null;
    created_at: string | null;
    customer_id: number | null;
    draft_order_id: number | null;
    id: number | null;
    admin_graphql_api_id: string | null;
    order_id: number | null;
    owner_id: number | null;
    owner_resource: RestMetafieldOwnerType | null;
    page_id: number | null;
    product_id: number | null;
    product_image_id: number | null;
    type: string | null;
    updated_at: string | null;
    variant_id: number | null;
    definition_id: number | null;

    /** un flag special pour savoir si un metafield a deja été supprimé, utile
     * dans le cas du'une sync table de metafields, où l'on peut supprimer un
     * metafield mais où celui-ci reste visible jusqu'a la prochaine synchronisation.
     * Ça va nous servir à formatter le label avec [deleted] à la fin */
    isDeletedFlag: boolean;
  };

  static readonly displayName = 'Metafield' as ResourceDisplayName;
  protected static DELETED_SUFFIX = ' [deleted]';

  protected static graphQlName = GraphQlResourceName.Metafield;

  protected static paths: ResourcePath[] = buildMetafieldResourcePaths();

  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Metafield,
      plural: RestResourcePlural.Metafield,
    },
  ];

  protected static supportedSyncTables: Array<SupportedSyncTable> = [
    {
      display: 'Article',
      singular: RestResourceSingular.Article,
      ownerType: MetafieldOwnerType.Article,
      ownerReference: ArticleReference,
      formatOwnerReference: formatArticleReference,
      useRest: true,
    },
    {
      display: 'Blog',
      singular: RestResourceSingular.Blog,
      ownerType: MetafieldOwnerType.Blog,
      ownerReference: BlogReference,
      formatOwnerReference: formatBlogReference,
      useRest: true,
    },
    {
      display: 'Collection',
      singular: RestResourceSingular.Collection,
      ownerType: MetafieldOwnerType.Collection,
      ownerReference: CollectionReference,
      formatOwnerReference: formatCollectionReference,
    },
    {
      display: 'Customer',
      singular: RestResourceSingular.Customer,
      ownerType: MetafieldOwnerType.Customer,
      ownerReference: CustomerReference,
      formatOwnerReference: formatCustomerReference,
    },
    {
      display: 'Draft order',
      singular: RestResourceSingular.DraftOrder,
      ownerType: MetafieldOwnerType.Draftorder,
      ownerReference: DraftOrderReference,
      formatOwnerReference: formatDraftOrderReference,
    },
    {
      display: 'Location',
      singular: RestResourceSingular.Location,
      ownerType: MetafieldOwnerType.Location,
      ownerReference: LocationReference,
      formatOwnerReference: formatLocationReference,
    },
    {
      display: 'Order',
      singular: RestResourceSingular.Order,
      ownerType: MetafieldOwnerType.Order,
      ownerReference: OrderReference,
      formatOwnerReference: formatOrderReference,
    },
    {
      display: 'Page',
      singular: RestResourceSingular.Page,
      ownerType: MetafieldOwnerType.Page,
      ownerReference: PageReference,
      formatOwnerReference: formatPageReference,
      useRest: true,
    },
    {
      display: 'Product',
      singular: RestResourceSingular.Product,
      ownerType: MetafieldOwnerType.Product,
      ownerReference: ProductReference,
      formatOwnerReference: formatProductReference,
    },
    {
      display: 'Product variant',
      singular: RestResourceSingular.ProductVariant,
      ownerType: MetafieldOwnerType.Productvariant,
      ownerReference: ProductVariantReference,
      formatOwnerReference: formatProductVariantReference,
    },
    {
      display: 'Shop',
      singular: RestResourceSingular.Shop,
      ownerType: MetafieldOwnerType.Shop,
      // ownerReference: ShopReference,
      // formatOwnerReference:formatShopReference,
      noDefinitions: true,
      useRest: true,
    },
  ];

  static getAdminDefinitionUrl(endpoint: string, singular?: string) {
    return `${endpoint}/admin${singular !== undefined ? `/settings/custom_data/${singular}/metafields` : ''}`;
  }

  // TODO: maybe put in our supported Synctables ?
  protected static getMetafieldAdminUrl(
    endpoint: string,
    definition_id: number,
    owner_resource: RestMetafieldOwnerType,
    owner_id: number,
    parentOwnerId?: number
  ): string | undefined {
    let pathPart: string;
    if (owner_resource === 'variant') {
      if (parentOwnerId) {
        pathPart = `${RestResourcePlural.Product}/${parentOwnerId}/${RestResourcePlural.ProductVariant}/${owner_id}`;
      }
    } else if (owner_resource === 'location') {
      pathPart = `settings/${owner_resource}s/${owner_id}`;
    } else if (owner_resource === 'shop') {
      return undefined;
    } else {
      pathPart = `${owner_resource}s/${owner_id}`;
    }

    if (pathPart) {
      let admin_url = `${endpoint}/admin/${pathPart}/metafields`;
      const hasMetafieldDefinition = !!definition_id;
      if (!hasMetafieldDefinition) {
        admin_url += `/unstructured`;
      }
      return admin_url;
    }
  }

  public static getOwnerInfo(ownerType: MetafieldOwnerType, context: coda.ExecutionContext): OwnerInfo {
    const found = this.supportedSyncTables.find((r) => r.ownerType === ownerType);
    if (found) {
      const { display, singular, ownerReference, noDefinitions, useRest, ...others } = found;
      return {
        display,
        ownerReference,
        supportDefinition: !noDefinitions,
        syncWith: useRest ? 'rest' : 'graphQl',
        adminDefinitionUrl: this.getAdminDefinitionUrl(context.endpoint, singular),
      };
    }

    throw new Error('Unknown MetafieldOwnerType: ' + MetafieldOwnerType);
  }

  public static listSupportedSyncTables() {
    return this.supportedSyncTables.map((r) => ({
      display: r.display,
      value: r.ownerType,
    }));
  }

  public static getStaticSchema() {
    return MetafieldSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(MetafieldSyncTableSchema);
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const { ownerReference, supportDefinition } = this.getOwnerInfo(metafieldOwnerType, context);

    if (ownerReference !== undefined) {
      augmentedSchema.properties['owner'] = {
        ...ownerReference,
        fromKey: 'owner',
        fixedId: 'owner',
        required: true,
        description: 'A relation to the owner of this metafield.',
      };
      // @ts-ignore
      augmentedSchema.featuredProperties.push('owner');
    }

    if (supportDefinition) {
      augmentedSchema.properties['definition_id'] = {
        type: coda.ValueType.Number,
        useThousandsSeparator: false,
        fixedId: 'definition_id',
        fromKey: 'definition_id',
        description: 'The ID of the metafield definition of the metafield, if it exists.',
      };

      augmentedSchema.properties['definition'] = {
        ...getMetafieldDefinitionReferenceSchema(metafieldOwnerType),
        fromKey: 'definition',
        fixedId: 'definition',
        description: 'The metafield definition of the metafield, if it exists.',
      };

      // @ts-ignore: admin_url should always be the last featured property, but Shop doesn't have one
      augmentedSchema.featuredProperties.push('admin_url');
    } else {
      delete augmentedSchema.properties.admin_url;
      delete augmentedSchema.linkProperty;
    }

    return augmentedSchema;
  }

  public static getRequiredPropertiesForUpdate(schema: coda.ArraySchema<coda.ObjectSchema<string, string>>) {
    const properties = MetafieldSyncTableSchema.properties;
    // We need to know the metafield type when updating
    return super.getRequiredPropertiesForUpdate(schema).concat([properties.label.fromKey, properties.type.fromKey]);
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext,
    owner?: typeof AbstractResource_Synced_HasMetafields
  ): Promise<SyncTableSyncResult> {
    return owner.syncMetafieldsOnly(codaSyncParams, context);
  }

  public static async find({
    context,
    id,
    article_id = null,
    blog_id = null,
    collection_id = null,
    customer_id = null,
    draft_order_id = null,
    order_id = null,
    page_id = null,
    product_image_id = null,
    product_id = null,
    variant_id = null,
    fields = null,
  }: FindArgs): Promise<Metafield | null> {
    const result = await this.baseFind<Metafield>({
      context,
      urlIds: {
        id,
        article_id,
        blog_id,
        collection_id,
        customer_id,
        draft_order_id,
        order_id,
        page_id,
        product_image_id,
        product_id,
        variant_id,
      },
      params: { fields },
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({
    context,
    id,
    article_id = null,
    blog_id = null,
    collection_id = null,
    customer_id = null,
    draft_order_id = null,
    order_id = null,
    page_id = null,
    product_image_id = null,
    product_id = null,
    variant_id = null,
  }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Metafield>({
      urlIds: {
        id,
        article_id,
        blog_id,
        collection_id,
        customer_id,
        draft_order_id,
        order_id,
        page_id,
        product_image_id,
        product_id,
        variant_id,
      },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async createOrUpdate({
    context,
    metafields,
    owner_id,
    owner_resource,
  }: {
    context: coda.ExecutionContext;
    metafields: Array<Metafield>;
    owner_id: number;
    owner_resource: RestMetafieldOwnerType;
  }) {
    const existingMetafields = await Metafield.all({
      context,
      ['metafield[owner_id]']: owner_id,
      ['metafield[owner_resource]']: owner_resource,
      options: { cacheTtlSecs: CACHE_DISABLED },
    });

    const setsToDelete = metafields.filter((set) => shouldDeleteMetafield(set.apiData.value as string));
    console.log('———————————————————setsToDelete', setsToDelete);
    const metafieldsToDelete = existingMetafields.data.filter((m) => {
      return setsToDelete.some((set) => {
        return m.apiData.key === set.apiData.key && m.apiData.namespace === set.apiData.namespace;
      });
    });
    // const metafieldsToDelete = existingMetafields.data.filter((m) => {
    //   return setsToDelete.some((set) => {
    //     // const { metaKey, metaNamespace } = splitMetaFieldFullKey(set.key);
    //     return m.apiData.key === set.key && m.apiData.namespace === set.namespace;
    //   });
    // });

    const metafieldsToUpdate = metafields.filter((set) => !shouldDeleteMetafield(set.apiData.value as string));
    // .map((m) => new Metafield({ context, fromData: m }));

    await Promise.all([
      ...metafieldsToDelete.map((m) => m.delete()),
      ...metafieldsToUpdate.map((m) => m.saveAndUpdate()),
    ]);

    return {
      deletedMetafields: metafieldsToDelete,
      updatedMetafields: metafieldsToUpdate,
    };
  }

  public static async all({
    context,
    article_id = null,
    blog_id = null,
    collection_id = null,
    customer_id = null,
    draft_order_id = null,
    order_id = null,
    page_id = null,
    product_image_id = null,
    product_id = null,
    variant_id = null,
    limit = null,
    since_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    namespace = null,
    key = null,
    type = null,
    fields = null,
    metafield = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Metafield>> {
    const response = await this.baseFind<Metafield>({
      context: context,
      urlIds: {
        article_id,
        blog_id,
        collection_id,
        customer_id,
        draft_order_id,
        order_id,
        page_id,
        product_image_id,
        product_id,
        variant_id,
      },
      params: {
        limit,
        since_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        namespace,
        key,
        type,
        fields,
        metafield,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  static createInstancesFromMetafieldSet(
    context: coda.ExecutionContext,
    metafieldSet: CodaMetafieldKeyValueSet,
    owner_id?: string | number
  ): Metafield {
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldSet.key);
    return new Metafield({
      context,
      fromData: {
        namespace: metaNamespace,
        key: metaKey,
        type: metafieldSet.type,
        owner_id: owner_id ?? null,
        value:
          metafieldSet.value === null
            ? ''
            : isString(metafieldSet.value)
            ? metafieldSet.value
            : JSON.stringify(metafieldSet.value),
      } as Metafield['apiData'],
    });
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return CUSTOM_FIELD_PREFIX_KEY + this.fullKey;
  }

  public async delete(): Promise<void> {
    await super.delete();
    // make sure to nullify metafield value
    this.apiData.value = null;
  }

  // #region Formatting
  public formatToApi({ row }: FromRow<MetafieldRow>) {
    // let apiData: UpdateArgs | CreateArgs = {};
    let apiData: Partial<typeof this.apiData> = {};

    return apiData;
  }

  public formatToRow(): MetafieldRow {
    const { apiData } = this;
    // @ts-ignore
    let obj: MetafieldRow = {
      ...apiData,
    };

    return obj;
  }

  public formatValueForOwnerRow() {
    return formatMetaFieldValueForSchema({
      value: this.apiData.value,
      type: this.apiData.type,
    });
  }
}
