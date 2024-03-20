import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { LocationRow } from '../../schemas/CodaRows.types';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafieldDefinitions } from '../Resource.types';
import {
  ActivateLocation,
  DeactivateLocation,
  QueryLocations,
  QuerySingleLocation,
  UpdateLocation,
} from './locations-graphql';

// #region GraphQl Parameters

// #endregion

const locationResourceBase = {
  display: 'Location',
  schema: LocationSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Location,
    singular: 'location',
    plural: 'locations',
    operations: {
      fetchSingle: QuerySingleLocation,
      fetchAll: QueryLocations,
      update: UpdateLocation,
      activate: ActivateLocation,
      deActivate: DeactivateLocation,
    },
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
} as const;

export type Location = ResourceWithMetafieldDefinitions<
  typeof locationResourceBase,
  {
    codaRow: LocationRow;
    rest: {
      params: {};
    };
  }
>;

export const locationResource = locationResourceBase as Location;
