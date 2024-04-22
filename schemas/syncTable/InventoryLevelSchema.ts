import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { InventoryItemReference } from './InventoryItemSchema';
import { LocationReference } from './LocationSchema';

export const InventoryLevelSyncTableSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: PROPS.makeGraphQlGidProp('inventory level'),
    available: {
      type: coda.ValueType.Number,
      fixedId: 'available',
      fromKey: 'available',
      mutable: true,
      description:
        "The available quantity of an inventory item at the inventory level's associated location. Returns null if the inventory item is not tracked.",
    },
    inventory_item_id: {
      ...PROPS.ID_NUMBER,
      fromKey: 'inventory_item_id',
      fixedId: 'inventory_item_id',
      description: 'The ID of the inventory item associated with the inventory level.',
    },
    inventory_item: {
      ...InventoryItemReference,
      fromKey: 'inventory_item',
      fixedId: 'inventory_item',
      description: 'The inventory item associated with the inventory level.',
    },
    location_id: {
      ...PROPS.ID_NUMBER,
      fromKey: 'location_id',
      fixedId: 'location_id',
      description: 'The ID of the location that the inventory level belongs to.',
    },
    location: {
      ...LocationReference,
      fromKey: 'location',
      fixedId: 'location',
      description: 'The location that the inventory level belongs to.',
    },
    unique_id: {
      type: coda.ValueType.String,
      fixedId: 'unique_id',
      fromKey: 'id',
      required: true,
      description: 'A made up unique ID formed by combining the inventory_item_id and location_id.',
    },
    updated_at: PROPS.makeUpdatedAtProp('inventory level'),
    inventory_history_url: {
      ...PROPS.LINK,
      fixedId: 'inventory_history_url',
      description: 'A link to the inventory history in the Shopify admin.',
    },
  },
  displayProperty: 'unique_id',
  idProperty: 'unique_id',
  featuredProperties: [
    'available',
    'inventory_item_id',
    'location_id',
    'unique_id',
    'updated_at',
    'inventory_history_url',
  ],

  // Card fields.
  // subtitleProperties: ['address1', 'address2', 'city', 'country'],
  // snippetProperty: '',
  // linkProperty: 'inventory_history_url',
});
