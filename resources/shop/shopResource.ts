import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { ShopRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceSyncRestParams, ResourceWithMetafields } from '../Resource.types';

// #region Rest Parameters
interface ShopSyncRestParams extends ResourceSyncRestParams {
  fields: string;
}
// #endregion

export type Shop = ResourceWithMetafields<{
  codaRow: ShopRow;
  schema: typeof ShopSyncTableSchema;
  params: {
    sync: ShopSyncRestParams;
  };
  rest: {
    singular: RestResourceSingular.Shop;
    plural: RestResourcePlural.Shop;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Shop;
  };
}>;

export const shopResource = {
  display: 'Shop',
  schema: ShopSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Shop,
    singular: 'shop',
    plural: 'shop',
  },
  rest: {
    singular: RestResourceSingular.Shop,
    plural: RestResourcePlural.Shop,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Shop,
    // TODO: check this is correct
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: false,
  },
} as Shop;
