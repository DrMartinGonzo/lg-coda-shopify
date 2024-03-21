import * as coda from '@codahq/packs-sdk';

import { ClientGraphQl } from '../../Fetchers/ClientGraphQl';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { graphQlGidToId, idToGraphQlGid } from '../../helpers-graphql';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { CountryCode } from '../../types/admin.types';
import { ResultOf, VariablesOf } from '../../utils/graphql';
import { isNullOrEmpty } from '../../utils/helpers';
import { InventoryItem, inventoryItemResource } from './inventoryItemResource';
import { InventoryItemFieldsFragment, UpdateInventoryItem } from './inventoryItems-graphql';

export class InventoryItemGraphQlFetcher extends ClientGraphQl<InventoryItem> {
  constructor(context: coda.ExecutionContext) {
    super(inventoryItemResource, context);
  }

  formatApiToRow(inventoryItem: ResultOf<typeof InventoryItemFieldsFragment>): InventoryItemRow {
    const obj: any = {
      ...inventoryItem,
      admin_graphql_api_id: inventoryItem.id,
      id: graphQlGidToId(inventoryItem.id),
      cost: inventoryItem.unitCost?.amount,
      country_code_of_origin: inventoryItem.countryCodeOfOrigin,
      created_at: inventoryItem.createdAt,
      harmonized_system_code: inventoryItem.harmonizedSystemCode,
      province_code_of_origin: inventoryItem.provinceCodeOfOrigin,
      requires_shipping: inventoryItem.requiresShipping,
      sku: inventoryItem.sku,
      tracked: inventoryItem.tracked,
      updated_at: inventoryItem.updatedAt,
      inventory_history_url: inventoryItem.inventoryHistoryUrl,
    };

    if (inventoryItem.variant?.id) {
      const variantId = graphQlGidToId(inventoryItem.variant?.id);
      obj.variant = formatProductVariantReference(variantId);
      obj.variant_id = variantId;
    }

    return obj;
  }

  /**
   * Format InventoryItem data from Coda for a GraphQL InventoryItem update mutation
   */
  formatRowToApi(row: InventoryItemRow, metafieldKeyValueSets?: any[]) {
    const ret: VariablesOf<typeof UpdateInventoryItem> = {
      id: idToGraphQlGid(this.resource.graphQl.name, row.id),
      input: {},
    };

    if (row.cost !== undefined) {
      /* Edge case for cost. Setting it to 0 should delete the value. */
      ret.input.cost = isNullOrEmpty(row.cost) || row.cost === 0 ? null : row.cost;
    }
    if (row.country_code_of_origin !== undefined) {
      ret.input.countryCodeOfOrigin = isNullOrEmpty(row.country_code_of_origin)
        ? null
        : (row.country_code_of_origin as CountryCode);
    }
    if (row.harmonized_system_code !== undefined) {
      ret.input.harmonizedSystemCode = isNullOrEmpty(row.harmonized_system_code) ? null : row.harmonized_system_code;
    }
    if (row.province_code_of_origin !== undefined) {
      ret.input.provinceCodeOfOrigin = isNullOrEmpty(row.province_code_of_origin) ? null : row.province_code_of_origin;
    }
    if (row.tracked !== undefined) {
      ret.input.tracked = isNullOrEmpty(row.tracked) ? false : row.tracked;
    }

    // No input, we have nothing to update.
    if (Object.keys(ret.input).length === 0) return undefined;

    return ret;
  }

  async update(variables: VariablesOf<typeof UpdateInventoryItem>, requestOptions: FetchRequestOptions = {}) {
    return this.makeRequest('update', variables, requestOptions);
  }
}
