// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { FragmentOf, readFragment } from '../../utils/tada-utils';

import { RequiredParameterMissingVisibleError, UnsupportedValueError } from '../../Errors';
import { CACHE_DISABLED, CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import { graphQlGidToId } from '../../utils/graphql-utils';
import { RestResourcePlural, RestResourceSingular } from '../types/RestResource.types';
import { GraphQlResourceName } from '../types/GraphQlResource.types';
import { requireMatchingMetafieldDefinition } from '../../utils/metafieldDefinitions-utils';
import { AllMetafieldTypeValue, METAFIELD_TYPES } from '../Mixed/Metafield.types';
import { metafieldFieldsFragment } from '../../graphql/metafields-graphql';
import {
  matchOwnerResourceToMetafieldOwnerType,
  matchOwnerTypeToOwnerResource,
  shouldDeleteMetafield,
} from '../../resourcesOld/metafields/utils/metafields-utils';
import { formatMetafieldValueForApi } from '../../resourcesOld/metafields/utils/metafields-utils-formatToApi';
import { formatMetaFieldValueForSchema } from '../../resourcesOld/metafields/utils/metafields-utils-formatToRow';
import {
  getMetaFieldFullKey,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../../resourcesOld/metafields/utils/metafields-utils-keys';
import { BaseRow, MetafieldRow } from '../../schemas/CodaRows.types';
import { ArticleReference, formatArticleReference } from '../../schemas/syncTable/ArticleSchema';
import { BlogReference, formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { CollectionReference, formatCollectionReference } from '../../schemas/syncTable/CollectionSchema';
import { CustomerReference, formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { DraftOrderReference, formatDraftOrderReference } from '../../schemas/syncTable/DraftOrderSchema';
import { LocationReference, formatLocationReference } from '../../schemas/syncTable/LocationSchema';
import {
  formatMetafieldDefinitionReference,
  getMetafieldDefinitionReferenceSchema,
} from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { OrderReference, formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { PageReference, formatPageReference } from '../../schemas/syncTable/PageSchema';
import { ProductReference, formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { ProductVariantReference, formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { compareByDisplayKey, deepCopy, isNullishOrEmpty } from '../../utils/helpers';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { SyncTableSyncResult, SyncTableUpdateResult } from '../../SyncTableManager/SyncTable.types';
import { BaseContext, FindAllResponse, ResourceDisplayName, ResourceName } from '../AbstractResource';
import { AbstractResource_Synced, FromRow, GetSchemaArgs } from '../AbstractResource_Synced';
import { AbstractResource_Synced_HasMetafields } from '../AbstractResource_Synced_HasMetafields';
import { getCurrentShopActiveCurrency } from '../abstractResource-utils';
import { MetafieldDefinition } from '../GraphQl/MetafieldDefinition';

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

export type SupportedMetafieldOwnerResource = Extract<
  ResourceName,
  | 'article'
  | 'blog'
  | 'collection'
  | 'customer'
  | 'draft_order'
  | 'location'
  | 'order'
  | 'page'
  | 'product'
  // | 'product_image'
  | 'variant'
  | 'shop'
>;

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
  fields?: string | null;
}
interface FindByKeyArgs extends BaseContext {
  fullKey: string;
  owner_id: number;
  owner_resource: SupportedMetafieldOwnerResource;
  fields?: string | null;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
}
interface DeleteByKeyArgs extends BaseContext {
  fullKey: string;
  owner_id: number;
  owner_resource: SupportedMetafieldOwnerResource;
}
interface RefreshDataArgs {
  fields?: string | null;
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
  fields?: string | null;
  metafield?: { [key: string]: unknown } | null;
}

interface CreateInstancesFromRowArgs {
  row: BaseRow;
  ownerResource: SupportedMetafieldOwnerResource;
  metafieldDefinitions?: Array<MetafieldDefinition>;
  context: coda.ExecutionContext;
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
    owner_resource: SupportedMetafieldOwnerResource | null;
    page_id: number | null;
    product_id: number | null;
    product_image_id: number | null;
    type: string | null;
    updated_at: string | null;
    variant_id: number | null;
    definition_id: number | null;
  } & {
    /** un flag special pour savoir si un metafield a deja été supprimé, utile
     * dans le cas du'une sync table de metafields, où l'on peut supprimer un
     * metafield mais où celui-ci reste visible jusqu'a la prochaine synchronisation.
     * Ça va nous servir à formatter le label avec [deleted] à la fin */
    isDeletedFlag: boolean;
  };

  static readonly displayName = 'Metafield' as ResourceDisplayName;
  static readonly DELETED_SUFFIX = ' [deleted]';

  protected static graphQlName = GraphQlResourceName.Metafield;

  protected static paths: ResourcePath[] = buildMetafieldResourcePaths();

  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Metafield,
      plural: RestResourcePlural.Metafield,
    },
  ];

  public static supportedSyncTables: Array<SupportedSyncTable> = [
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
  static getMetafieldAdminUrl(
    endpoint: string,
    hasMetafieldDefinition: boolean,
    owner_resource: SupportedMetafieldOwnerResource,
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

    throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }

  public static listSupportedSyncTables() {
    return this.supportedSyncTables
      .map((r) => ({
        display: r.display,
        value: r.ownerType,
      }))
      .sort(compareByDisplayKey);
  }
  public static listSupportedSyncTablesWithDefinitions() {
    return this.supportedSyncTables
      .filter((r) => !r.noDefinitions)
      .map((r) => ({
        display: r.display,
        value: r.ownerType,
      }))
      .sort(compareByDisplayKey);
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
    // TODO: something better
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
    options,
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
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async findByKey({
    context,
    fullKey,
    owner_id,
    owner_resource,
    fields = null,
    options,
  }: FindByKeyArgs): Promise<Metafield | null> {
    const metafields = await this.all({
      context,
      ['metafield[owner_id]']: owner_id,
      ['metafield[owner_resource]']: owner_resource,
      fields,
      options,
    });
    return metafields.data.find((metafield) => metafield.fullKey === fullKey) ?? null;
  }

  public static async delete({ context, id }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Metafield>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async syncUpdate(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableUpdateResult> {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;

    const completed = await Promise.allSettled(
      updates.map(async (update) => {
        const { updatedFields, previousValue, newValue } = update;
        const { type } = previousValue;
        const { rawValue } = newValue;

        // Utilisation de rawValue ou de la valeur de l'helper column adaptée si elle a été utilisée
        let value: string | null = rawValue as string;
        for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
          const column = metafieldSyncTableHelperEditColumns[i];
          if (updatedFields.includes(column.key)) {
            if (type === column.type) {
              /**
               *? Si jamais on implémente une colonne pour les currencies,
               *? il faudra veiller a bien passer le currencyCode a {@link formatMetafieldValueForApi}
               */
              value = formatMetafieldValueForApi(newValue[column.key], type as AllMetafieldTypeValue);
            } else {
              const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === type);
              let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
              if (goodColumn) {
                errorMsg += ` The correct column for type '${type}' is: '${goodColumn.key}'.`;
              } else {
                errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
              }
              throw new coda.UserVisibleError(errorMsg);
            }
          }
        }

        const metafield = new Metafield({
          context,
          fromRow: {
            row: { ...update.newValue, owner_type: metafieldOwnerType, rawValue: value },
          },
        });
        await metafield.saveAndUpdate();
        return metafield.formatToRow();
      })
    );

    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') {
          return job.value;
        } else return job.reason;
      }),
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

  static createInstanceFromGraphQlMetafield(
    context: coda.ExecutionContext,
    metafieldNode: FragmentOf<typeof metafieldFieldsFragment>,
    owner_gid?: string
  ): Metafield {
    const fragment = readFragment(metafieldFieldsFragment, metafieldNode);

    return new Metafield({
      context,
      fromData: {
        id: graphQlGidToId(fragment.id),
        admin_graphql_api_id: fragment.id,

        key: fragment.key,
        namespace: fragment.namespace,
        value: fragment.value,
        type: fragment.type,

        owner_id: graphQlGidToId(owner_gid),
        owner_resource: matchOwnerTypeToOwnerResource(fragment.ownerType as MetafieldOwnerType),

        updated_at: fragment.updatedAt,
        created_at: fragment.createdAt,
        // TODO
        // definition_id: fragment.definition?.id,
      } as Metafield['apiData'],
    });
  }

  static async createInstancesFromRow({
    context,
    row,
    ownerResource,
    metafieldDefinitions = [],
  }: CreateInstancesFromRowArgs): Promise<Metafield[]> {
    const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(row));
    let currencyCode: CurrencyCode;

    const promises = prefixedMetafieldFromKeys.map(async (fromKey) => {
      const value = row[fromKey] as any;
      const realFromKey = removePrefixFromMetaFieldKey(fromKey);
      const metafieldDefinition = requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);

      const { key, namespace, type, validations } = metafieldDefinition.apiData;
      let formattedValue: string | null;

      if (type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
        currencyCode = await getCurrentShopActiveCurrency(context);
      }

      try {
        formattedValue = formatMetafieldValueForApi(
          value,
          type.name as AllMetafieldTypeValue,
          validations,
          currencyCode
        );
      } catch (error) {
        throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
      }

      return new Metafield({
        context,
        fromData: {
          namespace,
          key,
          type: type.name,
          value: formattedValue,
          owner_id: row.id,
          owner_resource: ownerResource,
        } as Metafield['apiData'],
      });
    });

    return Promise.all(promises);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: any): void {
    this.apiData = data;

    // Make sure the key property is never the 'full' key, i.e. `${namespace}.${key}`. -> Normalize it.
    const fullkey = getMetaFieldFullKey({ key: this.apiData.key, namespace: this.apiData.namespace });
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);

    this.apiData.key = metaKey;
    this.apiData.namespace = metaNamespace;
  }

  // TODO: maybe make the same method for all resources ?
  public async refreshData(fields: string = null): Promise<void> {
    let metafield: Metafield;
    const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DISABLED };

    if (this.apiData.id) {
      metafield = await Metafield.find({
        context: this.context,
        id: this.apiData.id,
        fields,
        options,
      });
    } else {
      metafield = await Metafield.findByKey({
        context: this.context,
        fullKey: this.fullKey,
        owner_id: this.apiData.owner_id,
        owner_resource: this.apiData.owner_resource,
        fields,
        options,
      });
    }

    if (metafield) {
      this.apiData = {
        ...metafield.apiData,
        ...this.apiData,
      };
    }
  }

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return CUSTOM_FIELD_PREFIX_KEY + this.fullKey;
  }

  public async delete(): Promise<void> {
    /** We dont always have the metafield ID but it could still be an existing Metafield, so we need to retrieve its Id */
    if (!this.apiData.id) await this.refreshData();

    /** If we have the metafield ID, we can delete it, else it probably means it has already been deleted */
    if (this.apiData.id) await super.delete();

    // make sure to nullify metafield value
    this.apiData.value = null;
    this.apiData.isDeletedFlag = true;
  }

  public async saveAndUpdate(): Promise<void> {
    if (shouldDeleteMetafield(this.apiData.value as string)) {
      await this.delete();
    } else {
      await super.saveAndUpdate();
    }
  }

  public formatToApi({ row }: FromRow<MetafieldRow>) {
    if (!row.label) throw new RequiredParameterMissingVisibleError('label');
    if (!row.type) throw new RequiredParameterMissingVisibleError('type');

    const { DELETED_SUFFIX } = Metafield;

    const isDeletedFlag = row.label.includes(DELETED_SUFFIX);
    const fullkey = row.label.split(DELETED_SUFFIX)[0];
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);

    let apiData: Partial<typeof this.apiData> = {
      admin_graphql_api_id: row.admin_graphql_api_id,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      id: isDeletedFlag ? null : row.id,
      key: metaKey,
      namespace: metaNamespace,
      owner_id: row.owner_id,
      type: row.type,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
      // TODO: maybe all these checks are unecessary now. Check
      value: isNullishOrEmpty(row.rawValue)
        ? null
        : typeof row.rawValue === 'string'
        ? row.rawValue
        : JSON.stringify(row.rawValue),
      owner_resource: matchOwnerTypeToOwnerResource(row.owner_type as MetafieldOwnerType),
      isDeletedFlag,
    };

    if (row.definition_id || row.definition) {
      apiData.definition_id = row.definition_id || row.definition?.id;
    }

    return apiData;
  }

  public formatToRow(): MetafieldRow {
    const { apiData: data } = this;
    const ownerType = matchOwnerResourceToMetafieldOwnerType(data.owner_resource);

    let obj: MetafieldRow = {
      label: this.fullKey + (data.isDeletedFlag ? Metafield.DELETED_SUFFIX : ''),
      admin_graphql_api_id: data.admin_graphql_api_id,
      id: data.id,
      key: data.key,
      namespace: data.namespace,
      type: data.type,
      rawValue: data.value,
      owner_id: data.owner_id,
      updated_at: data.updated_at,
      created_at: data.created_at,
      owner_type: ownerType,
    };

    const supportedSynctable = Metafield.supportedSyncTables.find((r) => r.ownerType === ownerType);
    if (supportedSynctable && supportedSynctable.formatOwnerReference) {
      obj.owner = supportedSynctable.formatOwnerReference(data.owner_id);
    }

    if (data.definition_id) {
      obj.definition_id = data.definition_id;
      obj.definition = formatMetafieldDefinitionReference(data.definition_id);
    }

    /**
     * We don't set it at once because parentOwnerId can be necessary but
     * undefined when formatting from a two way sync update (ex: ProductVariants).
     * Since this value is static, we return nothing to prevent erasing the
     * previous value. We could also retrieve the owner ID value directly in the
     * graphQl mutation result but doing it this way reduce the GraphQL query costs.
     */
    const maybeAdminUrl = Metafield.getMetafieldAdminUrl(
      this.context.endpoint,
      !!data.definition_id,
      data.owner_resource,
      data.owner_id
      // TODO
      // parentOwnerId
    );
    if (maybeAdminUrl) {
      obj.admin_url = maybeAdminUrl;
    }

    // if (includeHelperColumns) {
    const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === data.type);
    if (helperColumn) {
      obj[helperColumn.key] = formatMetaFieldValueForSchema({ value: data.value, type: data.type });
    }
    // }

    return obj;
  }

  public formatValueForOwnerRow() {
    return formatMetaFieldValueForSchema({
      value: this.apiData.value,
      type: this.apiData.type,
    });
  }
}
