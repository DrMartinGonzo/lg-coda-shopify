// #region Imports
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { BaseContext } from '../types/Resource.types';
import { Sync_InventoryItems } from '../../coda/setup/inventoryItems-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
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
import { deepCopy, deleteUndefinedInObject } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllGraphQlResponse, GraphQlResourcePath, SaveArgs } from '../Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractSyncedGraphQlResource } from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { MakeSyncGraphQlFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { FromRow } from '../types/Resource.types';
import { Shop } from '../Rest/Shop';
import { GraphQlResourceNames } from '../types/SupportedResource';

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
  limit?: number;
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

  // protected static readonly defaultLimit: number = 50;
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

    return async ({ cursor = null, limit }) => {
      return this.all({
        context,
        cursor,
        limit,
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
    limit = null,
    cursor = null,
    createdAtMin,
    createdAtMax,
    skus,
    updatedAtMax,
    updatedAtMin,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<InventoryItem>> {
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
        limit: limit ?? GRAPHQL_NODES_LIMIT,
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
      id: row.id !== undefined ? idToGraphQlGid(GraphQlResourceNames.InventoryItem, row.id) : undefined,
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
      variant:
        row.variant_id !== undefined
          ? { id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, row.variant_id) }
          : undefined,
    };

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
