import { RestResourceSingular, RestResourcePlural } from '../../Fetchers/ShopifyRestResource.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import type { Resource, ResourceSyncRestParams } from '../Resource.types';
import { CollectSyncTableSchema } from '../../schemas/syncTable/CollectSchema';
import { CollectRow } from '../../schemas/CodaRows.types';

// #region Rest Parameters
interface CollectSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  collection_id?: number;
}
// #endregion

export type Collect = Resource<{
  codaRow: CollectRow;
  schema: typeof CollectSyncTableSchema;
  params: {
    sync: CollectSyncRestParams;
  };
  rest: {
    singular: RestResourceSingular.Collect;
    plural: RestResourcePlural.Collect;
  };
}>;

export const collectResource = {
  display: 'Collect',
  schema: CollectSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Collection,
  },
  rest: {
    singular: RestResourceSingular.Collect,
    plural: RestResourcePlural.Collect,
  },
} as Collect;
