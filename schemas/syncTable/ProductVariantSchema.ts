import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { getUnitMap } from '../../utils/helpers';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { ProductReference } from './ProductSchema';

const titleProp = PROPS.makeTitleProp('product variant');
export const itemGramsProp = {
  ...PROPS.NUMBER,
  fixedId: 'grams',
  fromKey: 'grams',
  description: 'The weight of the item in grams.',
};
export const itemSkuProp = {
  ...PROPS.STRING,
  fixedId: 'sku',
  fromKey: 'sku',
  description: 'A unique identifier for the item in the shop. Required in order to connect to a FulfillmentService.',
};
export const itemTaxableProp = {
  ...PROPS.BOOLEAN,
  fixedId: 'taxable',
  fromKey: 'taxable',
  description: 'Whether a tax is charged when the item is sold.',
};

export const ProductVariantSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('product variant'),
    storeUrl: PROPS.makeStoreUrlProp('product variant'),
    graphql_gid: PROPS.makeGraphQlGidProp('product variant'),
    barcode: {
      type: coda.ValueType.String,
      description: 'The barcode, UPC, or ISBN number for the product.',
      fixedId: 'barcode',
      fromKey: 'barcode',
      mutable: true,
    },
    compare_at_price: {
      ...PROPS.CURRENCY,
      fixedId: 'compare_at_price',
      fromKey: 'compare_at_price',
      mutable: true,
      description: 'The original price of the item before an adjustment or a sale.',
    },
    created_at: PROPS.makeCreatedAtProp('product variant'),
    grams: itemGramsProp,
    id: PROPS.makeRequiredIdNumberProp('product variant'),
    image: {
      ...PROPS.IMAGE_REF,
      fixedId: 'image',
      description: 'The image of the product variant.',
    },
    inventory_item_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'inventory_item_id',
      fromKey: 'inventory_item_id',
      description: 'The ID of the inventory item associated with the product variant.',
    },
    /*
    inventory_management: {
      type: coda.ValueType.String,
      fixedId: 'inventory_management',
      fromKey: 'inventory_management',
      description: `The fulfillment service that tracks the number of items in stock for the product variant. Valid values:
 - shopify: You are tracking inventory yourself using the admin.
 - null: You aren't tracking inventory on the variant.
 - the handle of a fulfillment service that has inventory management enabled: This must be the same fulfillment service referenced by the fulfillment_service property.`,
    },
    */
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
      ...PROPS.CURRENCY,
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
    product_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'product_id',
      fromKey: 'product_id',
      description: 'The ID of the product this variant belongs to.',
    },
    product: { ...ProductReference, fixedId: 'product', description: 'The product this variant belongs to.' },
    sku: { ...itemSkuProp, mutable: true },
    taxable: { ...itemTaxableProp, mutable: true },
    tax_code: {
      type: coda.ValueType.String,
      fixedId: 'tax_code',
      fromKey: 'tax_code',
      description:
        'This parameter applies only to the stores that have the Avalara AvaTax app installed. Specifies the Avalara tax code for the product variant.',
    },
    title: {
      ...titleProp,
      required: true,
      description:
        titleProp.description +
        ' The title field is a concatenation of the option1, option2, and option3 fields. You can only update title indirectly using the option fields.',
    },
    displayTitle: {
      type: coda.ValueType.String,
      fixedId: 'displayTitle',
      description:
        'A generated title for the product variant, composed of the product title followed by the actual title of the product variant.',
    },
    updated_at: PROPS.makeUpdatedAtProp('product variant'),
    weight: {
      type: coda.ValueType.Number,
      fixedId: 'weight',
      fromKey: 'weight',
      mutable: true,
      description: 'The weight of the product variant in the unit system specified with weight_unit.',
    },
    weight_unit: {
      ...PROPS.SELECT_LIST,
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

export const ProductVariantReference = coda.makeReferenceSchemaFromObjectSchema(
  ProductVariantSyncTableSchema,
  PACK_IDENTITIES.ProductVariant
);
export const formatProductVariantReference: FormatRowReferenceFn<number, 'title'> = (
  id: number,
  title = NOT_FOUND
) => ({ id, title });
