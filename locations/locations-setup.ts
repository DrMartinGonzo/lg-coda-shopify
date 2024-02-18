// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  handleLocationUpdateJob,
  deactivateLocationGraphQl,
  formatLocationForSchemaFromGraphQlApi,
  activateLocationGraphQl,
  fetchLocationGraphQl,
} from './locations-functions';

import { LocationSchema } from '../schemas/syncTable/LocationSchema';
import { sharedParameters } from '../shared-parameters';
import { CACHE_MINUTE, IDENTITY_LOCATION, METAFIELD_PREFIX_KEY } from '../constants';
import { augmentSchemaWithMetafields } from '../metafields/metafields-functions';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitionsGraphQl,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { arrayUnique, compareByDisplayKey, wrapGetSchemaForCli } from '../helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { QueryLocations } from './locations-graphql';
import { GetLocationsQuery, GetLocationsQueryVariables, GetSingleLocationQuery } from '../types/admin.generated';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { MetafieldOwnerType } from '../types/admin.types';
import { ShopifyGraphQlRequestExtensions } from '../types/ShopifyGraphQlErrors';
import { GraphQlResource } from '../types/GraphQl';

// #endregion

async function getLocationSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = LocationSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(LocationSchema, MetafieldOwnerType.Location, context);
  }
  // admin_url and stock_url should always be the last featured properties, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  augmentedSchema.featuredProperties.push('stock_url');
  return augmentedSchema;
}

/**
 * The properties that can be updated when updating a location.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'Name', key: 'name', type: 'string' },
  { display: 'Address 1', key: 'address1', type: 'string' },
  { display: 'Address 2', key: 'address2', type: 'string' },
  { display: 'City', key: 'city', type: 'string' },
  { display: 'Country code', key: 'country_code', type: 'string' },
  { display: 'Phone', key: 'phone', type: 'string' },
  { display: 'Province code', key: 'province_code', type: 'string' },
  { display: 'Zip', key: 'zip', type: 'string' },
];
/**
 * The properties that can be updated when creating a location.
 */
// const standardCreateProps = standardUpdateProps;

const parameters = {
  locationID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'locationId',
    description: 'The ID of the location.',
  }),
  destinationLocationID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'destinationLocationId',
    description:
      'The ID of a destination location to which inventory, pending orders and moving transfers will be moved from the location to deactivate.',
  }),
};

// #region Sync Tables
export const Sync_Locations = coda.makeSyncTable({
  name: 'Locations',
  description: 'Return Locations from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_LOCATION,
  schema: LocationSchema,
  dynamicOptions: {
    getSchema: getLocationSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncLocations',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [sharedParameters.optionalSyncMetafields],
    execute: async function ([syncMetafields], context: coda.SyncExecutionContext) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getLocationSchema, context, { syncMetafields }));

      const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
      const defaultMaxEntriesPerRun = 50;
      const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        defaultMaxEntriesPerRun,
        prevContinuation,
        context
      );
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
      }

      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      let searchQuery = '';

      const payload = {
        query: QueryLocations,
        variables: {
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
          // searchQuery,
          metafieldKeys: effectiveMetafieldKeys,
          countMetafields: effectiveMetafieldKeys.length,
          includeMetafields: shouldSyncMetafields,
          includeFulfillmentService: standardFromKeys.includes('fulfillment_service'),
          includeLocalPickupSettings: standardFromKeys.includes('local_pickup_settings'),
        } as GetLocationsQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.locations?.pageInfo,
        },
        context
      );
      if (response && response.body.data?.locations) {
        const data = response.body.data as GetLocationsQuery;
        return {
          result: data.locations.nodes.map((location) => formatLocationForSchemaFromGraphQlApi(location, context)),
          continuation,
        };
      } else {
        return {
          result: [],
          continuation,
        };
      }
    },

    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Location }, context)
        : [];

      const jobs = updates.map((update) => handleLocationUpdateJob(update, metafieldDefinitions, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
    },
  },
});
// #endregion

// #region Actions
export const Action_UpdateLocation = coda.makeFormula({
  name: 'UpdateLocation',
  description: 'Update an existing Shopify location and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.locationID],
  varargParameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'key',
      description: 'The location property to update.',
      autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
        const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
          { ownerType: MetafieldOwnerType.Location, cacheTtlSecs: CACHE_MINUTE },
          context
        );
        const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
        const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
        return result.sort(compareByDisplayKey);
      },
    }),
    sharedParameters.varArgsPropValue,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  // TODO: get it to update metafield values added in dynamic schema
  // on dirait que ça déconne même en ajoutant includeUnknownProperties dans les schema. Pourtant je suis quasi sûr que ça avait déjà fonctionné avec mon pack coda-sync-plus…
  schema: coda.withIdentity(LocationSchema, IDENTITY_LOCATION),
  // schema: LocationSchema,
  execute: async function ([location_id, ...varargs], context) {
    // Build a Coda update object for Rest Admin and GraphQL API updates
    let update: coda.SyncUpdate<string, string, any>;

    const { metafieldDefinitions, metafieldUpdateCreateProps } =
      await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Location, context);
    const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

    update = {
      previousValue: { id: location_id },
      newValue: newValues,
      updatedFields: Object.keys(newValues),
    };
    // // TODO: should not be needed here if each Rest update function implement this cleaning
    // update.newValue = cleanQueryParams(update.newValue);

    // return handleLocationUpdateJob(update, metafieldDefinitions, context);
    const obj = await handleLocationUpdateJob(update, metafieldDefinitions, context);

    // On enleve tout ce qui est référence pour enlever de l'update withIdentity qui casse les references
    // const metafieldDefinitionsWithReference = metafieldDefinitions.filter(filterMetafieldDefinitionWithReference);
    // metafieldDefinitionsWithReference.forEach((definition) => {
    //   const fullKey = getMetafieldDefinitionFullKey(definition);
    //   const matchingSchemaKey = METAFIELD_PREFIX_KEY + fullKey;
    //   console.log('matchingSchemaKey', matchingSchemaKey);
    //   console.log('obj[matchingSchemaKey]', obj[matchingSchemaKey]);
    //   if (obj[matchingSchemaKey]) delete obj[matchingSchemaKey];
    // });
    // console.log('metafieldDefinitionsWithReference', metafieldDefinitionsWithReference);

    // obj[`Meta Single line text`] = obj['lgs_meta__custom.single_line_text'];
    // obj.location_id = location_id;

    // console.log('obj', obj);
    return obj;
  },
});

export const Action_ActivateLocation = coda.makeFormula({
  name: 'ActivateLocation',
  description: 'Activates a location.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...parameters.locationID, description: 'The ID of a location to deactivate.' }],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: coda.withIdentity(LocationSchema, IDENTITY_LOCATION),
  execute: async function ([locationID], context) {
    const response = await activateLocationGraphQl(idToGraphQlGid(GraphQlResource.Location, locationID), context);
    const location = response?.body?.data?.locationActivate?.location;
    return {
      id: locationID,
      name: location?.name,
      active: location?.isActive,
    } as coda.SchemaType<typeof LocationSchema>;
  },
});

export const Action_DeactivateLocation = coda.makeFormula({
  name: 'DeactivateLocation',
  description:
    'Deactivates a location and potentially moves inventory, pending orders, and moving transfers to a destination location.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...parameters.locationID, description: 'The ID of a location to deactivate.' },
    { ...parameters.destinationLocationID, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: coda.withIdentity(LocationSchema, IDENTITY_LOCATION),
  execute: async function ([locationID, destinationLocationID], context) {
    const response = await deactivateLocationGraphQl(
      idToGraphQlGid(GraphQlResource.Location, locationID),
      destinationLocationID ? idToGraphQlGid(GraphQlResource.Location, destinationLocationID) : undefined,
      context
    );
    const location = response?.body?.data?.locationDeactivate?.location;
    return {
      id: locationID,
      name: location?.name,
      active: location?.isActive,
    } as coda.SchemaType<typeof LocationSchema>;
  },
});
// #endregion

// #region Formulas
export const Formula_Location = coda.makeFormula({
  name: 'Location',
  description: 'Return a single location from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [sharedParameters.locationID],
  cacheTtlSecs: 10,
  resultType: coda.ValueType.Object,
  schema: LocationSchema,
  execute: async ([location_id], context) => {
    const locationResponse: coda.FetchResponse<{
      data: GetSingleLocationQuery;
      extensions: ShopifyGraphQlRequestExtensions;
    }> = await fetchLocationGraphQl(idToGraphQlGid(GraphQlResource.Location, location_id), context);

    if (locationResponse.body?.data?.location) {
      return formatLocationForSchemaFromGraphQlApi(locationResponse.body.data.location, context);
    }
  },
});

export const Format_Location: coda.Format = {
  name: 'Location',
  instructions: 'Paste the location Id into the column.',
  formulaName: 'Location',
};
// #endregion
