import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { LocationRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafieldDefinitionsNew } from '../Resource.types';

// #region GraphQl Parameters

// #endregion

export type Location = ResourceWithMetafieldDefinitionsNew<{
  codaRow: LocationRow;
  schema: typeof LocationSyncTableSchema;
  params: {};
  rest: {
    singular: RestResourceSingular.Location;
    plural: RestResourcePlural.Location;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Location;
  };
}>;

export const locationResource = {
  display: 'Location',
  schema: LocationSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Location,
    singular: 'location',
    plural: 'locations',
  },
  rest: {
    singular: RestResourceSingular.Location,
    plural: RestResourcePlural.Location,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Location,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as Location;
