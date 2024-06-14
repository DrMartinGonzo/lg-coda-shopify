import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { NOT_FOUND, OPTIONS_PRODUCT_STATUS_GRAPHQL, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

const publishedAtProp = PROPS.makePublishedAtProp('product');

export const ProductSyncTableSchema = coda.makeObjectSchema({
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
    published_scope: {
      ...PROPS.STRING,
      fixedId: 'published_scope',
      fromKey: 'published_scope',
      description: `Whether the product is published to the Point of Sale channel. Valid values:
- web: The product isn't published to the Point of Sale channel.
- global: The product is published to the Point of Sale channel.`,
    },
     */
    admin_url: PROPS.makeAdminUrlProp('product'),
    storeUrl: PROPS.makeStoreUrlProp('product'),
    id: PROPS.makeRequiredIdNumberProp('product'),
    graphql_gid: PROPS.makeGraphQlGidProp('product'),
    body: PROPS.makeBodyProp('product', 'description'),
    body_html: { ...PROPS.makeBodyHtmlProp('product', 'description'), mutable: true },
    created_at: PROPS.makeCreatedAtProp('product'),
    handle: {
      ...PROPS.makeHandleProp('product'),
      mutable: true,
    },
    images: {
      type: coda.ValueType.Array,
      // items: ProductImageSchema,
      items: {
        ...PROPS.LINK,
        // codaType: coda.ValueHintType.ImageReference
      },
      fixedId: 'images',
      fromKey: 'images',
      // mutable: true,
      description: 'A list of product image urls.',
    },
    featuredImage: {
      ...PROPS.IMAGE_REF,
      fixedId: 'featuredImage',
      description: 'Featured image of the product.',
    },
    options: {
      ...PROPS.STRING,
      fixedId: 'options',
      fromKey: 'options',
      description: 'The custom product properties. Product variants are made of up combinations of option values.',
    },
    product_type: {
      ...PROPS.SELECT_LIST,
      fixedId: 'product_type',
      fromKey: 'product_type',
      mutable: true,
      options: coda.OptionsType.Dynamic,
      allowNewValues: true,
      requireForUpdates: false,
      description: 'A categorization for the product.',
    },
    published_at: {
      ...publishedAtProp,
      description:
        publishedAtProp.description + "\nUse product status to unpublish the product by setting it to 'DRAFT'.",
    },
    status: {
      ...PROPS.SELECT_LIST,
      fixedId: 'status',
      fromKey: 'status',
      mutable: true,
      options: OPTIONS_PRODUCT_STATUS_GRAPHQL.map((s) => s.value),
      requireForUpdates: true,
      description: `The status of the product. Can be ${OPTIONS_PRODUCT_STATUS_GRAPHQL.map((s) => s.display).join(
        ', '
      )}`,
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
    updated_at: PROPS.makeUpdatedAtProp('product'),
    vendor: {
      ...PROPS.SELECT_LIST,
      fixedId: 'vendor',
      fromKey: 'vendor',
      mutable: true,
      description: 'The name of the product vendor.',
    },
    giftCard: {
      type: coda.ValueType.Boolean,
      fixedId: 'giftCard',
      fromKey: 'giftCard',
      description: 'Whether the product is a gift card.',
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Products dynamicOptions after the eventual metafields
  featuredProperties: ['id', 'title', 'product_type', 'status', 'options', 'tags'],

  // Card fields.
  subtitleProperties: ['product_type', 'status', 'options', 'vendor'],
  snippetProperty: 'body',
  imageProperty: 'featuredImage',
  linkProperty: 'admin_url',
});
export const ProductReference = coda.makeReferenceSchemaFromObjectSchema(
  ProductSyncTableSchema,
  PACK_IDENTITIES.Product
);
export const formatProductReference: FormatRowReferenceFn<number, 'title'> = (id: number, title = NOT_FOUND) => ({
  id,
  title,
});
