// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { TadaDocumentNode } from 'gql.tada';
import { BaseContext } from '../../Clients/Client.types';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { SyncTableUpdateResult } from '../../SyncTableManager/types/SyncTable.types';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { CACHE_DISABLED, CUSTOM_FIELD_PREFIX_KEY, GRAPHQL_NODES_LIMIT } from '../../constants';
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
  formatMetafieldValueForApi,
  getMetaFieldFullKey,
  matchOwnerTypeToOwnerResource,
  matchOwnerTypeToResourceName,
  shouldDeleteMetafield,
  splitMetaFieldFullKey,
} from '../../utils/metafields-utils';
import { ResourceDisplayName } from '../Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllResponse,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import {
  AbstractSyncedGraphQlResource,
  MakeSyncFunctionArgsGraphQl,
  SyncTableManagerSyncFunction,
} from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { FromRow, GetSchemaArgs } from '../Abstract/Rest/AbstractSyncedRestResource';
import { AllMetafieldTypeValue } from '../Mixed/Metafield.types';
import { Metafield } from '../Rest/Metafield';
import { GraphQlResourceName } from '../types/GraphQlResource.types';

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
    ResultOf<typeof metafieldFieldsFragmentWithDefinition> & {
      owner: {
        id: string;
      };
      /** un flag special pour savoir si un metafield a deja été supprimé, utile
       * dans le cas du'une sync table de metafields, où l'on peut supprimer un
       * metafield mais où celui-ci reste visible jusqu'a la prochaine synchronisation.
       * Ça va nous servir à formatter le label avec [deleted] à la fin */
      isDeletedFlag: boolean;
    };

  public static readonly displayName = 'Metafield' as ResourceDisplayName;
  protected static readonly graphQlName = GraphQlResourceName.Metafield;

  protected static readonly defaultMaxEntriesPerRun: number = 50;
  protected static readonly paths: Array<GraphQlResourcePath> = [
    // TODO: won't work, we should write some sort of parser to identify that the root key is an array ? or just detect it using Array.isArray and flatten everything inside ?
    'nodes.metafields.nodes',

    // TODO: this one should work
    'node.metafields.nodes',
    'shop.metafields.nodes',

    // TODO: these won't
    'productVariants.nodes.metafields.nodes',
    'files.nodes.metafields.nodes',
    'collections.nodes.metafields.nodes',
    'customers.nodes.metafields.nodes',
    'draftOrders.nodes.metafields.nodes',
    'locations.nodes.metafields.nodes',
    'orders.nodes.metafields.nodes',
    'products.nodes.metafields.nodes',

    // TODO: these ones should work
    'metafields.nodes',
    'metafieldsSet.metafields',
    'metafieldDelete',
  ];

  public static getStaticSchema() {
    return Metafield.getStaticSchema();
  }

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return Metafield.getDynamicSchema(args);
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncFunctionArgsGraphQl<MetafieldGraphQl, typeof Sync_Metafields>): SyncTableManagerSyncFunction {
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

  // TODO: merge with function from Rest Metafield as it's mostly the same
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

        const metafield = new MetafieldGraphQl({
          context,
          fromRow: {
            row: { ...update.previousValue, ...update.newValue, owner_type: metafieldOwnerType, rawValue: value },
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

  /**
   * Custom createInstancesFromResponse ilmplementation for OrderTransaction.
   * Only works for the result of getOrderTransactionsQuery
   */
  protected static createInstancesFromResponse<T extends AbstractGraphQlResource, NodeT extends TadaDocumentNode>(
    context: coda.ExecutionContext,
    rawData: ResultOf<NodeT>
  ): Array<T> {
    let instances: Array<T> = [];

    const maybeOwnerNodes =
      rawData?.productVariants?.nodes ||
      rawData?.files?.nodes ||
      rawData?.collections?.nodes ||
      rawData?.customers?.nodes ||
      rawData?.draftOrders?.nodes ||
      rawData?.locations?.nodes ||
      rawData?.orders?.nodes ||
      rawData?.products?.nodes ||
      rawData?.nodes ||
      rawData?.shop ||
      rawData?.node;

    if (maybeOwnerNodes) {
      const ownerNodes = Array.isArray(maybeOwnerNodes) ? maybeOwnerNodes : [maybeOwnerNodes];
      // const orders = (rawData as ResultOf<typeof getOrderTransactionsQuery>).orders.nodes;
      ownerNodes.forEach((owner) => {
        const metafieldNodes = owner.metafields?.nodes ?? [];
        metafieldNodes.forEach((metafield) => {
          instances.push(
            this.createInstance<T>(context, {
              ...metafield,
              owner: { id: owner.id },
            })
          );
        });
      });
    }

    return instances;
  }

  // TODO: try to not make it async by prefetching and caching shop currency before ?
  /*
  protected static async formatMetafieldGraphQlFieldsFromRow(
    row: MetafieldRow,
    metaobjectFieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>,
    context: coda.SyncExecutionContext
  ): Promise<Array<MetafieldGraphQlField>> {
    const metaobjectFieldFromKeys = Object.keys(row).filter((key) => !['id', 'handle', 'status'].includes(key));
    let currencyCode: CurrencyCode;

    return Promise.all(
      metaobjectFieldFromKeys.map(async (fromKey): Promise<MetafieldGraphQlField> => {
        const value = row[fromKey] as string;
        const fieldDefinition = requireMatchingMetafieldGraphQlFieldDefinition(fromKey, metaobjectFieldDefinitions);

        if (fieldDefinition.type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
          currencyCode = await Shop.activeCurrency({ context });
        }

        let formattedValue: string;
        try {
          formattedValue = formatMetafieldValueForApi(
            value,
            fieldDefinition.type.name as AllMetafieldTypeValue,
            fieldDefinition.validations,
            currencyCode
          );
        } catch (error) {
          throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
        }

        return {
          key: fromKey,
          value: formattedValue ?? '',
          type: fieldDefinition.type.name,
        };
      })
    );
  }
  */

  // TODO: improve this
  // protected static async handleRowUpdate(
  //   prevRow: MetafieldRow,
  //   newRow: MetafieldRow,
  //   context: coda.SyncExecutionContext
  // ) {
  //   const { id: metaObjectDefinitionId } = this.decodeDynamicUrl(context.sync.dynamicUrl);
  //   const definition = await fetchSingleMetaObjectDefinition(
  //     { gid: metaObjectDefinitionId, includeFieldDefinitions: true },
  //     context,
  //     { cacheTtlSecs: CACHE_DEFAULT }
  //   );
  //   const fieldDefinitions = readFragmentArray(metaobjectFieldDefinitionFragment, definition.fieldDefinitions);
  //   const metaobjectFields = await this.formatMetafieldGraphQlFieldsFromRow(newRow, fieldDefinitions, context);
  //   // const metaobjectFields = await this.formatMetafieldGraphQlFieldsFromRow(newRow, fieldDefinitions, context);
  //   const instance = new MetafieldGraphQl({
  //     context,
  //     fromRow: {
  //       row: newRow,
  //       metaobjectFields,
  //     },
  //   });

  //   await instance.saveAndUpdate();
  //   return { ...prevRow, ...instance.formatToRow() };
  // }

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

  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }
  get prefixedFullKey() {
    return CUSTOM_FIELD_PREFIX_KEY + this.fullKey;
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

      const body = MetafieldGraphQl.extractResourceDataFromRawData(response.body.data)[0];
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
      ownerId: this.apiData.owner?.id,
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
    const { DELETED_SUFFIX } = Metafield;

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
      owner: row.owner_id && ownerResourceName ? { id: idToGraphQlGid(ownerResourceName, row.owner_id) } : undefined,
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
        id: idToGraphQlGid(GraphQlResourceName.MetafieldDefinition, row.definition_id || row.definition?.id),
      };
    }

    return apiData;
  }

  public formatToRow(): MetafieldRow {
    const { apiData: data } = this;

    const { DELETED_SUFFIX } = Metafield;

    // Should throw error if ownerId is missing
    const ownerId = graphQlGidToId(data.owner?.id);
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

    const supportedSynctable = Metafield.supportedSyncTables.find((r) => r.ownerType === data.ownerType);
    if (supportedSynctable && supportedSynctable.formatOwnerReference) {
      obj.owner = supportedSynctable.formatOwnerReference(ownerId);
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
    const maybeAdminUrl = Metafield.getMetafieldAdminUrl(
      this.context.endpoint,
      !!data.definition?.id,
      matchOwnerTypeToOwnerResource(data.ownerType as MetafieldOwnerType),
      ownerId
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
