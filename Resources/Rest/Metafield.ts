// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResourceNames, ResourcePath } from '@shopify/shopify-api';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { SyncTableSyncResult } from '../../SyncTableManager/types/SyncTable.types';
import { CACHE_DISABLED, Identity, PACK_IDENTITIES, PREFIX_FAKE } from '../../constants';
import { BaseRow, MetafieldRow } from '../../schemas/CodaRows.types';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { isNullishOrEmpty } from '../../utils/helpers';
import {
  formatMetaFieldValueForSchema,
  formatMetafieldValueForApi,
  matchOwnerResourceToMetafieldOwnerType,
  matchOwnerTypeToOwnerResource,
  preprendPrefixToMetaFieldKey,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
  shouldDeleteMetafield,
  splitMetaFieldFullKey,
} from '../../utils/metafields-utils';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { AbstractRestResource, FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import { AbstractRestResourceWithRestMetafields } from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { MetafieldDefinition } from '../GraphQl/MetafieldDefinition';
import { MetafieldGraphQl } from '../GraphQl/MetafieldGraphQl';
import { METAFIELD_TYPES, MetafieldLegacyType, MetafieldType } from '../Mixed/Metafield.types';
import { MetafieldHelper } from '../Mixed/MetafieldHelper';
import { BaseContext, FromRow } from '../types/Resource.types';
import {
  GraphQlResourceNames,
  RestResourceSingular,
  RestResourcesPlural,
  RestResourcesSingular,
} from '../types/SupportedResource';
import { getCurrentShopActiveCurrency } from '../utils/abstractResource-utils';

// #endregion

// #region Types
export type SupportedMetafieldOwnerResource = Extract<
  RestResourceSingular,
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
  fields?: string | null;
}
interface FindByKeysArgs extends BaseContext {
  metafieldKeys: Array<string>;
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

interface SetArgs extends BaseContext {
  id: number;
  key: string;
  namespace: string;
  type: string;
  value: string | null;
}

interface AllArgs extends BaseContext {
  [key: string]: unknown;
  limit?: unknown;
  owner_id: number | null;
  owner_resource: SupportedMetafieldOwnerResource | null;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  namespace?: unknown;
  key?: unknown;
  type?: unknown;
  fields?: string | null;
}

interface CreateInstancesFromRowArgs {
  row: BaseRow;
  ownerResource: SupportedMetafieldOwnerResource;
  metafieldDefinitions?: Array<MetafieldDefinition>;
  context: coda.ExecutionContext;
}
// #endregion

// TODO: pas sûr qu'on ait besoin de tout ces paths
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

export class Metafield extends AbstractRestResource {
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

  public static readonly displayName: Identity = PACK_IDENTITIES.Metafield;
  protected static readonly graphQlName = GraphQlResourceNames.Metafield;
  protected static readonly paths: ResourcePath[] = buildMetafieldResourcePaths();
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Metafield,
      plural: RestResourcesPlural.Metafield,
    },
  ];

  public static getStaticSchema() {
    return MetafieldHelper.getStaticSchema();
  }

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return MetafieldHelper.getDynamicSchema(args);
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext,
    owner?: typeof AbstractRestResourceWithRestMetafields
  ): Promise<SyncTableSyncResult> {
    // TODO: something better
    return owner.syncMetafieldsOnly(codaSyncParams, context);
  }

  public static async find({ context, id, fields = null, options }: FindArgs): Promise<Metafield | null> {
    const result = await this.baseFind<Metafield>({
      context,
      urlIds: { id },
      params: { fields },
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async findByKeys({
    metafieldKeys = [],
    owner_id,
    owner_resource,
    fields = null,
    context,
    options,
  }: FindByKeysArgs): Promise<Metafield[] | null> {
    const metafields = await this.all({ context, owner_id, owner_resource, fields, options });
    if (metafieldKeys.length) {
      return metafields.data.filter((metafield) => metafieldKeys.includes(metafield.fullKey)) ?? null;
    }

    return metafields.data ?? null;
  }

  public static async delete({ context, id }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Metafield>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  /**
   * {@link Metafield} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   */
  public static getRequiredPropertiesForUpdate(schema: coda.ArraySchema<coda.ObjectSchema<string, string>>) {
    const metafieldSchema = MetafieldHelper.getStaticSchema();
    const { properties } = metafieldSchema;
    return super.getRequiredPropertiesForUpdate(schema).concat([properties.label.fromKey, properties.type.fromKey]);
  }

  protected static async handleRowUpdate(
    prevRow: MetafieldRow,
    newRow: MetafieldRow,
    context: coda.SyncExecutionContext
  ) {
    return MetafieldHelper.handleRowUpdate(prevRow, newRow, context, Metafield);
  }

  public static async all({
    context,
    limit = null,
    owner_id = null,
    owner_resource = null,
    since_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    namespace = null,
    key = null,
    type = null,
    fields = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<Metafield>> {
    const params = {
      ['metafield[owner_id]']: owner_id,
      ['metafield[owner_resource]']: owner_resource,
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
      ...otherArgs,
    };

    /**
     * Pas de owner_id et owner_resource pour le Shop
     */
    const isShopQuery = owner_resource === RestResourcesSingular.Shop;
    if (isShopQuery) {
      delete params['metafield[owner_id]'];
      delete params['metafield[owner_resource]'];
    }

    const response = await this.baseFind<Metafield>({
      context: context,
      urlIds: {},
      params,
      options,
    });

    return response;
  }

  static createInstanceFromGraphQlMetafield(
    context: coda.ExecutionContext,
    data: MetafieldGraphQl['apiData'],
    owner_gid?: string
  ): Metafield {
    const definitionId = data.definition?.id ? graphQlGidToId(data.definition.id) : undefined;

    return new Metafield({
      context,
      fromData: {
        id: graphQlGidToId(data.id),
        admin_graphql_api_id: data.id,

        key: data.key,
        namespace: data.namespace,
        value: data.value,
        type: data.type,

        owner_id: graphQlGidToId(owner_gid),
        owner_resource: matchOwnerTypeToOwnerResource(data.ownerType as MetafieldOwnerType),

        updated_at: data.updatedAt,
        created_at: data.createdAt,

        definition_id: definitionId ?? undefined,
        definition: definitionId ? formatMetafieldDefinitionReference(definitionId) : undefined,
      } as Partial<Metafield['apiData']>,
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
      const metafieldDefinition = MetafieldHelper.requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);

      const { key, namespace, type, validations, id: metafieldDefinitionId } = metafieldDefinition.apiData;
      let formattedValue: string | null;

      if (type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
        currencyCode = await getCurrentShopActiveCurrency(context);
      }

      try {
        formattedValue = formatMetafieldValueForApi(
          value,
          type.name as MetafieldType | MetafieldLegacyType,
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
          definition_id:
            metafieldDefinitionId && !metafieldDefinitionId.startsWith(PREFIX_FAKE)
              ? graphQlGidToId(metafieldDefinitionId)
              : undefined,
        } as Metafield['apiData'],
      });
    });

    return Promise.all(promises);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: any): void {
    this.apiData = MetafieldHelper.setData(data);
  }

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
      const search = await Metafield.findByKeys({
        context: this.context,
        metafieldKeys: [this.fullKey],
        owner_id: this.apiData.owner_id,
        owner_resource: this.apiData.owner_resource,
        fields,
        options,
      });
      if (search && search.length) metafield = search[0];
    }

    if (metafield) {
      this.apiData = {
        ...this.apiData,
        ...metafield.apiData,
      };
    }
  }

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return preprendPrefixToMetaFieldKey(this.fullKey);
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

    const { DELETED_SUFFIX } = MetafieldHelper;

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
    const { DELETED_SUFFIX } = MetafieldHelper;

    let obj: MetafieldRow = {
      label: this.fullKey + (data.isDeletedFlag ? DELETED_SUFFIX : ''),
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

    const { formatOwnerReference } = MetafieldHelper.getSupportedSyncTable(ownerType);
    if (formatOwnerReference) {
      obj.owner = formatOwnerReference(data.owner_id);
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
    const maybeAdminUrl = MetafieldHelper.getMetafieldAdminUrl(
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

    const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === data.type);
    if (helperColumn) {
      obj[helperColumn.key] = formatMetaFieldValueForSchema({ value: data.value, type: data.type });
    }

    return obj;
  }

  public formatValueForOwnerRow() {
    return formatMetaFieldValueForSchema({
      value: this.apiData.value,
      type: this.apiData.type,
    });
  }
}
