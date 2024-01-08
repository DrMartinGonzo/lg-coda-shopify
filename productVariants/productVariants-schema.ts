import * as coda from '@codahq/packs-sdk';

import { ProductReference } from '../products/products-schema';
import { IDENTITY_PRODUCT_VARIANT } from '../constants';

const MoneySchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number },
    currency_code: { type: coda.ValueType.String },
  },
  displayProperty: 'amount',
});

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const ProductVariantSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */
    /*
     */

    /**
     * Disabled
     */
    /*
     */
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the product variant.',
      fixedId: 'graphql_gid',
    },
    barcode: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The barcode, UPC, or ISBN number for the product.',
      fixedId: 'barcode',
    },
    // The original price of the item before an adjustment or a sale.
    compare_at_price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'compare_at_price',
    },
    // The date and time (ISO 8601 format) when the product variant was created.
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
    },
    // The fulfillment service associated with the product variant. Valid values: manual or the handle of a fulfillment service. Multi-managed inventory introduced a breaking change to this field, therefore this field is due to be deprecated and will no longer be supported. Fulfillment services will all be opted into SKU sharing in 2023-04. Once opted into sku sharing, a product variant could be linked to multiple fulfillment services. Please refer to InventoryLevel to see how variants are associated to multiple fulfillment services.
    fulfillment_service: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_service',
    },
    // The weight of the product variant in grams.
    grams: {
      type: coda.ValueType.Number,
      fixedId: 'grams',
    },
    // The unique numeric identifier for the product variant.
    product_variant_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      fixedId: 'product_variant_id',
    },
    // Variant image
    image: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageAttachment,
      fixedId: 'image',
    },
    // The unique identifier for the inventory item, which is used in the Inventory API to query for inventory information.
    inventory_item_id: {
      type: coda.ValueType.Number,
      fixedId: 'inventory_item_id',
    },
    // The fulfillment service that tracks the number of items in stock for the product variant. Valid values:
    //  - shopify: You are tracking inventory yourself using the admin.
    //  - null: You aren't tracking inventory on the variant.
    //  - the handle of a fulfillment service that has inventory management enabled: This must be the same fulfillment service referenced by the fulfillment_service property.
    inventory_management: {
      type: coda.ValueType.String,
      fixedId: 'inventory_management',
    },
    // Whether customers are allowed to place an order for the product variant when it's out of stock. Valid values:
    //  - deny: Customers are not allowed to place orders for the product variant if it's out of stock.
    //  - continue: Customers are allowed to place orders for the product variant if it's out of stock.
    inventory_policy: {
      type: coda.ValueType.String,
      fixedId: 'inventory_policy',
    },
    // inventory_quantity
    inventory_quantity: {
      type: coda.ValueType.Number,
      fixedId: 'inventory_quantity',
    },
    // The custom properties that a shop owner uses to define product variants. You can define three options for a product variant: option1, option2, option3. Default value: Default Title. The title field is a concatenation of the option1, option2, and option3 fields. Updating the option fields updates the title field.
    option1: {
      type: coda.ValueType.String,
      fixedId: 'option1',
    },
    option2: {
      type: coda.ValueType.String,
      fixedId: 'option2',
    },
    option3: {
      type: coda.ValueType.String,
      fixedId: 'option3',
    },
    // A list of the variant's presentment prices and compare-at prices in each of the shop's enabled presentment currencies. Each price object has the following properties:
    presentment_prices: { ...MoneySchema, fixedId: 'presentment_prices' },
    // The price of the product variant.
    price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'price',
    },
    // The order of the product variant in the list of product variants. The first position in the list is 1. The position of variants is indicated by the order in which they are listed.
    position: {
      type: coda.ValueType.Number,
      fixedId: 'position',
    },
    // parent product
    product: { ...ProductReference, fixedId: 'product' },
    // A unique identifier for the product variant in the shop. Required in order to connect to a FulfillmentService.
    sku: {
      type: coda.ValueType.String,
      fixedId: 'sku',
    },
    // Whether a tax is charged when the product variant is sold.
    taxable: {
      type: coda.ValueType.Boolean,
      fixedId: 'taxable',
    },
    // This parameter applies only to the stores that have the Avalara AvaTax app installed. Specifies the Avalara tax code for the product variant.
    tax_code: {
      type: coda.ValueType.String,
      fixedId: 'tax_code',
    },
    // The title of the product variant. The title field is a concatenation of the option1, option2, and option3 fields. You can only update title indirectly using the option fields.
    title: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'title',
    },
    // The date and time when the product variant was last modified. Gets returned in ISO 8601 format.
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
    },
    // The weight of the product variant in the unit system specified with weight_unit.
    weight: {
      type: coda.ValueType.Number,
      fixedId: 'weight',
    },
    // The unit of measurement that applies to the product variant's weight. If you don't specify a value for weight_unit, then the shop's default unit of measurement is applied. Valid values: g, kg, oz, and lb.
    weight_unit: {
      type: coda.ValueType.String,
      fixedId: 'weight_unit',
    },
  },
  displayProperty: 'title',
  idProperty: 'product_variant_id',
  featuredProperties: ['title', 'sku', 'price'],
});

export const ProductVariantReference = coda.makeReferenceSchemaFromObjectSchema(
  ProductVariantSchema,
  IDENTITY_PRODUCT_VARIANT
);
