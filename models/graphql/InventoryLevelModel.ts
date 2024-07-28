// #region Imports
import * as coda from '@codahq/packs-sdk';
import { graphQlGidToId, idToGraphQlGid, ResultOf } from '../../graphql/utils/graphql-utils';

import { InventoryLevelClient } from '../../Clients/GraphQlClients';
import { POSSIBLE_QUANTITY_NAMES } from '../../constants/inventoryLevels-constants';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { inventoryLevelFragment } from '../../graphql/inventoryLevels-graphql';
import { InventoryLevelRow } from '../../schemas/CodaRows.types';
import { formatLocationReference } from '../../schemas/syncTable/LocationSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { splitAndTrimValues } from '../../utils/helpers';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export interface InventoryLevelGraphQlApiData extends BaseApiDataGraphQl, ResultOf<typeof inventoryLevelFragment> {}

export interface InventoryLevelGraphQlModelData
  extends Omit<InventoryLevelGraphQlApiData, 'location'>,
    BaseModelDataGraphQl {
  locationId?: string;
}
// #endregion

export class InventoryLevelModel extends AbstractModelGraphQl {
  public data: InventoryLevelGraphQlModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.InventoryLevel;
  protected static readonly graphQlName = GraphQlResourceNames.InventoryLevel;

  public static parseUniqueId(uniqueId: string) {
    const [InventoryLevelId, inventoryItemId] = splitAndTrimValues(uniqueId, ',');
    return { InventoryLevelId, inventoryItemId };
  }

  public static genUniqueId(id: string) {
    const inventoryLevelId = id.split('/').at(-1).split('?')[0];
    const inventoryItemId = id.split('=')[1];
    return [inventoryLevelId, inventoryItemId].join(',');
  }

  public static createInstanceFromRow(context: coda.ExecutionContext, row: InventoryLevelRow) {
    const { inventoryItemId, InventoryLevelId } = InventoryLevelModel.parseUniqueId(row.unique_id);

    let data: Partial<InventoryLevelGraphQlModelData> = {
      id:
        idToGraphQlGid(GraphQlResourceNames.InventoryLevel, InventoryLevelId) + `?inventory_item_id=${inventoryItemId}`,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      locationId: idToGraphQlGid(GraphQlResourceNames.Location, row.location?.id ?? row.location_id),
      quantities: [],
      item: {
        id: inventoryItemId,
        inventoryHistoryUrl: row.inventory_history_url,
        variant: {
          id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, row.variant?.id ?? row.variant_id),
        },
      },
    };

    POSSIBLE_QUANTITY_NAMES.forEach((name) => {
      if (name in row) {
        data.quantities.push({
          name,
          quantity: row[name],
        });
      }
    });

    return InventoryLevelModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return InventoryLevelClient.createInstance(this.context);
  }

  public async set() {
    const response = await this.client.set(this.getApiData());
    if (response) this.setData(response.body);
  }

  public async save() {
    await this.set();
  }

  public toCodaRow(): InventoryLevelRow {
    const { quantities = [], ...data } = this.data;
    const locationId = graphQlGidToId(data.locationId);
    const variantId = graphQlGidToId(data.item?.variant?.id);

    let obj: Partial<InventoryLevelRow> = {
      unique_id: InventoryLevelModel.genUniqueId(this.graphQlGid),
      inventory_item_id: graphQlGidToId(data.item?.id),
      updated_at: data.updatedAt,
      created_at: data.createdAt,
      location_id: locationId,
      variant_id: variantId,
    };

    quantities.forEach((q) => {
      obj[q.name] = q.quantity;
    });

    if (locationId) {
      obj.location = formatLocationReference(locationId);
      if (data.item?.inventoryHistoryUrl) {
        obj.inventory_history_url = `${data.item.inventoryHistoryUrl}?location_id=${locationId}`;
      }
    }
    if (variantId) {
      obj.variant = formatProductVariantReference(variantId);
    }

    return obj as InventoryLevelRow;
  }
}
