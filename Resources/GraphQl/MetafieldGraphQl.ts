// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { TadaDocumentNode } from 'gql.tada';
import { BaseContext } from '../../Clients/Client.types';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
import {
  deleteMetafieldMutation,
  getResourceMetafieldsByKeysQueryFromOwnerType,
  getShopMetafieldsByKeysQuery,
  getSingleMetafieldQuery,
  getSingleNodeMetafieldsByKeyQuery,
  metafieldFieldsFragment,
  metafieldFieldsFragmentWithDefinition,
  setMetafieldsMutation,
} from '../../graphql/metafields-graphql';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType, MetafieldsSetInput } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { deleteUndefinedInObject, isNullishOrEmpty } from '../../utils/helpers';
import {
  formatMetaFieldValueForSchema,
  matchOwnerTypeToOwnerResource,
  matchOwnerTypeToResourceName,
  preprendPrefixToMetaFieldKey,
  shouldDeleteMetafield,
  splitMetaFieldFullKey,
} from '../../utils/metafields-utils';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllResponse, GraphQlResourcePath, SaveArgs } from '../Abstract/GraphQl/AbstractGraphQlResource';
import {
  AbstractSyncedGraphQlResource,
  MakeSyncGraphQlFunctionArgs,
  SyncGraphQlFunction,
} from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { GraphQlApiDataWithParentNode } from '../Abstract/GraphQl/AbstractSyncedGraphQlResourceWithMetafields';
import { FromRow } from '../Abstract/Rest/AbstractSyncedRestResource';
import { MetafieldMixed } from '../Mixed/MetafieldMixed';
import { Metafield } from '../Rest/Metafield';
import { GraphQlResourceNames, Node } from '../types/Resource.types';

// #endregion

// #region Types
export type SupportedMetafieldOwnerType =
  | MetafieldOwnerType.Article
  | MetafieldOwnerType.Blog
  | MetafieldOwnerType.Collection
  | MetafieldOwnerType.Customer
  | MetafieldOwnerType.Draftorder
  | MetafieldOwnerType.Location
  | MetafieldOwnerType.Order
  | MetafieldOwnerType.Page
  | MetafieldOwnerType.Product
  | MetafieldOwnerType.Productvariant
  | MetafieldOwnerType.Shop;

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
  [key: string]: unknown;
  maxEntriesPerRun?: number;
  cursor?: string;
  ownerType: MetafieldOwnerType;
  metafieldKeys?: string[];
}

// #endregion

export class MetafieldGraphQl extends AbstractSyncedGraphQlResource {
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

  protected static readonly defaultMaxEntriesPerRun: number = 50;
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
    return MetafieldMixed.getStaticSchema();
  }

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return MetafieldMixed.getDynamicSchema(args);
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncGraphQlFunctionArgs<MetafieldGraphQl, typeof Sync_Metafields>): SyncGraphQlFunction<MetafieldGraphQl> {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const [metafieldKeys] = codaSyncParams;
    const filteredMetafieldKeys = Array.isArray(metafieldKeys)
      ? metafieldKeys.filter((key) => key !== undefined && key !== '')
      : [];

    return async ({ cursor = null, maxEntriesPerRun }) => {
      return this.all({
        context,
        cursor,
        maxEntriesPerRun,
        ownerType: metafieldOwnerType,
        metafieldKeys: filteredMetafieldKeys,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
    };
  }

  /**
   * Fetch a single Metafield by its id or fetch multiple metafields by their full key on a specific resource.
   *
   * ownerId is not required when getting metafields for Shop. If
   * params.keys is not provided, all metafields (up to max of
   * GRAPHQL_NODES_LIMIT) will be fetched and returned.
   *
   * @returns undefined or Metafield nodes along with their owner Gid and possible parent owner GID
   */
  // TODO: rewrite, and compare with all()
  public static async find({
    id,
    metafieldKeys = [],
    ownerId,
    context,
    options,
  }: Partial<FindArgs & FindByKeysArgs>): Promise<MetafieldGraphQl | null> {
    let documentNode: TadaDocumentNode;
    let variables: any;
    if (id !== undefined) {
      documentNode = getSingleMetafieldQuery;
      variables = {
        id,
      } as VariablesOf<typeof documentNode>;
    } else {
      //* Assume we query the Shop metafields when ownerId is undefined
      documentNode = ownerId ? getSingleNodeMetafieldsByKeyQuery : getShopMetafieldsByKeysQuery;
      variables = ownerId
        ? ({
            countMetafields: metafieldKeys.length,
            ownerGid: ownerId,
            metafieldKeys,
          } as VariablesOf<typeof getSingleNodeMetafieldsByKeyQuery>)
        : ({
            countMetafields: metafieldKeys.length,
            metafieldKeys,
          } as VariablesOf<typeof getShopMetafieldsByKeysQuery>);
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

  public static async all({
    context,
    maxEntriesPerRun = null,
    cursor = null,
    ownerType,
    metafieldKeys = [],
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<MetafieldGraphQl>> {
    const documentNode = getResourceMetafieldsByKeysQueryFromOwnerType(ownerType);

    const response = await this.baseFind<MetafieldGraphQl, typeof documentNode>({
      documentNode,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
        cursor,

        metafieldKeys: metafieldKeys,
        countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,

        ...otherArgs,
      } as VariablesOf<typeof documentNode>,
      context,
      options,
    });

    return response;
  }

  /**
   * {@link MetafieldGraphQl} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_id: required for GraphQl
   */
  public static getRequiredPropertiesForUpdate(schema: coda.ArraySchema<coda.ObjectSchema<string, string>>) {
    const { properties } = MetafieldMixed.getStaticSchema();
    return super
      .getRequiredPropertiesForUpdate(schema)
      .concat([properties.label.fromKey, properties.type.fromKey, properties.owner_id.fromKey]);
  }

  protected static async handleRowUpdate(
    prevRow: MetafieldRow,
    newRow: MetafieldRow,
    context: coda.SyncExecutionContext
  ) {
    return MetafieldMixed.handleRowUpdate(prevRow, newRow, context, MetafieldGraphQl);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: any): void {
    this.apiData = MetafieldMixed.setData(data);
  }

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return preprendPrefixToMetaFieldKey(this.fullKey);
  }

  // Only supports saving a single Metafield in one call for now
  // TODO: rework this
  public async save({ update = false }: SaveArgs): Promise<void> {
    const documentNode = setMetafieldsMutation;
    const input = this.formatMetafieldSetInput();

    if (input) {
      const variables = {
        inputs: [input],
      } as VariablesOf<typeof setMetafieldsMutation>;

      const response = await this.request<typeof documentNode>({
        context: this.context,
        documentNode: documentNode,
        variables: variables,
      });

      const body = MetafieldGraphQl.extractDataFromAllPossiblePaths(response.body.data)[0];
      if (update && body.length) {
        this.setData(body[0]);
      }
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
  formatMetafieldSetInput(): MetafieldsSetInput | undefined {
    let input: MetafieldsSetInput = {
      type: this.apiData.type,
      namespace: this.apiData.namespace,
      key: this.apiData.key,
      value: this.apiData.value,
      ownerId: this.apiData.parentNode?.id,
    };

    // input.fields = deleteUndefinedInObject(input.fields);
    input = deleteUndefinedInObject(input);

    // If no input, we have nothing to update.
    return Object.keys(input).length === 0 ? undefined : input;
  }

  protected formatToApi({ row }: FromRow<MetafieldRow>) {
    if (!row.label) throw new RequiredParameterMissingVisibleError('label');
    if (!row.type) throw new RequiredParameterMissingVisibleError('type');

    const staticResource = this.resource<typeof MetafieldGraphQl>();
    const { DELETED_SUFFIX } = MetafieldMixed;

    const isDeletedFlag = row.label.includes(DELETED_SUFFIX);
    const fullkey = row.label.split(DELETED_SUFFIX)[0];
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);
    const ownerResourceName = row.owner_type
      ? matchOwnerTypeToResourceName(row.owner_type as MetafieldOwnerType)
      : undefined;

    let apiData: Partial<typeof this.apiData> = {
      __typename: 'Metafield',
      id: row.id ? idToGraphQlGid(staticResource.graphQlName, row.id) : undefined,
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      isDeletedFlag,
      key: metaKey,
      namespace: metaNamespace,
      parentNode:
        row.owner_id && ownerResourceName ? { id: idToGraphQlGid(ownerResourceName, row.owner_id) } : undefined,
      ownerType: row.owner_type as MetafieldOwnerType,
      type: row.type,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      value: isNullishOrEmpty(row.rawValue)
        ? null
        : typeof row.rawValue === 'string'
        ? row.rawValue
        : JSON.stringify(row.rawValue),
    };

    if (row.definition_id || row.definition) {
      apiData.definition = {
        id: idToGraphQlGid(GraphQlResourceNames.MetafieldDefinition, row.definition_id || row.definition?.id),
      };
    }

    return apiData;
  }

  public formatToRow(): MetafieldRow {
    const { apiData: data } = this;

    const { DELETED_SUFFIX } = MetafieldMixed;

    const ownerId = graphQlGidToId(data.parentNode.id); // Should throw error if ownerId is missing
    const parentOwnerId = data.parentNode.parentOwner?.id ? graphQlGidToId(data.parentNode.parentOwner.id) : undefined;

    let obj: MetafieldRow = {
      label: this.fullKey + (data.isDeletedFlag ? DELETED_SUFFIX : ''),
      admin_graphql_api_id: data.id,
      id: graphQlGidToId(data.id),
      key: data.key,
      namespace: data.namespace,
      type: data.type,
      rawValue: data.value,
      owner_id: ownerId,
      updated_at: data.updatedAt,
      created_at: data.createdAt,
      owner_type: data.ownerType,
    };

    const { formatOwnerReference } = Metafield.getSupportedSyncTable(data.ownerType as MetafieldOwnerType);
    if (formatOwnerReference) {
      obj.owner = formatOwnerReference(ownerId);
    }

    if (data.definition?.id) {
      const definitionId = graphQlGidToId(data.definition.id);
      obj.definition_id = definitionId;
      obj.definition = formatMetafieldDefinitionReference(definitionId);
    }

    /**
     * We don't set it at once because parentOwnerId can be necessary but
     * undefined when formatting from a two way sync update (ex: ProductVariants).
     * Since this value is static, we return nothing to prevent erasing the
     * previous value. We could also retrieve the owner ID value directly in the
     * graphQl mutation result but doing it this way reduce the GraphQL query costs.
     */
    const maybeAdminUrl = MetafieldMixed.getMetafieldAdminUrl(
      this.context.endpoint,
      !!data.definition?.id,
      matchOwnerTypeToOwnerResource(data.ownerType as MetafieldOwnerType),
      ownerId,
      parentOwnerId
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
