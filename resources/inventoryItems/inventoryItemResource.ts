import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { Resource } from '../Resource.types';
import { QueryAllInventoryItems, UpdateInventoryItem } from './inventoryItems-graphql';

// #region GraphQl Parameters

// #endregion

// TODO: finish this
const inventoryItemResourceBase = {
  display: 'Inventory Item',
  schema: InventoryItemSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.InventoryItem,
    singular: 'inventoryItem',
    plural: 'inventoryItems',
    operations: {
      fetchAll: QueryAllInventoryItems,
      update: UpdateInventoryItem,
    },
  },
  rest: {
    singular: RestResourceSingular.InventoryItem,
    plural: RestResourcePlural.InventoryItem,
  },
} as const;

export type InventoryItem = Resource<
  typeof inventoryItemResourceBase,
  {
    codaRow: InventoryItemRow;
    rest: {
      params: {};
    };
  }
>;

export const inventoryItemResource = inventoryItemResourceBase as InventoryItem;
