// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  handleLocationUpdateJob,
  deactivateLocationGraphQl,
  formatLocationForSchemaFromGraphQlApi,
  activateLocationGraphQl,
  fetchLocationGraphQl,
  updateLocationGraphQl,
  formatGraphQlLocationEditAddressInputNew,
} from './locations-functions';
import { LocationSchema } from '../schemas/syncTable/LocationSchema';
import { sharedParameters } from '../shared-parameters';
import { IDENTITY_LOCATION, METAFIELD_PREFIX_KEY } from '../constants';
import { augmentSchemaWithMetafields, handleResourceMetafieldsUpdateGraphQl } from '../metafields/metafields-functions';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitionsGraphQl,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { arrayUnique, wrapGetSchemaForCli } from '../helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { QueryLocations } from './locations-graphql';
import { GetLocationsQuery, GetLocationsQueryVariables, GetSingleLocationQuery } from '../types/admin.generated';
import { LocationEditInput, MetafieldOwnerType } from '../types/admin.types';
import { ShopifyGraphQlRequestExtensions } from '../types/ShopifyGraphQlErrors';
import { GraphQlResource } from '../types/GraphQl';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';

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
  parameters: [
    parameters.locationID,

    // optional parameters
    { ...sharedParameters.inputName, description: 'The name of the location.', optional: true },
    { ...sharedParameters.inputAddress1, optional: true },
    { ...sharedParameters.inputAddress2, optional: true },
    { ...sharedParameters.inputCity, optional: true },
    { ...sharedParameters.inputCountryCode, optional: true },
    { ...sharedParameters.inputPhone, optional: true },
    { ...sharedParameters.inputProvinceCode, optional: true },
    { ...sharedParameters.inputZip, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Location metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  // TODO: get it to update metafield values added in dynamic schema
  // on dirait que ça déconne même en ajoutant includeUnknownProperties dans les schema. Pourtant je suis quasi sûr que ça avait déjà fonctionné avec mon pack coda-sync-plus…
  schema: coda.withIdentity(LocationSchema, IDENTITY_LOCATION),
  // schema: LocationSchema,
  execute: async function (
    [locationId, name, address1, address2, city, countryCode, phone, provinceCode, zip, metafields],
    context
  ) {
    let obj = { id: locationId };

    const locationGid = idToGraphQlGid(GraphQlResource.Location, locationId);
    const locationEditInput: LocationEditInput = {
      name,
      address: formatGraphQlLocationEditAddressInputNew({
        address1,
        address2,
        city,
        countryCode,
        phone,
        provinceCode,
        zip,
      }),
    };
    Object.keys(locationEditInput).forEach((key) => {
      if (locationEditInput[key] === undefined) delete locationEditInput[key];
    });

    const restResponse = await updateLocationGraphQl(locationGid, locationEditInput, context);
    if (restResponse.body?.data?.locationEdit?.location) {
      obj = {
        ...obj,
        ...formatLocationForSchemaFromGraphQlApi(restResponse.body.data.locationEdit.location, context),
      };
    }

    if (metafields && metafields.length) {
      console.log('metafields', metafields);
      const metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((s) => JSON.parse(s));
      await handleResourceMetafieldsUpdateGraphQl(locationGid, metafieldKeyValueSets, context);
    }

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
