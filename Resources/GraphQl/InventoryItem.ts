// #region Imports
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { BaseContext } from '../../Clients/Client.types';
import { Sync_InventoryItems } from '../../coda/setup/inventoryItems-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, PACK_IDENTITIES, Identity } from '../../constants';
import {
  buildInventoryItemsSearchQuery,
  getInventoryItemsQuery,
  inventoryItemFieldsFragment,
  updateInventoryItemMutation,
} from '../../graphql/inventoryItems-graphql';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { CountryCode } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { deepCopy, deleteUndefinedInObject, isDefinedEmpty } from '../../utils/helpers';
import { FindAllResponse, GraphQlResourcePath, SaveArgs } from '../Abstract/GraphQl/AbstractGraphQlResource';
import {
  AbstractSyncedGraphQlResource,
  MakeSyncGraphQlFunctionArgs,
  SyncGraphQlFunction,
} from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { FromRow } from '../Abstract/Rest/AbstractSyncedRestResource';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { Shop } from '../Rest/Shop';
import { GraphQlResourceNames } from '../types/Resource.types';

// #endregion

// #region Types

type InventoryItemUpdateInput = VariablesOf<typeof updateInventoryItemMutation>['input'];

// interface FindArgs extends BaseContext {
//   id: string;
//   metafieldKeys?: Array<string>;
// }
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  cursor?: string;
  maxEntriesPerRun?: number;
  createdAtMin?: Date;
  createdAtMax?: Date;
  updatedAtMin?: Date;
  updatedAtMax?: Date;
  skus?: string[];
}

// #endregion

export class InventoryItem extends AbstractSyncedGraphQlResource {
  public apiData: ResultOf<typeof inventoryItemFieldsFragment>;

  public static readonly displayName: Identity = PACK_IDENTITIES.InventoryItem;
  protected static readonly graphQlName = GraphQlResourceNames.InventoryItem;

  // protected static readonly defaultMaxEntriesPerRun: number = 50;
  protected static readonly paths: Array<GraphQlResourcePath> = ['inventoryItems', 'inventoryItemUpdate.inventoryItem'];

  public static getStaticSchema() {
    return InventoryItemSyncTableSchema;
  }

  public static async getDynamicSchema({ context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.getStaticSchema());

    const shopCurrencyCode = await Shop.activeCurrency({ context });
    augmentedSchema.properties.cost['currencyCode'] = shopCurrencyCode;

    return augmentedSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncGraphQlFunctionArgs<InventoryItem, typeof Sync_InventoryItems>): SyncGraphQlFunction<InventoryItem> {
    const [createdAtRange, updatedAtRange, skus] = codaSyncParams;

    return async ({ cursor = null, maxEntriesPerRun }) => {
      return this.all({
        context,
        cursor,
        maxEntriesPerRun,
        options: { cacheTtlSecs: CACHE_DISABLED },

        createdAtMin: createdAtRange ? createdAtRange[0] : undefined,
        createdAtMax: createdAtRange ? createdAtRange[1] : undefined,
        updatedAtMin: updatedAtRange ? updatedAtRange[0] : undefined,
        updatedAtMax: updatedAtRange ? updatedAtRange[1] : undefined,
        skus,
      });
    };
  }

  // public static async find({ id, context, options }: FindArgs): Promise<InventoryItem | null> {
  //   const result = await this.baseFind<InventoryItem, typeof getSingleMetaObjectWithFieldsQuery>({
  //     documentNode: getSingleMetaObjectWithFieldsQuery,
  //     variables: {
  //       id,
  //       includeCapabilities: fields?.capabilities ?? false,
  //       includeDefinition: fields?.definition ?? false,
  //       includeFieldDefinitions: fields?.fieldDefinitions ?? false,
  //     } as VariablesOf<typeof getSingleMetaObjectWithFieldsQuery>,
  //     context,
  //     options,
  //   });
  //   return result.data ? result.data[0] : null;
  // }

  // public static async delete({ id, context, options }: DeleteArgs) {
  //   return this.baseDelete<typeof deleteInventoryItemMutation>({
  //     documentNode: deleteInventoryItemMutation,
  //     variables: {
  //       id,
  //     },
  //     context,
  //     options,
  //   });
  // }

  public static async all({
    context,
    maxEntriesPerRun = null,
    cursor = null,
    createdAtMin,
    createdAtMax,
    skus,
    updatedAtMax,
    updatedAtMin,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<InventoryItem>> {
    const queryFilters = {
      created_at_min: createdAtMin,
      created_at_max: createdAtMax,
      updated_at_min: updatedAtMin,
      updated_at_max: updatedAtMax,
      skus,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (queryFilters[key] === undefined) delete queryFilters[key];
    });
    const searchQuery = buildInventoryItemsSearchQuery(queryFilters);

    const response = await this.baseFind<InventoryItem, typeof getInventoryItemsQuery>({
      documentNode: getInventoryItemsQuery,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,

        ...otherArgs,
      } as VariablesOf<typeof getInventoryItemsQuery>,
      context,
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async save({ update = false }: SaveArgs): Promise<void> {
    const input = this.formatInventoryItemUpdateInput();

    if (input) {
      const documentNode = updateInventoryItemMutation;
      const variables = {
        id: this.graphQlGid,
        input,
      } as VariablesOf<typeof updateInventoryItemMutation>;

      await this._baseSave<typeof documentNode>({ documentNode, variables, update });
    }
  }

  formatInventoryItemUpdateInput(): InventoryItemUpdateInput | undefined {
    const { apiData: data } = this;
    let input: InventoryItemUpdateInput = {
      cost: data.unitCost?.amount,
      countryCodeOfOrigin: data.countryCodeOfOrigin,
      harmonizedSystemCode: data.harmonizedSystemCode,
      provinceCodeOfOrigin: data.provinceCodeOfOrigin,
      tracked: data.tracked,
      // countryHarmonizedSystemCodes
    };

    // /* Edge case for cost. Setting it to 0 should delete the value. */
    // if (input.cost === 0) {
    //   input.cost = null;
    // }

    input = deleteUndefinedInObject(input);

    // If no input, we have nothing to update.
    return Object.keys(input).length === 0 ? undefined : input;
  }

  // TODO: move to parent abstract class
  removeUndefined(data: any) {
    for (let key in data) {
      if (data[key] === undefined) {
        delete data[key];
      } else if (isDefinedEmpty(data[key])) {
        data[key] = null;
      } else if (typeof data[key] === 'object') {
        this.removeUndefined(data[key]);
      }
    }
    return data;
  }

  // TODO: convert to a setter for apiData ?
  protected formatToApi({ row }: FromRow<InventoryItemRow>) {
    let apiData: Partial<typeof this.apiData> = {
      createdAt: row.created_at,
      inventoryHistoryUrl: row.inventory_history_url,
      requiresShipping: row.requires_shipping,
      sku: row.sku,
      tracked: row.tracked,
      updatedAt: row.updated_at,
      countryCodeOfOrigin: row.country_code_of_origin as CountryCode,
      harmonizedSystemCode: row.harmonized_system_code,
      provinceCodeOfOrigin: row.province_code_of_origin,
      unitCost: {
        amount: row.cost,
        currencyCode: undefined,
      },
    };

    if (row.id !== undefined) {
      apiData.id = idToGraphQlGid(GraphQlResourceNames.InventoryItem, row.id);
    }

    if (row.variant_id !== undefined) {
      apiData.variant = { id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, row.variant_id) };
    }

    // TODO: Apparemment Coda renvoit une string et pas un nombre lors d'une update, du coup cost peut être égal à '' !
    // TODO: Il va falloir vérifier un peu partout que ça n'affecte pas les updates, on a un risque de supprimer des valeurs que l'on ne voulait pas supprimer !!
    // Donc pour résumer soit la valeur est undefined et elle n'est pas dans l'update, donc on ne la set pas, soit elle a une valeur mais qui peut être "vide"

    // if (row.cost !== undefined) {
    //   apiData.unitCost = {
    //     amount: row.cost,
    //     currencyCode: undefined,
    //   };
    //   /* Edge case for cost. Setting it to 0 should delete the value. It can
    //   also incorrectly be set to an empty string when updating. */
    //   console.log('typeof row.cost', typeof row.cost);
    //   console.log('row.cost', row.cost);
    //   if (row.cost === 0 || isEmpty(row.cost)) {
    //     apiData.unitCost.amount = null;
    //   }
    // }

    return this.removeUndefined(apiData);
    // return apiData;
  }

  public formatToRow(): InventoryItemRow {
    const { apiData: data } = this;

    let obj: InventoryItemRow = {
      admin_graphql_api_id: data.id,
      id: graphQlGidToId(data.id),
      cost: data.unitCost?.amount ? parseFloat(data.unitCost?.amount) : undefined,
      country_code_of_origin: data.countryCodeOfOrigin,
      created_at: data.createdAt,
      harmonized_system_code: data.harmonizedSystemCode,
      province_code_of_origin: data.provinceCodeOfOrigin,
      requires_shipping: data.requiresShipping,
      sku: data.sku,
      tracked: data.tracked,
      updated_at: data.updatedAt,
      inventory_history_url: data.inventoryHistoryUrl,
    };

    if (data.variant?.id) {
      const variantId = graphQlGidToId(data.variant?.id);
      obj.variant = formatProductVariantReference(variantId);
      obj.variant_id = variantId;
    }

    return obj;
  }
}
