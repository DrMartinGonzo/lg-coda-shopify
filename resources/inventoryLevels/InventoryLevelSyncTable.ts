import * as coda from '@codahq/packs-sdk';

import type { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { SyncTableRest } from '../../Fetchers/SyncTableRest';
import { parseOptionId } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { InventoryLevelRestFetcher } from './InventoryLevelRestFetcher';
import { InventoryLevel, inventoryLevelResource } from './inventoryLevelResource';
import type { Sync_InventoryLevels } from './inventoryLevels-coda';

export class InventoryLevelSyncTable extends SyncTableRest<InventoryLevel> {
  constructor(fetcher: InventoryLevelRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(inventoryLevelResource, fetcher, params);
  }

  setSyncParams() {
    const [location_ids, updated_at_min] = this.codaParams as SyncTableParamValues<typeof Sync_InventoryLevels>;
    const parsedLocationIds = location_ids.map(parseOptionId);

    this.syncParams = cleanQueryParams({
      limit: this.restLimit,
      location_ids: parsedLocationIds.join(','),
      updated_at_min,
    });
  }
}
