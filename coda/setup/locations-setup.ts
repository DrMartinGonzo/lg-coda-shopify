// #region Imports
import * as coda from '@codahq/packs-sdk';

import { LocationClient } from '../../Clients/GraphQlClients';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { CACHE_DEFAULT } from '../../constants/cacheDurations-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { LocationModel } from '../../models/graphql/LocationModel';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { SyncedLocations } from '../../sync/graphql/SyncedLocations';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedLocations(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedLocations({
    context,
    codaSyncParams,
    model: LocationModel,
    client: LocationClient.createInstance(context),
  });
}
// #endregion

// #region Sync Tables
export const Sync_Locations = coda.makeSyncTable({
  name: 'Locations',
  description:
    'Return Locations from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Location,
  schema: SyncedLocations.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedLocations.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncLocations',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedLocations.codaParamsMap}
     */
    parameters: [{ ...filters.general.syncMetafields, optional: true }],
    execute: async (codaSyncParams, context) => createSyncedLocations(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedLocations(codaSyncParams, context).executeSyncUpdate(updates),
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
  // schema: coda.withIdentity(LocationSchema, IdentitiesNew.location),
  schema: LocationSyncTableSchema,
  execute: async function (
    [locationId, name, address1, address2, city, countryCode, phone, provinceCode, zip, metafields],
    context
  ) {
    const location = LocationModel.createInstanceFromRow(context, {
      id: locationId,
      name,
      address1,
      address2,
      city,
      country_code: countryCode,
      phone,
      province_code: provinceCode,
      zip,
    });
    if (metafields) {
      location.data.metafields = CodaMetafieldSet.createGraphQlMetafieldsArray(metafields, {
        context,
        ownerType: LocationModel.metafieldGraphQlOwnerType,
        ownerGid: location.graphQlGid,
      });
    }

    await location.save();
    return location.toCodaRow();
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
  // schema: coda.withIdentity(LocationSchema, IdentitiesNew.location),
  schema: LocationSyncTableSchema,
  execute: async function ([locationID], context) {
    const response = await LocationClient.createInstance(context).activate(
      idToGraphQlGid(GraphQlResourceNames.Location, locationID)
    );
    return LocationModel.createInstance(context, response.body).toCodaRow();
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
  // schema: coda.withIdentity(LocationSchema, IdentitiesNew.location),
  schema: LocationSyncTableSchema,
  execute: async function ([locationID, destinationLocationID], context) {
    const response = await LocationClient.createInstance(context).deActivate(
      idToGraphQlGid(GraphQlResourceNames.Location, locationID),
      idToGraphQlGid(GraphQlResourceNames.Location, destinationLocationID)
    );
    return LocationModel.createInstance(context, response.body).toCodaRow();
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
  execute: async ([locationID], context) => {
    const response = await LocationClient.createInstance(context).single({
      id: idToGraphQlGid(GraphQlResourceNames.Location, locationID),
    });
    return LocationModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Location: coda.Format = {
  name: 'Location',
  instructions: 'Paste the location ID into the column.',
  formulaName: 'Location',
};
// #endregion
