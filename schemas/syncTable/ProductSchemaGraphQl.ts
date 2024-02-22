import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PRODUCT_STATUS_GRAPHQL } from '../../constants';

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
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      description: 'unique identifier for the product',
      fixedId: 'id',
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
  idProperty: 'id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'product_type', 'status', 'options', 'tags'],

  // Card fields.
  subtitleProperties: ['product_type', 'status', 'options', 'vendor'],
  snippetProperty: 'description',
  imageProperty: 'featuredImage',
  linkProperty: 'admin_url',
});
