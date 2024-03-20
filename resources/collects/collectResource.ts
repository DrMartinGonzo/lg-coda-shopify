import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { CollectRow } from '../../schemas/CodaRows.types';
import { CollectSyncTableSchema } from '../../schemas/syncTable/CollectSchema';
import type { Resource, ResourceSyncRestParams } from '../Resource.types';

// #region Rest Parameters
interface CollectSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  collection_id?: number;
}
// #endregion

const collectResourceBase = {
  display: 'Collect',
  schema: CollectSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Collection,
  },
  rest: {
    singular: RestResourceSingular.Collect,
    plural: RestResourcePlural.Collect,
  },
} as const;

export type Collect = Resource<
  typeof collectResourceBase,
  {
    codaRow: CollectRow;
    rest: {
      params: {
        sync: CollectSyncRestParams;
      };
    };
  }
>;
export const collectResource = collectResourceBase as Collect;
