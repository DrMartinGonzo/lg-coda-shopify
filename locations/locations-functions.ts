import * as coda from '@codahq/packs-sdk';

import { makeGetRequest } from '../helpers-rest';
import { CACHE_SINGLE_FETCH, RESOURCE_LOCATION, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { FormatFunction } from '../types/misc';

import { LocationSchema } from '../schemas/syncTable/LocationSchema';
import { idToGraphQlGid } from '../helpers-graphql';
import {
  separatePrefixedMetafieldsKeysFromKeys,
  handleResourceMetafieldsUpdateGraphQl,
} from '../metafields/metafields-functions';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import { formatOptionNameId } from '../helpers';

// #region Autocomplete functions
export async function autocompleteLocations(context: coda.ExecutionContext, search: string) {
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
  // const searchObjects = response.body.locations.map((location) => {
  //   return {
  //     ...location,
  //     // BUG: convert id to string as we use StringArray ParameterType
  //     // @see topic: https://community.coda.io/t/ui-and-typescript-bug-with-with-coda-parametertype-numberarray/46455
  //     string_id: location.id.toString(),
  //   };
  // });
  // return coda.autocompleteSearchObjects(search, searchObjects, 'name', 'string_id');
}

// #endregion

// #region Helpers
export function formatLocationStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof LocationSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    restParams[fromKey] = values[fromKey];
  });
  return restParams;
}

export async function handleLocationUpdateJob(
  update: coda.SyncUpdate<string, string, typeof LocationSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const locationId = update.previousValue.id as number;

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateGraphQl(
        idToGraphQlGid(RESOURCE_LOCATION, locationId),
        'location',
        metafieldDefinitions,
        update,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [metafields] = await Promise.all(subJobs);
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
export const formatLocationForSchemaFromRestApi: FormatFunction = (location, context) => {
  let obj: any = {
    ...location,
    admin_url: `${context.endpoint}/admin/settings/locations/${location.id}`,
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
