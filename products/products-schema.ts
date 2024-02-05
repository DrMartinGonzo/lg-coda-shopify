import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PRODUCT, OPTIONS_PRODUCT_STATUS_GRAPHQL, OPTIONS_PRODUCT_STATUS_REST } from '../constants';
import { FieldDependency } from '../types/tableSync';

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
/*
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
*/

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const ProductSchemaRest = coda.makeObjectSchema({
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
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product in the Shopify admin.',
      fixedId: 'admin_url',
    },
    storeUrl: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product in the online shop.',
      fixedId: 'storeUrl',
    },
    product_id: {
      type: coda.ValueType.Number,
      fixedId: 'product_id',
      fromKey: 'id',
      required: true,
      description: 'unique identifier for the product',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fixedId: 'graphql_gid',
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the product.',
    },
    body: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Html,
      fixedId: 'body',
      description:
        'Text-only content of the description of the product, stripped of any HTML tags and formatting that were included.',
    },
    body_html: {
      type: coda.ValueType.String,
      description: 'The description of the product, complete with HTML markup.',
      fixedId: 'body_html',
      fromKey: 'body_html',
      mutable: true,
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the product was created.',
    },
    handle: {
      type: coda.ValueType.String,
      fixedId: 'handle',
      fromKey: 'handle',
      mutable: true,
      description:
        "A unique human-friendly string for the product. If you update the handle, the old handle won't be redirected to the new one automatically.",
    },
    images: {
      type: coda.ValueType.Array,
      // items: ProductImageSchema,
      items: {
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Url,
        // codaType: coda.ValueHintType.ImageReference
      },
      fixedId: 'images',
      fromKey: 'images',
      description: 'A list of product image urls.',
    },
    featuredImage: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fixedId: 'featuredImage',
      description: 'Featured image of the product.',
    },
    options: {
      type: coda.ValueType.String,
      fixedId: 'options',
      fromKey: 'options',
      description: 'The custom product properties. Product variants are made of up combinations of option values.',
    },
    product_type: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'product_type',
      fromKey: 'product_type',
      mutable: true,
      options: coda.OptionsType.Dynamic,
      allowNewValues: true,
      requireForUpdates: false,
      description: 'A categorization for the product.',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'published_at',
      fromKey: 'published_at',
      description:
        "The date and time when the product was published. Use product status to unpublish the product by setting it to 'DRAFT'.",
    },
    published_scope: {
      type: coda.ValueType.String,
      fixedId: 'published_scope',
      fromKey: 'published_scope',
      description:
        "Whether the product is published to the Point of Sale channel. Valid values:\n- web: The product isn't published to the Point of Sale channel.\n- global: The product is published to the Point of Sale channel.",
    },
    status: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'status',
      fromKey: 'status',
      mutable: true,
      options: OPTIONS_PRODUCT_STATUS_REST.map((s) => s.value),
      requireForUpdates: true,
      description: `The status of the product. Can be ${OPTIONS_PRODUCT_STATUS_REST.map((s) => s.display).join(', ')}`,
    },
    tags: {
      type: coda.ValueType.String,
      fixedId: 'tags',
      fromKey: 'tags',
      mutable: true,
      description: 'A string of comma-separated tags that are used for filtering and search.',
    },
    template_suffix: {
      type: coda.ValueType.String,
      fixedId: 'template_suffix',
      fromKey: 'template_suffix',
      mutable: true,
      description:
        'The suffix of the Liquid template used for the product page. If this property is null, then the product page uses the default template.',
    },
    title: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'title',
      fromKey: 'title',
      mutable: true,
      description: 'The name of the product.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the product was last modified.',
    },
    vendor: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'vendor',
      fromKey: 'vendor',
      mutable: true,
      description: 'The name of the product vendor.',
    },
  },
  displayProperty: 'title',
  idProperty: 'product_id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['product_id', 'title', 'product_type', 'status', 'options', 'tags'],

  // Card fields.
  subtitleProperties: ['product_type', 'status', 'options', 'vendor'],
  snippetProperty: 'body',
  imageProperty: 'featuredImage',
  linkProperty: 'admin_url',
});
export const productFieldDependencies: FieldDependency<typeof ProductSchemaRest.properties>[] = [
  {
    field: 'body_html',
    dependencies: ['body'],
  },
  {
    field: 'handle',
    dependencies: ['storeUrl'],
  },
  {
    field: 'status',
    dependencies: ['storeUrl'],
  },
];

export const ProductSchemaGraphQl = coda.makeObjectSchema({
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
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product in the Shopify admin.',
      fixedId: 'admin_url',
    },
    storeUrl: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product in the online shop.',
      fixedId: 'onlineStoreUrl',
      fromKey: 'onlineStoreUrl',
    },
    product_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      description: 'unique identifier for the product',
      fixedId: 'product_id',
      useThousandsSeparator: false,
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the product.',
      fixedId: 'graphql_gid',
    },
    description: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Html,
      fixedId: 'description',
      description:
        'Text-only content of the description of the product, stripped of any HTML tags and formatting that were included.',
    },
    descriptionHtml: {
      type: coda.ValueType.String,
      description: 'The description of the product, complete with HTML markup.',
      fixedId: 'descriptionHtml',
      fromKey: 'descriptionHtml',
      mutable: true,
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      description: 'The date and time when the product was created.',
    },
    handle: {
      type: coda.ValueType.String,
      fixedId: 'handle',
      mutable: true,
      description:
        "A unique human-friendly string for the product. If you update the handle, the old handle won't be redirected to the new one automatically.",
    },
    /*
    images: {
      type: coda.ValueType.Array,
      items: ProductImageSchema,
      fixedId: 'images',
      description: 'A list of product image objects, each one representing an image associated with the product.',
    },
    */
    featuredImage: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fixedId: 'featuredImage',
      description: 'Featured image of the product.',
    },
    options: {
      type: coda.ValueType.String,
      fixedId: 'options',
      description: 'The custom product properties. Product variants are made of up combinations of option values.',
    },
    product_type: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'product_type',
      mutable: true,
      options: coda.OptionsType.Dynamic,
      allowNewValues: true,
      requireForUpdates: false,
      description: 'A categorization for the product.',
    },
    published_at: {
      type: coda.ValueType.String,
      description:
        "The date and time when the product was published. Use product status to unpublish the product by setting it to 'DRAFT'.",
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'published_at',
    },
    // Whether the product is published to the Point of Sale channel. Valid values:
    //  - web: The product isn't published to the Point of Sale channel.
    //  - global: The product is published to the Point of Sale channel.
    published_scope: {
      type: coda.ValueType.String,
      fixedId: 'published_scope',
    },
    status: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'status',
      description: `The status of the product. Can be ${OPTIONS_PRODUCT_STATUS_GRAPHQL.filter((s) => s.value !== '*')
        .map((s) => s.display)
        .join(', ')}`,
      mutable: true,
      options: OPTIONS_PRODUCT_STATUS_GRAPHQL.filter((s) => s.value !== '*').map((s) => s.value),
      requireForUpdates: true,
    },
    tags: {
      type: coda.ValueType.String,
      fixedId: 'tags',
      mutable: true,
      description: 'A string of comma-separated tags that are used for filtering and search.',
    },
    template_suffix: {
      type: coda.ValueType.String,
      fixedId: 'template_suffix',
      mutable: true,
      description:
        'The suffix of the Liquid template used for the product page. If this property is null, then the product page uses the default template.',
    },
    title: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'title',
      mutable: true,
      description: 'The name of the product.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      description: 'The date and time when the product was last modified.',
    },
    vendor: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'vendor',
      mutable: true,
      description: 'The name of the product vendor.',
    },
    giftCard: {
      type: coda.ValueType.Boolean,
      fixedId: 'giftCard',
      fromKey: 'isGiftCard',
      description: 'Whether the product is a gift card.',
    },
  },
  displayProperty: 'title',
  idProperty: 'product_id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'product_type', 'status', 'options', 'tags'],

  // Card fields.
  subtitleProperties: ['product_type', 'status', 'options', 'vendor'],
  snippetProperty: 'description',
  imageProperty: 'featuredImage',
  linkProperty: 'admin_url',
});

export const ProductReference = coda.makeReferenceSchemaFromObjectSchema(ProductSchemaRest, IDENTITY_PRODUCT);
