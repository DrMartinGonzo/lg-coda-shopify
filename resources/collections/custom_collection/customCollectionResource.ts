import { CollectionSyncTableSchema } from '../../../schemas/syncTable/CollectionSchema';
import { GraphQlResourceName } from '../../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../../Fetchers/ShopifyRestResource.types';
import { CollectionRow } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { ResourceWithMetafieldDefinitionsNew } from '../../Resource.types';
import {
  CollectionCreateRestParams,
  CollectionSyncRestParams,
  CollectionUpdateRestParams,
} from '../collectionResource';

// #region Rest Parameters
interface CustomCollectionSyncRestParams extends CollectionSyncRestParams {}

interface CustomCollectionCreateRestParams extends CollectionCreateRestParams {}

interface CustomCollectionUpdateRestParams extends CollectionUpdateRestParams {}
// #endregion

export type CustomCollection = ResourceWithMetafieldDefinitionsNew<{
  codaRow: CollectionRow;
  schema: typeof CollectionSyncTableSchema;
  params: {
    sync: CustomCollectionSyncRestParams;
    create: CustomCollectionCreateRestParams;
    update: CustomCollectionUpdateRestParams;
  };
  rest: {
    singular: RestResourceSingular.CustomCollection;
    plural: RestResourcePlural.CustomCollection;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Collection;
  };
}>;

export const customCollectionResource = {
  display: 'Custom Collection',
  schema: CollectionSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Collection,
    singular: 'collection',
    plural: 'collections',
  },
  rest: {
    singular: RestResourceSingular.CustomCollection,
    plural: RestResourcePlural.CustomCollection,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Collection,
    useGraphQl: true,
    hasSyncTable: false,
    supportsDefinitions: true,
  },
} as CustomCollection;
