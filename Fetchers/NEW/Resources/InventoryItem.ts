// #region Imports
import { ResultOf, VariablesOf } from '../../../utils/graphql';

import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../../constants';
import { graphQlGidToId, idToGraphQlGid } from '../../../helpers-graphql';
import { GraphQlResourceName } from '../../../resources/ShopifyResource.types';
import { Sync_InventoryItems } from '../../../resources/inventoryItems/inventoryItems-coda';
import {
  buildInventoryItemsSearchQuery,
  getInventoryItemsQuery,
  inventoryItemFieldsFragment,
  updateInventoryItemMutation,
} from '../../../resources/inventoryItems/inventoryItems-graphql';
import { metaobjectFragment } from '../../../resources/metaobjects/metaobjects-graphql';
import { InventoryItemRow } from '../../../schemas/CodaRows.types';
import { InventoryItemSyncTableSchema } from '../../../schemas/syncTable/InventoryItemSchema';
import { formatProductVariantReference } from '../../../schemas/syncTable/ProductVariantSchema';
import { CountryCode } from '../../../types/admin.types';
import { deepCopy, deleteUndefinedInObject, isDefinedEmpty, isNullishOrEmpty } from '../../../utils/helpers';
import {
  AbstractGraphQlResource_Synced,
  FindAllResponse,
  GraphQlResourcePath,
  MakeSyncFunctionArgsGraphQl,
  SaveArgs,
  SyncTableManagerSyncFunction,
} from '../AbstractGraphQlResource';
import { BaseContext, ResourceDisplayName } from '../AbstractResource';
import { FromRow, GetSchemaArgs } from '../AbstractResource_Synced';
import { Shop } from './Shop';

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

export class InventoryItem extends AbstractGraphQlResource_Synced {
  public apiData: ResultOf<typeof inventoryItemFieldsFragment>;

  static readonly displayName = 'InventoryItem' as ResourceDisplayName;
  protected static paths: Array<GraphQlResourcePath> = ['inventoryItems.nodes', 'inventoryItemUpdate.inventoryItem'];
  // protected static defaultMaxEntriesPerRun: number = 50;

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
  }: MakeSyncFunctionArgsGraphQl<InventoryItem, typeof Sync_InventoryItems>): SyncTableManagerSyncFunction {
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

  protected formatToApi({ row }: FromRow<InventoryItemRow>) {
    let apiData: Partial<typeof this.apiData> = {
      createdAt: row.created_at,
      inventoryHistoryUrl: row.inventory_history_url,
      requiresShipping: row.requires_shipping,
      sku: row.sku,
      tracked: row.tracked ?? false,
      updatedAt: row.updated_at,
    };

    if (row.id !== undefined) {
      apiData.id = idToGraphQlGid(GraphQlResourceName.InventoryItem, row.id);
    }

    // La plupart de ces propriétés sont mutables, il faut les formatter explicitement et ne les mettre à null que si la valur string de Coda est vide
    // TODO: helper function like formatCodaStringForGraphQlApi ?
    if (row.country_code_of_origin !== undefined) {
      apiData.countryCodeOfOrigin =
        row.country_code_of_origin === '' ? null : (row.country_code_of_origin as CountryCode);
    }
    if (row.harmonized_system_code !== undefined) {
      apiData.harmonizedSystemCode = row.harmonized_system_code === '' ? null : row.harmonized_system_code;
    }
    if (row.province_code_of_origin !== undefined) {
      apiData.provinceCodeOfOrigin = row.province_code_of_origin === '' ? null : row.province_code_of_origin;
    }

    if (row.cost !== undefined) {
      apiData.unitCost = {
        amount: row.cost,
        currencyCode: undefined,
      };
      /* Edge case for cost. Setting it to 0 should delete the value. */
      console.log('typeof row.cost', typeof row.cost);
      console.log('row.cost', row.cost);
      if (row.cost === 0) {
        apiData.unitCost.amount = null;
      }
    }

    if (row.variant_id !== undefined) {
      apiData.variant = { id: idToGraphQlGid(GraphQlResourceName.ProductVariant, row.variant_id) };
    }

    return apiData;
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
