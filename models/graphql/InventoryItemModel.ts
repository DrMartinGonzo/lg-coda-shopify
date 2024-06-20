// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, graphQlGidToId, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import { InventoryItemClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { inventoryItemFieldsFragment } from '../../graphql/inventoryItems-graphql';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { CountryCode } from '../../types/admin.types';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';
import { safeToFloat, safeToString } from '../../utils/helpers';

// #endregion

// #region Types
export interface InventoryItemApiData extends BaseApiDataGraphQl, ResultOf<typeof inventoryItemFieldsFragment> {}

export interface InventoryItemModelData extends BaseModelDataGraphQl, InventoryItemApiData {}
// #endregion

export class InventoryItemModel extends AbstractModelGraphQl {
  public data: InventoryItemModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.InventoryItem;
  protected static readonly graphQlName = GraphQlResourceNames.InventoryItem;

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    { variant, variant_id, ...row }: InventoryItemRow
  ) {
    let data: Partial<InventoryItemModelData> = {
      id: idToGraphQlGid(GraphQlResourceNames.InventoryItem, row.id),
      createdAt: safeToString(row.created_at),
      inventoryHistoryUrl: row.inventory_history_url,
      requiresShipping: row.requires_shipping,
      sku: row.sku,
      tracked: row.tracked,
      updatedAt: safeToString(row.updated_at),
      countryCodeOfOrigin: row.country_code_of_origin as CountryCode,
      harmonizedSystemCode: row.harmonized_system_code,
      provinceCodeOfOrigin: row.province_code_of_origin,
      unitCost: {
        amount: row.cost,
        currencyCode: undefined,
      },
      variant: { id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, variant_id) },
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
    const { variant, ...data } = this.data;

    let obj: Partial<InventoryItemRow> = {
      admin_graphql_api_id: data.id,
      id: graphQlGidToId(data.id),
      cost: safeToFloat(data.unitCost?.amount) ?? null,
      country_code_of_origin: data.countryCodeOfOrigin,
      created_at: safeToString(data.createdAt),
      harmonized_system_code: data.harmonizedSystemCode,
      province_code_of_origin: data.provinceCodeOfOrigin,
      requires_shipping: data.requiresShipping,
      sku: data.sku,
      tracked: data.tracked,
      updated_at: safeToString(data.updatedAt),
      inventory_history_url: data.inventoryHistoryUrl,
    };

    if (variant?.id) {
      const variantId = graphQlGidToId(variant?.id);
      obj.variant = formatProductVariantReference(variantId);
      obj.variant_id = variantId;
    }

    return obj as InventoryItemRow;
  }
}
