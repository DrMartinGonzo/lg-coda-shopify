import { GraphQlResourceName } from '../ShopifyResource.types';
import { RestResourcePlural, RestResourceSingular } from '../ShopifyResource.types';
import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { ResourceWithSchema } from '../Resource.types';

const inventoryItemResourceBase = {
  display: 'Inventory Item',
  schema: InventoryItemSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.InventoryItem,
    singular: 'inventoryItem',
    plural: 'inventoryItems',
  },
  rest: {
    singular: RestResourceSingular.InventoryItem,
    plural: RestResourcePlural.InventoryItem,
  },
} as const;

export type InventoryItem = ResourceWithSchema<
  typeof inventoryItemResourceBase,
  {
    codaRow: InventoryItemRow;
  }
>;

export const inventoryItemResource = inventoryItemResourceBase as InventoryItem;
