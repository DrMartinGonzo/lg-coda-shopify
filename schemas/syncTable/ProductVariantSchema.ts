import * as coda from '@codahq/packs-sdk';

import { ProductReference } from './ProductSchemaRest';
import { NOT_FOUND } from '../../constants';
import { getUnitMap } from '../../helpers';
import { Identity } from '../../constants';

import type { FieldDependency } from '../../types/SyncTable';

export const ProductVariantSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product variant in the Shopify admin.',
      fixedId: 'admin_url',
    },
    storeUrl: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product variant in the online shop.',
      fixedId: 'storeUrl',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the product variant.',
      fixedId: 'graphql_gid',
    },
    barcode: {
      type: coda.ValueType.String,
      description: 'The barcode, UPC, or ISBN number for the product.',
      fixedId: 'barcode',
      fromKey: 'barcode',
      mutable: true,
    },
    compare_at_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'compare_at_price',
      fromKey: 'compare_at_price',
      mutable: true,
      description: 'The original price of the item before an adjustment or a sale.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the product variant was created.',
    },
    grams: {
      type: coda.ValueType.Number,
      fixedId: 'grams',
      fromKey: 'grams',
      description: 'The weight of the product variant in grams.',
    },
    id: {
      type: coda.ValueType.Number,
      fixedId: 'id',
      fromKey: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The unique numeric identifier for the product variant.',
    },
    image: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fixedId: 'image',
      description: 'The image of the product variant.',
    },
    inventory_item_id: {
      type: coda.ValueType.Number,
      fixedId: 'inventory_item_id',
      fromKey: 'inventory_item_id',
      useThousandsSeparator: false,
      description:
        'The unique identifier for the inventory item, which is used in the Inventory API to query for inventory information.',
    },
    inventory_management: {
      type: coda.ValueType.String,
      fixedId: 'inventory_management',
      fromKey: 'inventory_management',
      description: `The fulfillment service that tracks the number of items in stock for the product variant. Valid values:
 - shopify: You are tracking inventory yourself using the admin.
 - null: You aren't tracking inventory on the variant.
 - the handle of a fulfillment service that has inventory management enabled: This must be the same fulfillment service referenced by the fulfillment_service property.`,
    },
    inventory_policy: {
      type: coda.ValueType.String,
      fixedId: 'inventory_policy',
      fromKey: 'inventory_policy',
      description: `Whether customers are allowed to place an order for the product variant when it's out of stock. Valid values:
 - deny: Customers are not allowed to place orders for the product variant if it's out of stock.
 - continue: Customers are allowed to place orders for the product variant if it's out of stock.`,
    },
    inventory_quantity: {
      type: coda.ValueType.Number,
      fixedId: 'inventory_quantity',
      fromKey: 'inventory_quantity',
      description: 'An aggregate of inventory across all locations.',
    },
    option1: {
      type: coda.ValueType.String,
      fixedId: 'option1',
      fromKey: 'option1',
      mutable: true,
      description: 'Option 1 of 3 for a product variant.',
    },
    option2: {
      type: coda.ValueType.String,
      fixedId: 'option2',
      fromKey: 'option2',
      mutable: true,
      description: 'Option 2 of 3 for a product variant.',
    },
    option3: {
      type: coda.ValueType.String,
      fixedId: 'option3',
      fromKey: 'option3',
      mutable: true,
      description: 'Option 3 of 3 for a product variant.',
    },
    /*
    presentment_prices: {
      ...MoneySchema,
      fixedId: 'presentment_prices',
      fromKey: 'presentment_prices',
      description:
        "A list of the variant's presentment prices and compare-at prices in each of the shop's enabled presentment currencies.",
    },
    */
    price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'price',
      fromKey: 'price',
      mutable: true,
      description: 'The price of the product variant in the default shop currency.',
    },
    position: {
      type: coda.ValueType.Number,
      fixedId: 'position',
      fromKey: 'position',
      mutable: true,
      description:
        'The order of the product variant in the list of product variants. The first position in the list is 1. The position of variants is indicated by the order in which they are listed.',
    },
    product: { ...ProductReference, fixedId: 'product', description: 'The product this variant belongs to.' },
    sku: {
      type: coda.ValueType.String,
      fixedId: 'sku',
      fromKey: 'sku',
      mutable: true,
      description:
        'A unique identifier for the product variant in the shop. Required in order to connect to a FulfillmentService.',
    },
    taxable: {
      type: coda.ValueType.Boolean,
      fixedId: 'taxable',
      fromKey: 'taxable',
      mutable: true,
      description: 'Whether a tax is charged when the product variant is sold.',
    },
    tax_code: {
      type: coda.ValueType.String,
      fixedId: 'tax_code',
      fromKey: 'tax_code',
      description:
        'This parameter applies only to the stores that have the Avalara AvaTax app installed. Specifies the Avalara tax code for the product variant.',
    },
    title: {
      type: coda.ValueType.String,
      fixedId: 'title',
      fromKey: 'title',
      required: true,
      description:
        'The title of the product variant. The title field is a concatenation of the option1, option2, and option3 fields. You can only update title indirectly using the option fields.',
    },
    displayTitle: {
      type: coda.ValueType.String,
      fixedId: 'displayTitle',
      description:
        'A generated title for the product variant, composed of the product title followed by the actual title of the product variant.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the product variant was last modified.',
    },
    weight: {
      type: coda.ValueType.Number,
      fixedId: 'weight',
      fromKey: 'weight',
      mutable: true,
      description: 'The weight of the product variant in the unit system specified with weight_unit.',
    },
    weight_unit: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'weight_unit',
      fromKey: 'weight_unit',
      mutable: true,
      requireForUpdates: true,
      options: Object.values(getUnitMap('weight')),
      description:
        "The unit of measurement that applies to the product variant's weight. If you don't specify a value for weight_unit, then the shop's default unit of measurement is applied. Valid values: g, kg, oz, and lb.",
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['id', 'title', 'sku', 'price'],

  // Card fields.
  titleProperty: 'displayTitle',
  subtitleProperties: ['sku', 'inventory_quantity', 'price'],
  // snippetProperty: 'body',
  imageProperty: 'image',
  linkProperty: 'admin_url',
});

export const productVariantFieldDependencies: FieldDependency<typeof ProductVariantSyncTableSchema.properties>[] = [
  {
    field: 'images',
    dependencies: ['image'],
  },
  {
    field: 'handle',
    dependencies: ['storeUrl'],
  },
  {
    field: 'status',
    dependencies: ['storeUrl'],
  },
  {
    field: 'title',
    dependencies: ['product'],
  },
];

export const ProductVariantReference = coda.makeReferenceSchemaFromObjectSchema(
  ProductVariantSyncTableSchema,
  Identity.ProductVariant
);
export const formatProductVariantReference = (id: number, title = NOT_FOUND) => ({ id, title });
