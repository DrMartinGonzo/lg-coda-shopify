import * as coda from '@codahq/packs-sdk';
import { IDENTITY_INVENTORYITEM } from '../../constants';
import { FieldDependency } from '../../types/tableSync';
import { ProductVariantReference } from './ProductVariantSchema';
import { countryCodes } from '../../types/misc';

export const InventoryItemSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
    },
    inventory_item_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      required: true,
      fixedId: 'inventory_item_id',
      fromKey: 'id',
    },
    inventory_history_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'inventory_history_url',
    },
    cost: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'cost',
      fromKey: 'cost',
      mutable: true,
      description: "The unit cost of the inventory item. The shop's default currency is used.",
    },
    country_code_of_origin: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      options: countryCodes,
      fixedId: 'country_code_of_origin',
      fromKey: 'country_code_of_origin',
      mutable: true,
      requireForUpdates: false,
      description: 'The ISO 3166-1 alpha-2 country code of where the item originated from.',
    },
    harmonized_system_code: {
      type: coda.ValueType.String,
      fixedId: 'harmonized_system_code',
      fromKey: 'harmonized_system_code',
      mutable: true,
      description: 'The harmonized system code of the item.',
    },
    province_code_of_origin: {
      type: coda.ValueType.String,
      fixedId: 'province_code_of_origin',
      fromKey: 'province_code_of_origin',
      mutable: true,
      description: 'The ISO 3166-2 alpha-2 province code of where the item originated from.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the inventory item was last modified.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the inventory item was created.',
    },
    tracked: {
      type: coda.ValueType.Boolean,
      fixedId: 'tracked',
      fromKey: 'tracked',
      mutable: true,
      description:
        'Whether inventory levels are tracked for the item. If true, then the inventory quantity changes are tracked by Shopify.',
    },
    requires_shipping: {
      type: coda.ValueType.Boolean,
      fixedId: 'requires_shipping',
      fromKey: 'requires_shipping',
      description:
        'Whether a customer needs to provide a shipping address when placing an order containing the inventory item.',
    },
    // TODO: not needed? Already in ProductVariant
    sku: {
      type: coda.ValueType.String,
      fixedId: 'sku',
      fromKey: 'sku',
      description: 'The unique SKU (stock keeping unit) of the inventory item.',
    },
    variant: {
      ...ProductVariantReference,
      fixedId: 'variant',
      fromKey: 'variant',
      description: 'The variant that owns this inventory item',
    },
    variant_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'variant_id',
      fromKey: 'variant_id',
      description: 'The ID of the variant that owns this inventory item.',
    },
  },
  displayProperty: 'inventory_item_id',
  idProperty: 'inventory_item_id',
  featuredProperties: [
    'inventory_item_id',
    'country_code_of_origin',
    'harmonized_system_code',
    'updated_at',
    'created_at',
    'tracked',
    'requires_shipping',
    'inventory_history_url',
  ],
});

export const InventoryItemReference = coda.makeReferenceSchemaFromObjectSchema(
  InventoryItemSchema,
  IDENTITY_INVENTORYITEM
);

export const InventoryItemFieldDependencies: FieldDependency<typeof InventoryItemSchema.properties>[] = [
  {
    field: 'graphql_gid',
    dependencies: ['inventory_item_id'],
  },
];