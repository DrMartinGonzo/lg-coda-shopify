import * as coda from '@codahq/packs-sdk';

import { makeGetRequest } from '../helpers-rest';
import { CACHE_SINGLE_FETCH, RESOURCE_LOCATION, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';

import { LocationSchema } from '../schemas/syncTable/LocationSchema';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import {
  separatePrefixedMetafieldsKeysFromKeys,
  handleResourceMetafieldsUpdateGraphQl,
} from '../metafields/metafields-functions';
import {
  LocationEditMutation,
  LocationEditMutationVariables,
  LocationFragment,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import { formatOptionNameId } from '../helpers';
import { LocationEditAddressInput, LocationEditInput } from '../types/admin.types';
import type { Location as LocationRest } from '@shopify/shopify-api/rest/admin/2023-10/location';
import { UpdateLocation } from './locations-graphql';
import { ShopifyGraphQlRequestExtensions } from '../types/ShopifyGraphQlErrors';

// #region Autocomplete functions
export async function autocompleteLocationsWithName(context: coda.ExecutionContext, search: string) {
  const restParams = {
    fields: ['name', 'id'].join(', '),
    limit: REST_DEFAULT_LIMIT,
  };
  const url = coda.withQueryParams(
    `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/locations.json`,
    restParams
  );
  const response = await makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.locations.map((location) => formatOptionNameId(location.name, location.id));
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

export async function handleLocationUpdateJob(
  update: coda.SyncUpdate<string, string, typeof LocationSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const locationId = update.previousValue.id as number;
  const locationGid = idToGraphQlGid(RESOURCE_LOCATION, locationId);

  if (standardFromKeys.length) {
    const locationEditInput = formatGraphQlLocationEditInput(update, standardFromKeys);
    subJobs.push(updateLocationGraphQl(locationGid, locationEditInput, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(handleResourceMetafieldsUpdateGraphQl(locationGid, 'location', metafieldDefinitions, update, context));
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [graphQlResponse, metafields] = await Promise.allSettled(subJobs);
  if (graphQlResponse.status === 'fulfilled' && graphQlResponse.value) {
    const response: coda.FetchResponse<{ data: LocationEditMutation; extensions: ShopifyGraphQlRequestExtensions }> =
      graphQlResponse.value;
    if (response.body?.data?.locationEdit?.location) {
      obj = {
        ...obj,
        ...formatLocationForSchemaFromGraphQlApi(response.body.data.locationEdit.location, context),
      };
    }
  } else if (graphQlResponse.status === 'rejected') {
    throw new coda.UserVisibleError(graphQlResponse.reason);
  }

  if (metafields.status === 'fulfilled' && metafields.value) {
    if (metafields.value) {
      obj = {
        ...obj,
        ...metafields.value,
      };
    }
  } else if (metafields.status === 'rejected') {
    throw new coda.UserVisibleError(metafields.reason);
  }

  return obj;
}
// #endregion

// #region Formatting
export const formatLocationForSchemaFromRestApi = (location: LocationRest, context) => {
  let obj: coda.SchemaType<typeof LocationSchema> = {
    ...location,
    admin_url: `${context.endpoint}/admin/settings/locations/${location.id}`,
    country: location.country_name,
  };

  return obj;
};

export const formatLocationForSchemaFromGraphQlApi = (location: LocationFragment, context) => {
  const location_id = graphQlGidToId(location.id);

  let obj: coda.SchemaType<typeof LocationSchema> = {
    ...location,
    id: location_id,
    graphql_gid: location.id,
    active: location.isActive,
    admin_url: `${context.endpoint}/admin/settings/locations/${location_id}`,
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
    // created_at: location.address?.address1,
    // legacy: location.address?.address1,
  };

  return obj;
};
// #endregion

// #region Rest requests
export const fetchLocationRest = (location_id: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/locations/${location_id}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
};
// #endregion

// #region GraphQl requests
export async function updateLocationGraphQl(
  locationGid: string,
  locationEditInput: LocationEditInput,
  context: coda.ExecutionContext
): Promise<coda.FetchResponse<{ data: LocationEditMutation; extensions: ShopifyGraphQlRequestExtensions }>> {
  const payload = {
    query: UpdateLocation,
    variables: {
      id: locationGid,
      input: locationEditInput,
    } as LocationEditMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    {
      payload,
      getUserErrors: (body) => body.data.locationEdit.userErrors,
    },
    context
  );
  return response;
}
// #endregion
