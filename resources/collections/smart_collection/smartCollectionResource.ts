import { GraphQlResourceName } from '../../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../../Fetchers/ShopifyRestResource.types';
import { CollectionRow } from '../../../schemas/CodaRows.types';
import { CollectionSyncTableSchema } from '../../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { ResourceWithMetafieldDefinitions } from '../../Resource.types';
import { CollectionSyncRestParams, CollectionUpdateRestParams } from '../collectionResource';

// #region Rest Parameters
interface SmartCollectionSyncRestParams extends CollectionSyncRestParams {}

interface SmartCollectionUpdateRestParams extends CollectionUpdateRestParams {}
// #endregion

const smartCollectionResourceBase = {
  display: 'Smart Collection',
  schema: CollectionSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Collection,
    singular: 'collection',
    plural: 'collections',
  },
  rest: {
    singular: RestResourceSingular.SmartCollection,
    plural: RestResourcePlural.SmartCollection,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Collection,
    useGraphQl: true,
    hasSyncTable: false,
    supportsDefinitions: true,
  },
} as const;

export type SmartCollection = ResourceWithMetafieldDefinitions<
  typeof smartCollectionResourceBase,
  {
    codaRow: CollectionRow;
    rest: {
      params: {
        sync: SmartCollectionSyncRestParams;
        // TODO: create not supported for smart collections for the moment
        create: never;
        update: SmartCollectionUpdateRestParams;
      };
    };
  }
>;
export const smartCollectionResource = smartCollectionResourceBase as SmartCollection;
