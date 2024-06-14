// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, graphQlGidToId, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import { InventoryItemClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { inventoryItemFieldsFragment } from '../../graphql/inventoryItems-graphql';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { CountryCode } from '../../types/admin.types';
import { GraphQlResourceNames } from '../types/SupportedResource';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export type InventoryItemApiData = BaseApiDataGraphQl & ResultOf<typeof inventoryItemFieldsFragment>;

export type InventoryItemModelData = BaseModelDataGraphQl & InventoryItemApiData;
// #endregion

export class InventoryItemModel extends AbstractModelGraphQl {
  public data: InventoryItemModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.InventoryItem;
  protected static readonly graphQlName = GraphQlResourceNames.InventoryItem;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: InventoryItemRow) {
    let data: Partial<InventoryItemModelData> = {
      id: idToGraphQlGid(GraphQlResourceNames.InventoryItem, row.id),
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
      variant: { id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, row.variant_id) },
    };

    return InventoryItemModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return InventoryItemClient.createInstance(this.context);
  }

  public toCodaRow(): InventoryItemRow {
    const { data } = this;

    let obj: Partial<InventoryItemRow> = {
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

    return obj as InventoryItemRow;
  }
}
