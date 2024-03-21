// #region Imports
import * as coda from '@codahq/packs-sdk';
import { print as printGql } from '@0no-co/graphql.web';
import { ResultOf, VariablesOf, FragmentOf, readFragment } from '../../utils/graphql';

import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { handleDynamicSchemaForCli } from '../../Fetchers/SyncTableRest';
import { CACHE_DEFAULT, CUSTOM_FIELD_PREFIX_KEY, Identity } from '../../constants';
import { arrayUnique, deepCopy } from '../../utils/helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { augmentSchemaWithMetafields } from '../../schemas/schema-helpers';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { CountryCode, MetafieldOwnerType } from '../../types/admin.types';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { updateAndFormatResourceMetafieldsGraphQl } from '../metafields/metafields-functions';
import { removePrefixFromMetaFieldKey, separatePrefixedMetafieldsKeysFromKeys } from '../metafields/metafields-helpers';
import {
  activateLocationGraphQl,
  deactivateLocationGraphQl,
  fetchSingleLocationGraphQl,
  formatGraphQlLocationEditInput,
  formatLocationForSchemaFromGraphQlApi,
  handleLocationUpdateJob,
  updateLocationGraphQl,
} from './locations-functions';
import { LocationFragment, QueryLocations } from './locations-graphql';

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
    parameters: [{ ...filters.general.syncMetafields, optional: true }],
    execute: async function ([syncMetafields], context: coda.SyncExecutionContext) {
      const schema = await handleDynamicSchemaForCli(getLocationSchema, context, { syncMetafields });
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
        query: printGql(QueryLocations),
        variables: {
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
          // searchQuery,
          metafieldKeys: effectiveMetafieldKeys,
          countMetafields: effectiveMetafieldKeys.length,
          includeMetafields: shouldSyncMetafields,
          includeFulfillmentService: standardFromKeys.includes('fulfillment_service'),
          includeLocalPickupSettings: standardFromKeys.includes('local_pickup_settings'),
        } as VariablesOf<typeof QueryLocations>,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof QueryLocations>>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.locations?.pageInfo,
        },
        context
      );
      if (response?.body?.data?.locations) {
        const locations = readFragment(LocationFragment, response.body.data.locations.nodes);
        return {
          result: locations.map((location) => formatLocationForSchemaFromGraphQlApi(location, context)),
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
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY));
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
    const locationGid = idToGraphQlGid(GraphQlResourceName.Location, locationId);
    const locationEditInput = formatGraphQlLocationEditInput({
      name,
      address1,
      address2,
      city,
      countryCode: countryCode as CountryCode,
      phone,
      provinceCode,
      zip,
    });

    const promises: (Promise<any> | undefined)[] = [];
    promises.push(updateLocationGraphQl(locationGid, locationEditInput, context));
    if (metafields && metafields.length) {
      promises.push(
        updateAndFormatResourceMetafieldsGraphQl(
          {
            ownerGid: locationGid,
            metafieldKeyValueSets: metafields.map((s) => JSON.parse(s)),
            schemaWithIdentity: false,
          },
          context
        )
      );
    } else {
      promises.push(undefined);
    }

    const [graphQlResponse, updatedFormattedMetafields] = await Promise.all(promises);
    const obj = {
      id: locationId,
      ...(graphQlResponse?.body?.data?.locationEdit?.location
        ? formatLocationForSchemaFromGraphQlApi(graphQlResponse.body.data.locationEdit.location, context)
        : {}),
      ...(updatedFormattedMetafields ?? {}),
    };

    return obj;
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
    const response = await activateLocationGraphQl(idToGraphQlGid(GraphQlResourceName.Location, locationID), context);
    const location = response?.body?.data?.locationActivate?.location;
    return {
      id: locationID,
      name: location?.name,
      active: location?.isActive,
    } as coda.SchemaType<typeof LocationSyncTableSchema>;
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
    const response = await deactivateLocationGraphQl(
      idToGraphQlGid(GraphQlResourceName.Location, locationID),
      destinationLocationID ? idToGraphQlGid(GraphQlResourceName.Location, destinationLocationID) : undefined,
      context
    );
    const location = response?.body?.data?.locationDeactivate?.location;
    return {
      id: locationID,
      name: location?.name,
      active: location?.isActive,
    } as coda.SchemaType<typeof LocationSyncTableSchema>;
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
    const locationResponse = await fetchSingleLocationGraphQl(
      idToGraphQlGid(GraphQlResourceName.Location, location_id),
      context
    );
    if (locationResponse.body?.data?.location) {
      const location = readFragment(LocationFragment, locationResponse.body.data.location);
      return formatLocationForSchemaFromGraphQlApi(location, context);
    }
  },
});

export const Format_Location: coda.Format = {
  name: 'Location',
  instructions: 'Paste the location ID into the column.',
  formulaName: 'Location',
};
// #endregion
