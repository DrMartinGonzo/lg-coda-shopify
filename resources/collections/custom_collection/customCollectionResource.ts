import { GraphQlResourceName } from '../../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../../Fetchers/ShopifyRestResource.types';
import { CollectionRow } from '../../../schemas/CodaRows.types';
import { CollectionSyncTableSchema } from '../../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { ResourceWithMetafieldDefinitions } from '../../Resource.types';
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

const customCollectionResourceBase = {
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
} as const;

export type CustomCollection = ResourceWithMetafieldDefinitions<
  typeof customCollectionResourceBase,
  {
    codaRow: CollectionRow;
    rest: {
      params: {
        sync: CustomCollectionSyncRestParams;
        create: CustomCollectionCreateRestParams;
        update: CustomCollectionUpdateRestParams;
      };
    };
  }
>;
export const customCollectionResource = customCollectionResourceBase as CustomCollection;
