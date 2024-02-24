import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT } from '../constants';

import { LocationSchema } from '../schemas/syncTable/LocationSchema';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import {
  separatePrefixedMetafieldsKeysFromKeys,
  preprendPrefixToMetaFieldKey,
  getMetaFieldFullKey,
  formatMetaFieldValueForSchema,
  getMetafieldKeyValueSetsFromUpdate,
  updateResourceMetafieldsFromSyncTableGraphQL,
} from '../metafields/metafields-functions';
import {
  GetLocationsQuery,
  GetLocationsQueryVariables,
  GetSingleLocationQueryVariables,
  LocationActivateMutation,
  LocationActivateMutationVariables,
  LocationDeactivateMutation,
  LocationDeactivateMutationVariables,
  LocationEditMutation,
  LocationEditMutationVariables,
  LocationFragment,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import { formatOptionNameId } from '../helpers';
import { LocationEditAddressInput, LocationEditInput } from '../types/admin.types';
import {
  ActivateLocation,
  DeactivateLocation,
  QueryLocations,
  QuerySingleLocation,
  UpdateLocation,
} from './locations-graphql';
import { ShopifyGraphQlRequestExtensions } from '../types/ShopifyGraphQlErrors';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { FetchRequestOptions } from '../types/Requests';

// #region Autocomplete functions
export async function autocompleteLocationsWithName(context: coda.ExecutionContext, search: string) {
  const variables = {
    maxEntriesPerRun: 250,
    includeMetafields: false,
    includeLocalPickupSettings: false,
    includeFulfillmentService: false,
  } as GetLocationsQueryVariables;
  const response = await fetchLocationsGraphQl(variables, context);

  return response.body.data.locations.nodes.map((location: LocationFragment) =>
    formatOptionNameId(location.name, graphQlGidToId(location.id))
  );
}

// #endregion

// #region Helpers
function formatGraphQlLocationEditInput(update: any, fromKeys: string[]): LocationEditInput {
  const ret: LocationEditInput = {
    name: update.newValue.name,
    address: formatGraphQlLocationEditAddressInput(update),
  };

  Object.keys(ret).forEach((key) => {
    if (ret[key] === undefined) delete ret[key];
  });
  return ret;
}

function formatGraphQlLocationEditAddressInput(update: any): LocationEditAddressInput {
  const ret: LocationEditAddressInput = {
    address1: update.newValue.address1,
    address2: update.newValue.address2,
    city: update.newValue.city,
    countryCode: update.newValue.country_code,
    phone: update.newValue.phone,
    provinceCode: update.newValue.province_code,
    zip: update.newValue.zip,
  };

  Object.keys(ret).forEach((key) => {
    if (ret[key] === undefined) delete ret[key];
  });

  return ret;
}

export function formatGraphQlLocationEditAddressInputNew(parts: any): LocationEditAddressInput {
  const ret: LocationEditAddressInput = {
    address1: parts?.address1,
    address2: parts?.address2,
    city: parts?.city,
    countryCode: parts?.countryCode,
    phone: parts?.phone,
    provinceCode: parts?.provinceCode,
    zip: parts?.zip,
  };

  Object.keys(ret).forEach((key) => {
    if (ret[key] === undefined) delete ret[key];
  });

  return ret;
}

// TODO: set metafields along with the location update ? There is still the problem that we can't update with a null value, we need to delete first
export async function handleLocationUpdateJob(
  update: coda.SyncUpdate<string, string, typeof LocationSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const locationId = update.previousValue.id as number;
  const locationGid = idToGraphQlGid(GraphQlResource.Location, locationId);

  if (standardFromKeys.length) {
    const locationEditInput = formatGraphQlLocationEditInput(update, standardFromKeys);
    subJobs.push(updateLocationGraphQl(locationGid, locationEditInput, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      updateResourceMetafieldsFromSyncTableGraphQL(
        locationGid,
        await getMetafieldKeyValueSetsFromUpdate(
          prefixedMetafieldFromKeys,
          update.newValue,
          metafieldDefinitions,
          context
        ),
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [graphQlResponse, metafields] = (await Promise.all(subJobs)) as [
    coda.FetchResponse<{ data: LocationEditMutation; extensions: ShopifyGraphQlRequestExtensions }>,
    { [key: string]: any }
  ];
  if (graphQlResponse?.body?.data?.locationEdit?.location) {
    obj = {
      ...obj,
      ...formatLocationForSchemaFromGraphQlApi(graphQlResponse.body.data.locationEdit.location, context),
    };
  }
  if (metafields) {
    obj = {
      ...obj,
      ...metafields,
    };
  }
  return obj;
}
// #endregion

// #region Formatting
export const formatLocationForSchemaFromGraphQlApi = (location: LocationFragment, context) => {
  const location_id = graphQlGidToId(location.id);

  let obj: coda.SchemaType<typeof LocationSchema> = {
    // ...location,
    id: location_id,
    graphql_gid: location.id,
    active: location.isActive,
    admin_url: `${context.endpoint}/admin/settings/locations/${location_id}`,
    stock_url: `${context.endpoint}/admin/products/inventory?location_id=${location_id}`,
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
    location.metafields.nodes.forEach((metafield) => {
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
};
// #endregion

// #region GraphQl requests
export const fetchLocationsGraphQl = async (
  variables: GetLocationsQueryVariables,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: QueryLocations,
    variables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response;
};

export const fetchSingleLocationGraphQl = async (
  locationGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: QuerySingleLocation,
    variables: {
      id: locationGid,
      includeMetafields: false,
      includeFulfillmentService: true,
      includeLocalPickupSettings: false,
    } as GetSingleLocationQueryVariables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response;
};

export async function updateLocationGraphQl(
  locationGid: string,
  locationEditInput: LocationEditInput,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ data: LocationEditMutation; extensions: ShopifyGraphQlRequestExtensions }>> {
  const payload = {
    query: UpdateLocation,
    variables: {
      id: locationGid,
      input: locationEditInput,
      includeMetafields: false,
      includeLocalPickupSettings: false,
      includeFulfillmentService: false,
    } as LocationEditMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.locationEdit.userErrors },
    context
  );
  return response;
}

export async function activateLocationGraphQl(
  locationGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ data: LocationActivateMutation; extensions: ShopifyGraphQlRequestExtensions }>> {
  const payload = {
    query: ActivateLocation,
    variables: {
      locationId: locationGid,
    } as LocationActivateMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.locationActivate.locationActivateUserErrors },
    context
  );
  return response;
}

export async function deactivateLocationGraphQl(
  locationGid: string,
  destinationLocationGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ data: LocationDeactivateMutation; extensions: ShopifyGraphQlRequestExtensions }>> {
  const payload = {
    query: DeactivateLocation,
    variables: {
      locationId: locationGid,
      destinationLocationId: destinationLocationGid,
    } as LocationDeactivateMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    {
      ...requestOptions,
      payload,
      getUserErrors: (body) => body.data.locationDeactivate.locationDeactivateUserErrors,
    },
    context
  );
  return response;
}
// #endregion
