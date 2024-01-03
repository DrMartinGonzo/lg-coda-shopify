import * as coda from '@codahq/packs-sdk';
import { IDENTITY_PRODUCT } from '../constants';

// Product image object
const ProductImageSchema = coda.makeObjectSchema({
  properties: {
    // The date and time when the product image was created. The API returns this value in ISO 8601 format.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // A unique numeric identifier for the product image.
    product_image_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    // The order of the product image in the list. The first product image is at position 1 and is the "main" image for the product.
    position: { type: coda.ValueType.Number },
    // The id of the product associated with the image.
    product_id: { type: coda.ValueType.Number },
    // An array of variant ids associated with the image.
    variant_ids: { type: coda.ValueType.Array, items: { type: coda.ValueType.Number } },
    // Specifies the location of the product image. This parameter supports URL filters that you can use to retrieve modified copies of the image. For example, add _small, to the filename to retrieve a scaled copy of the image at 100 x 100 px (for example, ipod-nano_small.png), or add _2048x2048 to retrieve a copy of the image constrained at 2048 x 2048 px resolution (for example, ipod-nano_2048x2048.png).
    src: { type: coda.ValueType.String },
    // Width dimension of the image which is determined on upload.
    width: { type: coda.ValueType.Number },
    // Height dimension of the image which is determined on upload.
    height: { type: coda.ValueType.Number },
    // The date and time when the product image was last modified. The API returns this value in ISO 8601 format.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'src',
});

// Product option object
const ProductOptionSchema = coda.makeObjectSchema({
  properties: {
    option_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    product_id: { type: coda.ValueType.Number },
    name: { type: coda.ValueType.String },
    position: { type: coda.ValueType.Number },
    values: { type: coda.ValueType.Array, items: { type: coda.ValueType.String } },
  },
  displayProperty: 'name',
});

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const ProductSchema = coda.makeObjectSchema({
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
    product_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      description: 'unique identifier for the product',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the product.',
    },
    // A description of the product. Supports HTML formatting.
    body: { type: coda.ValueType.String, codaType: coda.ValueHintType.Html },
    body_html: {
      type: coda.ValueType.String,
      description: 'A description of the product in raw html. Supports HTML formatting',
    },
    // The date and time (ISO 8601 format) when the product was created.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // A unique human-friendly string for the product. Automatically generated from the product's title. Used by the Liquid templating language to refer to objects.
    handle: { type: coda.ValueType.String },
    // A list of product image objects, each one representing an image associated with the product.
    images: { type: coda.ValueType.Array, items: ProductImageSchema },
    primary_image: { type: coda.ValueType.String, codaType: coda.ValueHintType.ImageAttachment },
    // The custom product properties. For example, Size, Color, and Material. Each product can have up to 3 options and each option value can be up to 255 characters. Product variants are made of up combinations of option values. Options cannot be created without values. To create new options, a variant with an associated option value also needs to be created.
    options: { type: coda.ValueType.Array, items: ProductOptionSchema },
    // A categorization for the product used for filtering and searching products.
    product_type: { type: coda.ValueType.String },
    // The date and time (ISO 8601 format) when the product was published. Can be set to null to unpublish the product from the Online Store channel.
    published_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // Whether the product is published to the Point of Sale channel. Valid values:
    //  - web: The product isn't published to the Point of Sale channel.
    //  - global: The product is published to the Point of Sale channel.
    published_scope: { type: coda.ValueType.String },
    // The status of the product. Valid values:
    //  - active: The product is ready to sell and is available to customers on the online store, sales channels, and apps. By default, existing products are set to active.
    //  - archived: The product is no longer being sold and isn't available to customers on sales channels and apps.
    //  - draft: The product isn't ready to sell and is unavailable to customers on sales channels and apps. By default, duplicated and unarchived products are set to draft.
    status: { type: coda.ValueType.String },
    // A string of comma-separated tags that are used for filtering and search. A product can have up to 250 tags. Each tag can have up to 255 characters.
    tags: { type: coda.ValueType.String },
    // The suffix of the Liquid template used for the product page. If this property is specified, then the product page uses a template called "product.suffix.liquid", where "suffix" is the value of this property. If this property is "" or null, then the product page uses the default template "product.liquid". (default: null)
    template_suffix: { type: coda.ValueType.String },
    // The name of the product.
    title: { type: coda.ValueType.String, required: true },
    // The date and time (ISO 8601 format) when the product was last modified. A product's updated_at value can change for different reasons. For example, if an order is placed for a product that has inventory tracking set up, then the inventory adjustment is counted as an update.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    vendor: { type: coda.ValueType.String },
    // An array of product variants, each representing a different version of the product.
    // variants: { type: coda.ValueType.Array, items: ProductVariantReference },
  },
  displayProperty: 'title',
  idProperty: 'product_id',
  featuredProperties: ['title', 'options', 'product_type', 'tags'],
});

export const ProductReference = coda.makeReferenceSchemaFromObjectSchema(ProductSchema, IDENTITY_PRODUCT);
