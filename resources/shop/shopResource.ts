import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { ShopRow } from '../../schemas/CodaRows.types';
import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafields, ResourceSyncRestParams } from '../Resource.types';

// #region Rest Parameters
interface ShopSyncRestParams extends ResourceSyncRestParams {
  fields: string;
}
// #endregion

const shopResourceBase = {
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
} as const;

export type Shop = ResourceWithMetafields<
  typeof shopResourceBase,
  {
    codaRow: ShopRow;
    rest: {
      params: {
        sync: ShopSyncRestParams;
      };
    };
  }
>;
export const shopResource = shopResourceBase as Shop;
