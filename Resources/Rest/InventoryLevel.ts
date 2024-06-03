// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { SyncTableManagerRest } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_InventoryLevels } from '../../coda/setup/inventoryLevels-setup';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { InventoryLevelRow } from '../../schemas/CodaRows.types';
import { formatInventoryItemReference } from '../../schemas/syncTable/InventoryItemSchema';
import { InventoryLevelSyncTableSchema } from '../../schemas/syncTable/InventoryLevelSchema';
import { formatLocationReference } from '../../schemas/syncTable/LocationSchema';
import { parseOptionId } from '../../utils/helpers';
import { AbstractRestResource, FindAllRestResponse, SaveArgs } from '../Abstract/Rest/AbstractRestResource';
import { BaseContext, FromRow } from '../types/Resource.types';
import { RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';

// #endregion

interface DeleteArgs extends BaseContext {
  inventory_item_id?: unknown;
  location_id?: unknown;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  inventory_item_ids?: unknown;
  location_ids?: unknown;
  limit?: unknown;
  updated_at_min?: unknown;
}
interface AdjustArgs {
  [key: string]: unknown;
  inventory_item_id?: unknown;
  location_id?: unknown;
  available_adjustment?: number;
}
interface SetArgs {
  [key: string]: unknown;
  inventory_item_id?: unknown;
  location_id?: unknown;
  available?: unknown;
  disconnect_if_necessary?: unknown;
}
interface ConnectArgs extends BaseContext {
  [key: string]: unknown;
  inventory_item_id?: unknown;
  location_id?: unknown;
  relocate_if_necessary?: unknown;
  body?: { [key: string]: unknown } | null;
}

export class InventoryLevel extends AbstractRestResource {
  public apiData: {
    admin_graphql_api_id: string | null;
    available: number | null;
    inventory_item_id: number | null;
    location_id: number | null;
    updated_at: string | null;
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.InventoryLevel;

  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: [], path: 'inventory_levels.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'inventory_levels.json' },
    { http_method: 'post', operation: 'adjust', ids: [], path: 'inventory_levels/adjust.json' },
    { http_method: 'post', operation: 'connect', ids: [], path: 'inventory_levels/connect.json' },
    { http_method: 'post', operation: 'set', ids: [], path: 'inventory_levels/set.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.InventoryLevel,
      plural: RestResourcesPlural.InventoryLevel,
    },
  ];

  public static getStaticSchema() {
    return InventoryLevelSyncTableSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncFunctionArgs<
    typeof Sync_InventoryLevels,
    SyncTableManagerRest<InventoryLevel>
  >): SyncRestFunction<InventoryLevel> {
    const [location_ids, updated_at_min] = codaSyncParams;
    if (!location_ids || !location_ids.length) {
      throw new coda.UserVisibleError('At least one location is required.');
    }
    const parsedLocationIds = location_ids.map(parseOptionId);

    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: {
          location_ids: parsedLocationIds.join(','),
          updated_at_min,
        },
      });

      return this.all(params);
    };
  }

  public static async delete({ inventory_item_id = null, location_id = null, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<InventoryLevel>({
      urlIds: {},
      params: { inventory_item_id: inventory_item_id, location_id: location_id },
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    inventory_item_ids = null,
    location_ids = null,
    limit = null,
    updated_at_min = null,
    options = {},
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<InventoryLevel>> {
    const response = await this.baseFind<InventoryLevel>({
      context,
      urlIds: {},
      params: {
        inventory_item_ids: inventory_item_ids,
        location_ids: location_ids,
        limit,
        updated_at_min: updated_at_min,
        ...otherArgs,
      },
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async adjust({
    inventory_item_id = null,
    location_id = null,
    available_adjustment = null,
    ...otherArgs
  }: AdjustArgs): Promise<unknown> {
    const response = await this.request<InventoryLevel>({
      http_method: 'post',
      operation: 'adjust',
      context: this.context,
      urlIds: {},
      params: {
        inventory_item_id,
        location_id,
        available_adjustment,
        ...otherArgs,
      },
      entity: this,
    });

    return response ? response.body : null;
  }

  public async set({
    inventory_item_id = null,
    location_id = null,
    available = null,
    disconnect_if_necessary = null,
    ...otherArgs
  }: SetArgs): Promise<unknown> {
    const response = await this.request<InventoryLevel>({
      http_method: 'post',
      operation: 'set',
      context: this.context,
      urlIds: {},
      params: {
        inventory_item_id,
        location_id,
        available,
        disconnect_if_necessary,
        ...otherArgs,
      },
      entity: this,
    });

    return response ? response.body : null;
  }

  public async save({ update = false }: SaveArgs = {}): Promise<void> {
    const responseBody = await this.set(this.apiData);
    const body: any | undefined = responseBody ? responseBody['inventory_level'] : undefined;
    if (update && body) {
      this.setData(body);
    }
  }

  /*
  public async connect({
    inventory_item_id = null,
    location_id = null,
    relocate_if_necessary = null,
    body = null,
    ...otherArgs
  }: ConnectArgs): Promise<unknown> {
    const response = await this.request<InventoryLevel>({
      http_method: 'post',
      operation: 'connect',
      context: this.context,
      urlIds: {},
      params: {
        inventory_item_id: inventory_item_id,
        location_id: location_id,
        relocate_if_necessary: relocate_if_necessary,
        ...otherArgs,
      },
      body: body,
      entity: this,
    });

    return response ? response.body : null;
  }
  */

  protected formatToApi({ row }: FromRow<InventoryLevelRow>) {
    const splitIds = row.id.split(',');
    const inventoryItemId = parseInt(splitIds[0], 10);
    const locationId = parseInt(splitIds[1], 10);

    const apiData: Partial<typeof this.apiData> = {
      admin_graphql_api_id: row.admin_graphql_api_id,
      available: row.available,
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
    };

    return apiData;
  }

  public formatToRow(): InventoryLevelRow {
    const { apiData } = this;
    let obj: InventoryLevelRow = {
      ...apiData,
      id: [apiData.inventory_item_id, apiData.location_id].join(','),
      inventory_history_url: `${this.context.endpoint}/admin/products/inventory/${apiData.inventory_item_id}/inventory_history?location_id=${apiData.location_id}`,
    };
    if (apiData.inventory_item_id) {
      obj.inventory_item = formatInventoryItemReference(apiData.inventory_item_id);
    }
    if (apiData.location_id) {
      obj.location = formatLocationReference(apiData.location_id);
    }

    return obj;
  }
}
