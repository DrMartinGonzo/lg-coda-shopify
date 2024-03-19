import { CollectionSyncTableSchema } from '../../../schemas/syncTable/CollectionSchema';
import { GraphQlResourceName } from '../../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../../Fetchers/ShopifyRestResource.types';
import { CollectionRow } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { ResourceWithMetafieldDefinitionsNew } from '../../Resource.types';
import { CollectionSyncRestParams, CollectionUpdateRestParams } from '../collectionResource';

// #region Rest Parameters
interface SmartCollectionSyncRestParams extends CollectionSyncRestParams {}

interface SmartCollectionUpdateRestParams extends CollectionUpdateRestParams {}
// #endregion

export type SmartCollection = ResourceWithMetafieldDefinitionsNew<{
  codaRow: CollectionRow;
  schema: typeof CollectionSyncTableSchema;
  params: {
    sync: SmartCollectionSyncRestParams;
    // TODO: create not supported for smart collections for the moment
    create: never;
    update: SmartCollectionUpdateRestParams;
  };
  rest: {
    singular: RestResourceSingular.SmartCollection;
    plural: RestResourcePlural.SmartCollection;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Collection;
  };
}>;

export const smartCollectionResource = {
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
} as SmartCollection;
