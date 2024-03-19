import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { CACHE_DEFAULT } from '../../constants';
import { GraphQlResponse, graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { CountryCode } from '../../types/admin.types';
import { MetafieldDefinitionFragment } from '../metafieldDefinitions/metafieldDefinitions-graphql';
import {
  formatMetaFieldValueForSchema,
  getMetafieldKeyValueSetsFromUpdate,
  updateAndFormatResourceMetafieldsGraphQl,
} from '../metafields/metafields-functions';
import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-helpers';
import {
  ActivateLocation,
  DeactivateLocation,
  LocationFragment,
  QueryLocations,
  QuerySingleLocation,
  UpdateLocation,
} from './locations-graphql';

// TODO: finir ça une fois qu'on aura une classe pour GraphQL
// export type LocationSyncTableType = SyncTableType<typeof locationResource, LocationRow, never, never, never>;

// #region Helpers
function formatGraphQlLocationEditAddressInput(parts: {
  address1?: string;
  address2?: string;
  city?: string;
  countryCode?: CountryCode;
  phone?: string;
  provinceCode?: string;
  zip?: string;
}) {
  const ret: VariablesOf<typeof UpdateLocation>['input']['address'] = {
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

export function formatGraphQlLocationEditInput(params: {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  countryCode?: CountryCode;
  phone?: string;
  provinceCode?: string;
  zip?: string;
}) {
  const ret: VariablesOf<typeof UpdateLocation>['input'] = {
    name: params.name,
    address: formatGraphQlLocationEditAddressInput({
      address1: params.address1,
      address2: params.address2,
      city: params.city,
      countryCode: params.countryCode,
      phone: params.phone,
      provinceCode: params.provinceCode,
      zip: params.zip,
    }),
  };

  Object.keys(ret).forEach((key) => {
    if (ret[key] === undefined) delete ret[key];
  });
  return ret;
}

export async function handleLocationUpdateJob(
  update: coda.SyncUpdate<string, string, typeof LocationSyncTableSchema>,
  metafieldDefinitions: Array<ResultOf<typeof MetafieldDefinitionFragment>>,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: (Promise<any> | undefined)[] = [];
  const locationId = update.previousValue.id as number;
  const locationGid = idToGraphQlGid(GraphQlResourceName.Location, locationId);

  if (standardFromKeys.length) {
    const locationEditInput = formatGraphQlLocationEditInput({
      name: update.newValue.name,
      address1: update.newValue.address1,
      address2: update.newValue.address2,
      city: update.newValue.city,
      countryCode: update.newValue.country_code as CountryCode,
      phone: update.newValue.phone,
      provinceCode: update.newValue.province_code,
      zip: update.newValue.zip,
    });

    subJobs.push(updateLocationGraphQl(locationGid, locationEditInput, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      updateAndFormatResourceMetafieldsGraphQl(
        {
          ownerGid: locationGid,
          metafieldKeyValueSets: await getMetafieldKeyValueSetsFromUpdate(
            prefixedMetafieldFromKeys,
            update.newValue,
            metafieldDefinitions,
            context
          ),
        },
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [graphQlResponse, metafields] = (await Promise.all(subJobs)) as [
    // TODO: better typing
    coda.FetchResponse<GraphQlResponse<ResultOf<typeof UpdateLocation>>>,
    { [key: string]: any }
  ];
  if (graphQlResponse?.body?.data?.locationEdit?.location) {
    obj = {
      ...obj,
      ...formatLocationForSchemaFromGraphQlApi(
        readFragment(LocationFragment, graphQlResponse.body.data.locationEdit.location),
        context
      ),
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
export const formatLocationForSchemaFromGraphQlApi = (location: ResultOf<typeof LocationFragment>, context) => {
  const location_id = graphQlGidToId(location.id);

  let obj: coda.SchemaType<typeof LocationSyncTableSchema> = {
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
    const metafields = readFragment(MetafieldFieldsFragment, location.metafields.nodes);
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
};
// #endregion

// #region GraphQl requests
export const fetchLocationsGraphQl = async (
  variables: VariablesOf<typeof QueryLocations>,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: printGql(QueryLocations),
    variables,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof QueryLocations>>(
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
    query: printGql(QuerySingleLocation),
    variables: {
      id: locationGid,
      includeMetafields: false,
      includeFulfillmentService: true,
      includeLocalPickupSettings: false,
    } as VariablesOf<typeof QuerySingleLocation>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof QuerySingleLocation>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response;
};

export async function updateLocationGraphQl(
  locationGid: string,
  locationEditInput: VariablesOf<typeof UpdateLocation>['input'],
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(UpdateLocation),
    variables: {
      id: locationGid,
      input: locationEditInput,
      includeMetafields: false,
      includeLocalPickupSettings: false,
      includeFulfillmentService: false,
    } as VariablesOf<typeof UpdateLocation>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof UpdateLocation>>(
    { ...requestOptions, payload, getUserErrors: (body) => body.data.locationEdit.userErrors },
    context
  );
  return response;
}

export async function activateLocationGraphQl(
  locationGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const payload = {
    query: printGql(ActivateLocation),
    variables: {
      locationId: locationGid,
    } as VariablesOf<typeof ActivateLocation>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof ActivateLocation>>(
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
) {
  const payload = {
    query: printGql(DeactivateLocation),
    variables: {
      locationId: locationGid,
      destinationLocationId: destinationLocationGid,
    } as VariablesOf<typeof DeactivateLocation>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof DeactivateLocation>>(
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
