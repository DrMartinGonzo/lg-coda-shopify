import * as coda from '@codahq/packs-sdk';

import { ClientGraphQl } from '../../Fetchers/ClientGraphQl';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { graphQlGidToId } from '../../helpers-graphql';
import { LocationRow } from '../../schemas/CodaRows.types';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';
import { formatMetaFieldValueForSchema } from '../../schemas/schema-helpers';
import { metafieldFieldsFragment } from '../metafields/metafields-graphql';
import { getMetaFieldFullKey, preprendPrefixToMetaFieldKey } from '../metafields/metafields-helpers';
import { Location, locationResource } from './locationResource';
import {
  activateLocationMutation,
  deactivateLocationMutation,
  editLocationMutation,
  getSingleLocationQuery,
  locationFragment,
} from './locations-graphql';

interface EditParams {
  gid: string;
  editInput: VariablesOf<typeof editLocationMutation>['input'];
}

interface DeactivateParams {
  gid: string;
  destinationGid: string;
}

export class LocationGraphQlFetcher extends ClientGraphQl<Location> {
  constructor(context: coda.ExecutionContext) {
    super(locationResource, context);
  }

  formatApiToRow(location: ResultOf<typeof locationFragment>): LocationRow {
    const location_id = graphQlGidToId(location.id);

    let obj: LocationRow = {
      id: location_id,
      graphql_gid: location.id,
      active: location.isActive,
      admin_url: `${this.context.endpoint}/admin/settings/locations/${location_id}`,
      stock_url: `${this.context.endpoint}/admin/products/inventory?location_id=${location_id}`,
      address1: location.address?.address1,
      address2: location.address?.address2,
      city: location.address?.city,
      country: location.address?.country,
      country_code: location.address?.countryCode,
      name: location.name,
      phone: location.address?.phone,
      province: location.address?.province,
      province_code: location.address?.provinceCode,
      zip: location.address?.zip,
      has_active_inventory: location.hasActiveInventory,
      ships_inventory: location.shipsInventory,
      fulfills_online_orders: location.fulfillsOnlineOrders,
    };

    if (location.metafields?.nodes) {
      const metafields = readFragment(metafieldFieldsFragment, location.metafields.nodes);
      metafields.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      });
    }
    if (location.localPickupSettingsV2) {
      obj.local_pickup_settings = location.localPickupSettingsV2;
    }
    if (location.fulfillmentService) {
      obj.fulfillment_service = location.fulfillmentService.handle;
    }

    return obj;
  }

  async fetch(locationGid: string, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      id: locationGid,
      includeMetafields: false,
      includeFulfillmentService: true,
      includeLocalPickupSettings: false,
    } as VariablesOf<typeof getSingleLocationQuery>;

    // TODO
    return this.makeRequest(getSingleLocationQuery, variables, requestOptions);
  }

  async update(params: EditParams, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      id: params.gid,
      input: params.editInput,
      includeMetafields: false,
      includeLocalPickupSettings: false,
      includeFulfillmentService: false,
    } as VariablesOf<typeof editLocationMutation>;

    return this.makeRequest(editLocationMutation, variables, requestOptions);
  }

  async activate(locationGid: string, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      locationId: locationGid,
    } as VariablesOf<typeof activateLocationMutation>;

    return this.makeRequest(activateLocationMutation, variables, requestOptions);
  }

  async deActivate(params: DeactivateParams, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      locationId: params.gid,
      destinationLocationId: params.destinationGid,
    } as VariablesOf<typeof deactivateLocationMutation>;

    return this.makeRequest(deactivateLocationMutation, variables, requestOptions);
  }
}
