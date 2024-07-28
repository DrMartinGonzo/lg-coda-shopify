import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { LocationReference } from './LocationSchema';
import { ProductVariantReference } from './ProductVariantSchema';

export const InventoryLevelSyncTableSchema = coda.makeObjectSchema({
  properties: {
    unique_id: {
      type: coda.ValueType.String,
      fixedId: 'unique_id',
      fromKey: 'unique_id',
      required: true,
      description: 'A made up unique ID formed by combining the InventoryLevel id at location and InventoryItem id.',
    },
    available: {
      type: coda.ValueType.Number,
      fixedId: 'available',
      mutable: true,
      description: 'The inventory that a merchant can sell. Returns null if the inventory item is not tracked.',
    },
    committed: {
      type: coda.ValueType.Number,
      fixedId: 'committed',
      description:
        "The number of units that are part of a placed order but aren't fulfilled. Returns null if the inventory item is not tracked.",
    },
    damaged: {
      type: coda.ValueType.Number,
      fixedId: 'damaged',
      description:
        "The on-hand units that aren't sellable or usable due to damage. Returns null if the inventory item is not tracked.",
    },
    incoming: {
      type: coda.ValueType.Number,
      fixedId: 'incoming',
      description:
        "The inventory that’s on its way to a merchant's location. Returns null if the inventory item is not tracked.",
    },
    on_hand: {
      type: coda.ValueType.Number,
      fixedId: 'on_hand',
      mutable: true,
      description:
        'The total number of units that are physically at a location. Returns null if the inventory item is not tracked.',
    },
    quality_control: {
      type: coda.ValueType.Number,
      fixedId: 'quality_control',
      description:
        "The on-hand units that aren't sellable because they're currently in inspection for quality purposes. Returns null if the inventory item is not tracked.",
    },
    reserved: {
      type: coda.ValueType.Number,
      fixedId: 'reserved',
      description:
        'The on-hand units that are temporarily set aside. Returns null if the inventory item is not tracked.',
    },
    safety_stock: {
      type: coda.ValueType.Number,
      fixedId: 'safety_stock',
      description:
        'The on-hand units that are set aside to help guard against overselling. Returns null if the inventory item is not tracked.',
    },
    inventory_item_id: {
      ...PROPS.ID_NUMBER,
      fromKey: 'inventory_item_id',
      fixedId: 'inventory_item_id',
      description: 'The ID of the inventory item associated with the inventory level.',
    },
    inventory_history_url: {
      ...PROPS.LINK,
      fixedId: 'inventory_history_url',
      description: 'A link to the inventory history in the Shopify admin.',
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
    updated_at: PROPS.makeUpdatedAtProp('inventory level'),
    created_at: PROPS.makeCreatedAtProp('inventory level'),
    variant_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'variant_id',
      description: 'The ID of the variant associated with the inventory level.',
    },
    variant: {
      ...ProductVariantReference,
      fixedId: 'variant',
      description: 'The variant associated with the inventory level.',
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
