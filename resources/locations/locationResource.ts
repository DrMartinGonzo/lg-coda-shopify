import { GraphQlResourceName } from '../ShopifyResource.types';
import { RestResourcePlural, RestResourceSingular } from '../ShopifyResource.types';
import { LocationRow } from '../../schemas/CodaRows.types';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafieldDefinitions } from '../Resource.types';

const locationResourceBase = {
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
} as const;

export type Location = ResourceWithMetafieldDefinitions<
  typeof locationResourceBase,
  {
    codaRow: LocationRow;
  }
>;

export const locationResource = locationResourceBase as Location;
