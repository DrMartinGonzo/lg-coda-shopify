import * as coda from '@codahq/packs-sdk';

import { SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { VariablesOf } from '../../utils/graphql';
import { LocationGraphQlFetcher } from './LocationGraphQlFetcher';
import { Location, locationResource } from './locationResource';
import { Sync_Locations } from './locations-coda';
import { getLocationsQuery } from './locations-graphql';

export class LocationSyncTable extends SyncTableGraphQl<Location> {
  constructor(fetcher: LocationGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(locationResource, fetcher, params);
    // TODO: get an approximation for first run by using count of relation columns ?
    this.initalMaxEntriesPerRun = 50;
  }

  setPayload(): void {
    const [syncMetafields] = this.codaParams as SyncTableParamValues<typeof Sync_Locations>;

    // Set query filters and remove any undefined filters
    let searchQuery = '';

    this.documentNode = getLocationsQuery;
    this.variables = {
      maxEntriesPerRun: this.maxEntriesPerRun,
      cursor: this.prevContinuation?.cursor ?? null,
      // searchQuery,
      metafieldKeys: this.effectiveMetafieldKeys,
      countMetafields: this.effectiveMetafieldKeys.length,
      includeMetafields: this.shouldSyncMetafields,
      includeFulfillmentService: this.effectiveStandardFromKeys.includes('fulfillment_service'),
      includeLocalPickupSettings: this.effectiveStandardFromKeys.includes('local_pickup_settings'),
    } as VariablesOf<typeof getLocationsQuery>;
  }
}
