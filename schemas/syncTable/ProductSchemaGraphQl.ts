import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { OPTIONS_PRODUCT_STATUS_GRAPHQL } from '../../constants';

export const ProductSyncTableSchemaGraphQl = coda.makeObjectSchema({
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
    admin_url: PROPS.makeAdminUrlProp('product'),
    storeUrl: PROPS.makeStoreUrlProp('product', 'onlineStoreUrl', 'storeUrl'),
    id: PROPS.makeRequiredIdNumberProp('product'),
    graphql_gid: PROPS.makeGraphQlGidProp('product'),
    description: {
      ...PROPS.HTML,
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
      ...PROPS.DATETIME_STRING,
      fixedId: 'created_at',
      description: 'The date and time when the product was created.',
    },
    handle: {
      ...PROPS.makeHandleProp('product'),
      mutable: true,
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
      ...PROPS.IMAGE_REF,
      fixedId: 'featuredImage',
      description: 'Featured image of the product.',
    },
    options: {
      type: coda.ValueType.String,
      fixedId: 'options',
      description: 'The custom product properties. Product variants are made of up combinations of option values.',
    },
    product_type: {
      ...PROPS.SELECT_LIST,
      fixedId: 'product_type',
      mutable: true,
      options: coda.OptionsType.Dynamic,
      allowNewValues: true,
      requireForUpdates: false,
      description: 'A categorization for the product.',
    },
    published_at: {
      ...PROPS.DATETIME_STRING,
      description:
        "The date and time when the product was published. Use product status to unpublish the product by setting it to 'DRAFT'.",
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
      ...PROPS.SELECT_LIST,
      fixedId: 'status',
      description: `The status of the product. Can be ${OPTIONS_PRODUCT_STATUS_GRAPHQL.filter((s) => s.value !== '*')
        .map((s) => s.display)
        .join(', ')}`,
      mutable: true,
      options: OPTIONS_PRODUCT_STATUS_GRAPHQL.filter((s) => s.value !== '*').map((s) => s.value),
      requireForUpdates: true,
    },
    tags: {
      ...PROPS.makeTagsProp('product'),
      mutable: true,
    },
    template_suffix: {
      ...PROPS.makeTemplateSuffixProp('product page'),
      mutable: true,
    },
    title: {
      ...PROPS.makeTitleProp('product'),
      required: true,
      mutable: true,
    },
    updated_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'updated_at',
      description: 'The date and time when the product was last modified.',
    },
    vendor: {
      ...PROPS.SELECT_LIST,
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
