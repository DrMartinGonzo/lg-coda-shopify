// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { TadaDocumentNode } from 'gql.tada';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { SyncTableManagerGraphQl } from '../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import { MakeSyncFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES, PREFIX_FAKE } from '../../constants';
import {
  deleteMetafieldMutation,
  getNodesMetafieldsByKeyQuery,
  getResourceMetafieldsByKeysQueryFromOwnerType,
  getShopMetafieldsByKeysQuery,
  getSingleMetafieldQuery,
  getSingleNodeMetafieldsByKeyQuery,
  metafieldFieldsFragment,
  metafieldFieldsFragmentWithDefinition,
  setMetafieldsMutation,
} from '../../graphql/metafields-graphql';
import { Node } from '../../graphql/types/graphql.types.';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType, MetafieldsSetInput } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { excludeUndefinedObjectKeys, isNullishOrEmpty } from '../../utils/helpers';
import {
  formatMetaFieldValueForSchema,
  matchOwnerTypeToOwnerResource,
  matchOwnerTypeToResourceName,
  preprendPrefixToMetaFieldKey,
  shouldDeleteMetafield,
  splitMetaFieldFullKey,
} from '../../utils/metafields-utils';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllGraphQlResponse,
  GraphQlApiDataWithParentNode,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { IMetafield, MetafieldHelper } from '../Mixed/MetafieldHelper';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames } from '../types/SupportedResource';

// #endregion

// #region Types
interface FindArgs extends BaseContext {
  id: string;
}
interface FindByKeysArgs extends BaseContext {
  metafieldKeys: Array<string>;
  ownerId: string;
}
interface DeleteArgs extends BaseContext {
  id: string;
}

interface AllArgs extends BaseContext {
  limit?: number;
  cursor?: string;
  metafieldKeys?: string[];
  ownerType?: MetafieldOwnerType;
  ownerIds?: string[];
}
interface AllByOwnerTypeArgs extends Omit<AllArgs, 'ownerIds'> {
  ownerType: MetafieldOwnerType;
}
interface AllByOwnerIds extends Omit<AllArgs, 'ownerType'> {
  ownerIds: string[];
}

// #endregion

export class MetafieldGraphQl extends AbstractGraphQlResource implements IMetafield {
  public apiData: ResultOf<typeof metafieldFieldsFragment> &
    ResultOf<typeof metafieldFieldsFragmentWithDefinition> &
    GraphQlApiDataWithParentNode & {
      parentNode: Node & {
        /**
         * Used to reference Product Variant parent Product
         */
        parentOwner?: Node;
      };
    } & {
      /** un flag special pour savoir si un metafield a deja été supprimé, utile
       * dans le cas du'une sync table de metafields, où l'on peut supprimer un
       * metafield mais où celui-ci reste visible jusqu'a la prochaine synchronisation.
       * Ça va nous servir à formatter le label avec [deleted] à la fin */
      isDeletedFlag: boolean;
    };

  public static readonly displayName: Identity = PACK_IDENTITIES.Metafield;
  protected static readonly graphQlName = GraphQlResourceNames.Metafield;

  protected static readonly defaultLimit: number = 250;
  protected static readonly paths: Array<GraphQlResourcePath> = [
    'collections.metafields',
    'customers.metafields',
    'draftOrders.metafields',
    'files.metafields',
    'locations.metafields',
    'orders.metafields',
    'products.metafields',
    'productVariants.metafields',
    'shop.metafields',

    'metafields',
    'node.metafields',
    'nodes.metafields',

    'metafieldDelete',
    'metafieldsSet.metafields',
  ];

  public static getStaticSchema() {
    return MetafieldHelper.getStaticSchema();
  }

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return MetafieldHelper.getDynamicSchema(args);
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncFunctionArgs<
    typeof Sync_Metafields,
    SyncTableManagerGraphQl<MetafieldGraphQl>
  >): SyncGraphQlFunction<MetafieldGraphQl> {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const [metafieldKeys] = codaSyncParams;
    const filteredMetafieldKeys = Array.isArray(metafieldKeys)
      ? metafieldKeys.filter((key) => key !== undefined && key !== '')
      : [];

    return async ({ cursor = null, limit }) => {
      return this.allByOwnerType({
        context,
        cursor,
        limit,
        ownerType: metafieldOwnerType,
        metafieldKeys: filteredMetafieldKeys,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
    };
  }

  /**
   * Fetch a single Metafield by its id.
   *
   * @returns undefined or Metafield nodes along with their owner Gid and possible parent owner GID
   */
  public static async find({ id, context, options }: FindArgs): Promise<MetafieldGraphQl | null> {
    const documentNode = getSingleMetafieldQuery;
    const variables = { id } as VariablesOf<typeof documentNode>;

    const result = await this.baseFind<MetafieldGraphQl, typeof documentNode>({
      documentNode,
      variables,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  /**
   * Fetch multiple metafields by their full key on a specific resource.
   *
   * ownerId is not required when getting metafields for Shop. If
   * params.keys is not provided, all metafields (up to max of
   * GRAPHQL_NODES_LIMIT) will be fetched and returned.
   *
   * @returns undefined or Metafield nodes along with their owner Gid and possible parent owner GID
   */
  public static async findByKeys({
    metafieldKeys = [],
    ownerId,
    context,
    options,
  }: FindByKeysArgs): Promise<MetafieldGraphQl | null> {
    //* Assume we query the Shop metafields when ownerId is undefined
    const isShopQuery = ownerId === undefined;
    let documentNode: TadaDocumentNode;
    let variables: any;

    if (isShopQuery) {
      documentNode = getShopMetafieldsByKeysQuery;
      variables = {
        countMetafields: metafieldKeys.length,
        metafieldKeys,
      } as VariablesOf<typeof getShopMetafieldsByKeysQuery>;
    } else {
      documentNode = getSingleNodeMetafieldsByKeyQuery;
      variables = {
        countMetafields: metafieldKeys.length,
        ownerGid: ownerId,
        metafieldKeys,
      } as VariablesOf<typeof getSingleNodeMetafieldsByKeyQuery>;
    }

    const result = await this.baseFind<MetafieldGraphQl, typeof documentNode>({
      documentNode,
      variables,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  // TODO: handle delete when metafield already deleted
  public static async delete({ id, context }: DeleteArgs) {
    return this.baseDelete<typeof deleteMetafieldMutation>({
      documentNode: deleteMetafieldMutation,
      variables: { input: { id } },
      context,
    });
  }

  private static async allByOwnerType({
    context,
    limit = null,
    cursor = null,
    ownerType,
    metafieldKeys = [],
    options,
    ...otherArgs
  }: AllByOwnerTypeArgs) {
    const documentNode = getResourceMetafieldsByKeysQueryFromOwnerType(ownerType);
    const variables = {
      limit: limit ?? GRAPHQL_NODES_LIMIT,
      cursor,
      metafieldKeys,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
      ...otherArgs,
    } as VariablesOf<ReturnType<typeof getResourceMetafieldsByKeysQueryFromOwnerType>>;

    const response = await this.baseFind<MetafieldGraphQl, typeof documentNode>({
      documentNode,
      variables,
      context,
      options,
    });

    return response;
  }

  private static async allByOwnerIds({
    context,
    limit = null,
    cursor = null,
    ownerIds,
    metafieldKeys = [],
    options,
    ...otherArgs
  }: AllByOwnerIds) {
    const response = await this.baseFind<MetafieldGraphQl, typeof getNodesMetafieldsByKeyQuery>({
      documentNode: getNodesMetafieldsByKeyQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        ids: ownerIds,
        metafieldKeys,
        countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
        ...otherArgs,
      } as VariablesOf<typeof getNodesMetafieldsByKeyQuery>,
      context,
      options,
    });

    return response;
  }

  public static async all({
    ownerType,
    ownerIds,
    ...params
  }: AllArgs): Promise<FindAllGraphQlResponse<MetafieldGraphQl>> {
    if (!!ownerType && !!ownerIds) {
      throw new Error('ownerType and ownerIds cannot be used together');
    }

    if (ownerType) {
      return MetafieldGraphQl.allByOwnerType({ ownerType, ...params });
    }

    if (ownerIds) {
      return MetafieldGraphQl.allByOwnerIds({ ownerIds, ...params });
    }

    throw new Error('ownerType or ownerIds must be provided');
  }

  /**
   * {@link MetafieldGraphQl} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_id: required for GraphQl
   */
  public static getRequiredPropertiesForUpdate(
    schema: coda.ArraySchema<coda.ObjectSchema<string, string>>,
    updatedFields: string[] = []
  ) {
    const { properties } = MetafieldHelper.getStaticSchema();
    return super
      .getRequiredPropertiesForUpdate(schema, updatedFields)
      .concat([properties.label.fromKey, properties.type.fromKey, properties.owner_id.fromKey]);
  }

  protected static async createInstanceForUpdate(
    prevRow: MetafieldRow,
    newRow: MetafieldRow,
    context: coda.SyncExecutionContext
  ) {
    return MetafieldHelper.createInstanceForUpdate(prevRow, newRow, context, MetafieldGraphQl);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: any): void {
    super.setData(MetafieldHelper.normalizeMetafieldData(data));
  }

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return preprendPrefixToMetaFieldKey(this.fullKey);
  }

  // Only supports saving a single Metafield in one call for now
  public async save({ update = false }: SaveArgs): Promise<void> {
    const input = this.formatMetafieldSetInput();

    if (input) {
      const documentNode = setMetafieldsMutation;
      const variables = { inputs: [input] } as VariablesOf<typeof setMetafieldsMutation>;
      await this._baseSave<typeof documentNode>({ documentNode, variables, update });
    }
  }

  public async delete(): Promise<void> {
    /** If we have the metafield ID, we can delete it, else it probably means it has already been deleted */
    if (this.apiData.id) await MetafieldGraphQl.delete({ context: this.context, id: this.apiData.id });

    // make sure to nullify metafield value
    this.apiData.value = null;
    this.apiData.isDeletedFlag = true;
  }

  public async saveAndUpdate(): Promise<void> {
    if (shouldDeleteMetafield(this.apiData.value)) {
      await this.delete();
    } else {
      await super.saveAndUpdate();
    }
  }

  /**
   * Formate un objet MetafieldsSetInput pour GraphQL Admin API
   */
  private formatMetafieldSetInput(): MetafieldsSetInput | undefined {
    let input: MetafieldsSetInput = {
      type: this.apiData.type,
      namespace: this.apiData.namespace,
      key: this.apiData.key,
      value: this.apiData.value,
      ownerId: this.apiData.parentNode?.id,
    };
    const filteredInput = excludeUndefinedObjectKeys(input) as MetafieldsSetInput;

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  protected formatToApi({ row }: FromRow<MetafieldRow>) {
    if (!row.label) throw new RequiredParameterMissingVisibleError('label');
    if (!row.type) throw new RequiredParameterMissingVisibleError('type');

    const { DELETED_SUFFIX } = MetafieldHelper;

    const isDeletedFlag = row.label.includes(DELETED_SUFFIX);
    const fullkey = row.label.split(DELETED_SUFFIX)[0];
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);
    const ownerResourceName = row.owner_type
      ? matchOwnerTypeToResourceName(row.owner_type as MetafieldOwnerType)
      : undefined;

    let apiData: Partial<typeof this.apiData> = {
      __typename: 'Metafield',
      id: idToGraphQlGid(MetafieldGraphQl.graphQlName, row.id),
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      isDeletedFlag,
      key: metaKey,
      namespace: metaNamespace,
      parentNode: ownerResourceName ? { id: idToGraphQlGid(ownerResourceName, row.owner_id) } : undefined,
      ownerType: row.owner_type as MetafieldOwnerType,
      type: row.type,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      value: isNullishOrEmpty(row.rawValue) ? null : row.rawValue,
      definition: {
        id: idToGraphQlGid(GraphQlResourceNames.MetafieldDefinition, row.definition_id || row.definition?.id),
      },
    };

    return apiData;
  }

  public formatToRow(includeHelperColumns = true): MetafieldRow {
    const { apiData: data } = this;

    const { DELETED_SUFFIX } = MetafieldHelper;

    const ownerId = graphQlGidToId(data.parentNode?.id);
    const parentOwnerId = graphQlGidToId(data.parentNode?.parentOwner?.id);

    let obj: Partial<MetafieldRow> = {
      label: this.fullKey + (data.isDeletedFlag ? DELETED_SUFFIX : ''),
      admin_graphql_api_id: data.id,
      id: graphQlGidToId(data.id),
      key: data.key,
      namespace: data.namespace,
      type: data.type,
      rawValue: data.value,
      updated_at: data.updatedAt,
      created_at: data.createdAt,
      owner_type: data.ownerType,
    };

    if (ownerId) {
      obj.owner_id = ownerId;
      const { formatOwnerReference } = MetafieldHelper.getSupportedSyncTable(data.ownerType as MetafieldOwnerType);
      if (formatOwnerReference) {
        obj.owner = formatOwnerReference(ownerId);
      }

      /**
       * Only set the value if maybeAdminUrl is not undefined. Since ownerId is
       * necessary (and parentOwnerId can be necessary for ProductVariants) but
       * undefined when formatting from a two way sync update.
       * Since this value is static, we return nothing to prevent erasing the
       * previous value. We could also retrieve the owner ID value directly in the
       * graphQl mutation result but doing it this way reduce the GraphQL query costs.
       */
      const maybeAdminUrl = MetafieldHelper.getMetafieldAdminUrl(this.context, {
        id: ownerId,
        parentId: parentOwnerId,
        singular: matchOwnerTypeToOwnerResource(data.ownerType as MetafieldOwnerType),
        hasMetafieldDefinition: !!data.definition?.id,
      });
      if (maybeAdminUrl) {
        obj.admin_url = maybeAdminUrl;
      }
    }

    if (data.definition?.id && !data.definition.id.startsWith(PREFIX_FAKE)) {
      const definitionId = graphQlGidToId(data.definition.id);
      obj.definition_id = definitionId;
      obj.definition = formatMetafieldDefinitionReference(definitionId);
    }

    if (includeHelperColumns) {
      const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === data.type);
      if (helperColumn) {
        obj[helperColumn.key] = formatMetaFieldValueForSchema({ value: data.value, type: data.type });
      }
    }

    return obj as MetafieldRow;
  }

  public formatValueForOwnerRow() {
    return formatMetaFieldValueForSchema({
      value: this.apiData.value,
      type: this.apiData.type,
    });
  }

  // TODO
  // async deleteMetafieldsByKeys(
  //   ownerGid: string,
  //   metafieldsToDelete: Array<CodaMetafieldKeyValueSet_OLD>
  // ): Promise<DeletedMetafieldsByKeys[]> {
  //   if (!metafieldsToDelete.length) return;

  //   const { response } = await this.fetchAll(
  //     ownerGid,
  //     metafieldsToDelete.map((m) => m.key)
  //   );

  //   if ('metafields' in response?.body?.data?.node && response.body.data.node?.metafields?.nodes) {
  //     const metafields = readFragmentArray(
  //       metafieldFieldsFragmentWithDefinition,
  //       response.body.data.node.metafields.nodes
  //     );
  //     const promises = metafieldsToDelete.map(async (metafieldKeyValueSet) => {
  //       const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
  //       const metafield = metafields.find((m) => m.key === metafieldKeyValueSet.key);
  //       if (metafield !== undefined) {
  //         try {
  //           await this.delete(metafield.id);
  //         } catch (error) {
  //           handleDeleteError(error, this.resource, metafieldKeyValueSet.key);
  //         }
  //       } else {
  //         handleDeleteNotFound(this.resource, metafieldKeyValueSet.key);
  //       }

  //       // If no errors were thrown, then the metafield was deleted.
  //       return {
  //         id: graphQlGidToId(metafield?.id),
  //         namespace: metaNamespace,
  //         key: metaKey,
  //       } as DeletedMetafieldsByKeys;
  //     });

  //     const results = await Promise.all(promises);
  //     return results.filter((r) => !!r);
  //   }

  //   return [];
  // }
}
