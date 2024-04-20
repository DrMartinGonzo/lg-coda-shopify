// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { FromRow } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { Location } from '../../Resources/GraphQl/Location';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { LocationRow } from '../../schemas/CodaRows.types';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';
import { GraphQlResourceNames } from '../../Resources/types/Resource.types';
import { NotFoundVisibleError } from '../../Errors/Errors';

// #endregion

// #region Sync Tables
export const Sync_Locations = coda.makeSyncTable({
  name: 'Locations',
  description:
    'Return Locations from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Location,
  schema: LocationSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Location.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncLocations',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Location.getDynamicSchema}
     */
    parameters: [{ ...filters.general.syncMetafields, optional: true }],
    execute: async function (params, context) {
      return Location.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Location.syncUpdate(params, updates, context);
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
  // schema: coda.withIdentity(LocationSchema, IdentitiesNew.location),
  schema: LocationSyncTableSchema,
  execute: async function (
    [locationId, name, address1, address2, city, countryCode, phone, provinceCode, zip, metafields],
    context
  ) {
    const fromRow: FromRow<LocationRow> = {
      row: {
        id: locationId,
        name,
        address1,
        address2,
        city,
        country_code: countryCode,
        phone,
        province_code: provinceCode,
        zip,
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: locationId, owner_resource: Location.metafieldRestOwnerType })
      ),
    };

    const updatedLocation = new Location({ context, fromRow });
    await updatedLocation.saveAndUpdate();
    return updatedLocation.formatToRow();
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
    const fromRow: FromRow<LocationRow> = { row: { id: locationID } };
    const location = new Location({ context, fromRow });
    await location.activate();
    return location.formatToRow();
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
    const location = new Location({
      context,
      fromRow: { row: { id: locationID } },
    });
    const destinationGid = destinationLocationID
      ? idToGraphQlGid(GraphQlResourceNames.Location, destinationLocationID)
      : undefined;

    await location.deActivate(destinationGid);
    return location.formatToRow();
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
    const location = await Location.find({ context, id: idToGraphQlGid(GraphQlResourceNames.Location, location_id) });
    if (location) {
      return location.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.Location);
  },
});

export const Format_Location: coda.Format = {
  name: 'Location',
  instructions: 'Paste the location ID into the column.',
  formulaName: 'Location',
};
// #endregion
