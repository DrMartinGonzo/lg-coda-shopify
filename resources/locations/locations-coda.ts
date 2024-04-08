// #region Imports
import * as coda from '@codahq/packs-sdk';
import { readFragment } from '../../utils/graphql';

import { GraphQlResourceName } from '../ShopifyResource.types';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { idToGraphQlGid } from '../../helpers-graphql';
import { LocationRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, resolveSchemaFromContext } from '../../schemas/schema-helpers';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy } from '../../utils/helpers';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { getMetafieldKeyValueSetsFromUpdate } from '../metafields/utils/metafields-utils-keyValueSets';
import { parseMetafieldsCodaInput } from '../metafields/utils/metafields-utils-keyValueSets';
import { hasMetafieldsInUpdates } from '../metafields/utils/metafields-utils';
import { LocationGraphQlFetcher } from './LocationGraphQlFetcher';
import { LocationSyncTable } from './LocationSyncTable';
import { handleLocationUpdateJob } from './locations-functions';
import { locationFragment } from './locations-graphql';

// #endregion

async function getLocationSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = deepCopy(LocationSyncTableSchema);
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(LocationSyncTableSchema, MetafieldOwnerType.Location, context);
  }
  // @ts-ignore: admin_url and stock_url should always be the last featured properties, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties = [...augmentedSchema.featuredProperties, 'admin_url', 'stock_url'];
  return augmentedSchema;
}

async function resolveLocationSchemaFromContext(params, context: coda.SyncExecutionContext) {
  const [syncMetafields] = params;
  return resolveSchemaFromContext(getLocationSchema, context, { syncMetafields });
}

// #region Sync Tables
export const Sync_Locations = coda.makeSyncTable({
  name: 'Locations',
  description:
    'Return Locations from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Location,
  schema: LocationSyncTableSchema,
  dynamicOptions: {
    getSchema: getLocationSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncLocations',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link resolveLocationSchemaFromContext}
     *  - {@link LocationSyncTable}
     */
    parameters: [{ ...filters.general.syncMetafields, optional: true }],
    execute: async function (params, context) {
      const schema = await resolveLocationSchemaFromContext(params, context);
      const locationFetcher = new LocationGraphQlFetcher(context);
      const locationSynctable = new LocationSyncTable(locationFetcher, schema, params);
      return locationSynctable.executeSync();
    },

    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const metafieldDefinitions = hasMetafieldsInUpdates(updates)
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Location }, context)
        : [];

      const jobs = updates.map(async (update) => {
        const originalRow = update.previousValue as unknown as LocationRow;
        const updatedRow = Object.fromEntries(
          Object.entries(update.newValue).filter(([key]) => update.updatedFields.includes(key) || key == 'id')
        ) as LocationRow;

        const metafieldKeyValueSets = await getMetafieldKeyValueSetsFromUpdate(
          updatedRow,
          metafieldDefinitions,
          context
        );

        return handleLocationUpdateJob(
          {
            original: originalRow,
            updated: updatedRow,
          },
          metafieldKeyValueSets,
          context
        );
      });

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
    inputs.location.id,

    // optional parameters
    { ...inputs.location.name, description: 'The name of the location.', optional: true },
    { ...inputs.location.address1, optional: true },
    { ...inputs.location.address2, optional: true },
    { ...inputs.location.city, optional: true },
    { ...inputs.location.countryCode, optional: true },
    { ...inputs.general.phone, optional: true },
    { ...inputs.location.provinceCode, optional: true },
    { ...inputs.location.zip, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Location'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(LocationSchema, Identity.Location),
  schema: LocationSyncTableSchema,
  execute: async function (
    [locationId, name, address1, address2, city, countryCode, phone, provinceCode, zip, metafields],
    context
  ) {
    let row: LocationRow = {
      id: locationId,
      name,
      address1,
      address2,
      city,
      country_code: countryCode,
      phone,
      province_code: provinceCode,
      zip,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    return handleLocationUpdateJob({ original: undefined, updated: row }, metafieldKeyValueSets, context);
  },
});

export const Action_ActivateLocation = coda.makeFormula({
  name: 'ActivateLocation',
  description: 'Activates a location.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...inputs.location.id, description: 'The ID of a location to deactivate.' }],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(LocationSchema, Identity.Location),
  schema: LocationSyncTableSchema,
  execute: async function ([locationID], context) {
    const locationGid = idToGraphQlGid(GraphQlResourceName.Location, locationID);
    const locationFetcher = new LocationGraphQlFetcher(context);
    const { response } = await locationFetcher.activate(locationGid);

    const location = response?.body?.data?.locationActivate?.location;
    return {
      id: locationID,
      graphql_gid: locationGid,
      name: location?.name,
      active: location?.isActive,
    } as LocationRow;
  },
});

export const Action_DeactivateLocation = coda.makeFormula({
  name: 'DeactivateLocation',
  description:
    'Deactivates a location and potentially moves inventory, pending orders, and moving transfers to a destination location.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.location.id, description: 'The ID of a location to deactivate.' },
    { ...inputs.location.deactivateDestinationId, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(LocationSchema, Identity.Location),
  schema: LocationSyncTableSchema,
  execute: async function ([locationID, destinationLocationID], context) {
    const locationGid = idToGraphQlGid(GraphQlResourceName.Location, locationID);
    const destinationLocationGid = destinationLocationID
      ? idToGraphQlGid(GraphQlResourceName.Location, destinationLocationID)
      : undefined;
    const locationFetcher = new LocationGraphQlFetcher(context);
    const { response } = await locationFetcher.deActivate({ gid: locationGid, destinationGid: destinationLocationGid });

    const location = response?.body?.data?.locationDeactivate?.location;
    return {
      id: locationID,
      graphql_gid: locationGid,
      name: location?.name,
      active: location?.isActive,
    } as LocationRow;
  },
});
// #endregion

// #region Formulas
export const Formula_Location = coda.makeFormula({
  name: 'Location',
  description: 'Return a single location from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.location.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: LocationSyncTableSchema,
  execute: async ([location_id], context) => {
    const locationGid = idToGraphQlGid(GraphQlResourceName.Location, location_id);
    const locationFetcher = new LocationGraphQlFetcher(context);
    const { response } = await locationFetcher.fetch(locationGid, { cacheTtlSecs: CACHE_DEFAULT });
    if (response.body?.data?.location) {
      const location = readFragment(locationFragment, response.body.data.location);
      return locationFetcher.formatApiToRow(location);
    }
  },
});

export const Format_Location: coda.Format = {
  name: 'Location',
  instructions: 'Paste the location ID into the column.',
  formulaName: 'Location',
};
// #endregion
