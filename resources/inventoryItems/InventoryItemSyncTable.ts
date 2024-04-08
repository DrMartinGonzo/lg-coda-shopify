import * as coda from '@codahq/packs-sdk';

import { SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { VariablesOf } from '../../utils/graphql';
import { InventoryItemGraphQlFetcher } from './InventoryItemGraphQlFetcher';
import { InventoryItem, inventoryItemResource } from './inventoryItemResource';
import { Sync_InventoryItems } from './inventoryItems-coda';
import { buildInventoryItemsSearchQuery, getInventoryItemsQuery } from './inventoryItems-graphql';

export class InventoryItemSyncTable extends SyncTableGraphQl<InventoryItem> {
  constructor(fetcher: InventoryItemGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(inventoryItemResource, fetcher, params);
    // TODO: get an approximation for first run by using count of relation columns ?
    this.initalMaxEntriesPerRun = 50;
  }

  setPayload(): void {
    const [createdAtRange, updatedAtRange, skus] = this.codaParams as SyncTableParamValues<typeof Sync_InventoryItems>;

    const queryFilters = {
      created_at_min: createdAtRange ? createdAtRange[0] : undefined,
      created_at_max: createdAtRange ? createdAtRange[1] : undefined,
      updated_at_min: updatedAtRange ? updatedAtRange[0] : undefined,
      updated_at_max: updatedAtRange ? updatedAtRange[1] : undefined,
      skus,
    };
    // Remove any undefined filters
    Object.keys(queryFilters).forEach((key) => {
      if (queryFilters[key] === undefined) delete queryFilters[key];
    });

    this.documentNode = getInventoryItemsQuery;
    this.variables = {
      maxEntriesPerRun: this.maxEntriesPerRun,
      cursor: this.prevContinuation?.cursor ?? null,
      searchQuery: buildInventoryItemsSearchQuery(queryFilters),
    } as VariablesOf<typeof getInventoryItemsQuery>;
  }
}
