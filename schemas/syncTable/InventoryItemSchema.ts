import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { OPTIONS_COUNTRY_NAMES, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { ProductVariantReference } from './ProductVariantSchema';

// #region Helpers
export const inventoryItemRequiresShippingProp = {
  ...PROPS.BOOLEAN,
  fixedId: 'requires_shipping',
  fromKey: 'requires_shipping',
  description: 'Whether the item requires shipping.',
};
// #endregion

export const InventoryItemSyncTableSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: PROPS.makeGraphQlGidProp('inventory item'),
    id: PROPS.makeRequiredIdNumberProp('inventory item'),
    inventory_history_url: {
      ...PROPS.LINK,
      fixedId: 'inventory_history_url',
    },
    cost: {
      ...PROPS.CURRENCY,
      fixedId: 'cost',
      fromKey: 'cost',
      mutable: true,
      description: "The unit cost of the inventory item. The shop's default currency is used.",
    },
    country_code_of_origin: {
      ...PROPS.SELECT_LIST,
      options: OPTIONS_COUNTRY_NAMES,
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
    updated_at: PROPS.makeUpdatedAtProp('inventory item'),
    created_at: PROPS.makeCreatedAtProp('inventory item'),
    tracked: {
      type: coda.ValueType.Boolean,
      fixedId: 'tracked',
      fromKey: 'tracked',
      mutable: true,
      description:
        'Whether inventory levels are tracked for the item. If true, then the inventory quantity changes are tracked by Shopify.',
    },
    requires_shipping: inventoryItemRequiresShippingProp,
    // Not needed : already in ProductVariant
    // sku: itemSkuProp,
    variant: {
      ...ProductVariantReference,
      fixedId: 'variant',
      fromKey: 'variant',
      description: 'The variant that owns this inventory item',
    },
    variant_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'variant_id',
      fromKey: 'variant_id',
      description: 'The ID of the variant that owns this inventory item.',
    },
  },
  displayProperty: 'id',
  idProperty: 'id',
  featuredProperties: [
    'id',
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
  InventoryItemSyncTableSchema,
  PACK_IDENTITIES.InventoryItem
);
export const formatInventoryItemReference: FormatRowReferenceFn<number> = (id: number) => ({ id });
