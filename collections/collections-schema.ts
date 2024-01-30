import * as coda from '@codahq/packs-sdk';

import { ProductReference } from '../products/products-schema';
import { DEFAULT_THUMBNAIL_SIZE, IDENTITY_COLLECTION } from '../constants';

/*
export const CollectionImageSchema = coda.makeObjectSchema({
  properties: {
    // An image attached to a collection returned as Base64-encoded binary data.
    attachment: { type: coda.ValueType.String },
    // The source URL that specifies the location of the image.
    src: { type: coda.ValueType.String },
    // The alternative text that describes the collection image.
    alt: { type: coda.ValueType.String },
    // The width of the image in pixels.
    width: { type: coda.ValueType.Number },
    // The height of the image in pixels.
    height: { type: coda.ValueType.Number },
    // The time and date (ISO 8601 format) when the image was added to the collection.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'src',
});
*/

const CollectionRuleSchema = coda.makeObjectSchema({
  properties: {
    column: { type: coda.ValueType.String },
    condition: { type: coda.ValueType.String },
    relation: { type: coda.ValueType.String },
  },
  // displayProperty: 'relation',
});
const CollectionRuleSetSchema = coda.makeObjectSchema({
  properties: {
    display: { type: coda.ValueType.String },
    rules: { type: coda.ValueType.Array, items: CollectionRuleSchema },
    appliedDisjunctively: { type: coda.ValueType.Boolean },
  },
  displayProperty: 'display',
});

const SmartCollectionRuleSchema = coda.makeObjectSchema({
  properties: {
    /**
     * The property of a product being used to populate the smart collection.
     *  Valid values for text relations:
     *    - title: The product title.
     *    - type: The product type.
     *    - vendor: The name of the product vendor.
     *    - variant_title: The title of a product variant.
     *
     *  Valid values for number relations:
     *    - variant_compare_at_price: The compare price.
     *    - variant_weight: The weight of the product.
     *    - variant_inventory: The inventory stock. Note: not_equals does not work with this property.
     *    - variant_price: product price.
     *
     *  Valid values for an equals relation:
     *    - tag: A tag associated with the product. */
    column: { type: coda.ValueType.String },
    /**
     * The relationship between the column choice, and the condition.
     *  Valid values for number relations:
     *    - greater_than The column value is greater than the condition.
     *    - less_than The column value is less than the condition.
     *    - equals The column value is equal to the condition.
     *    - not_equals The column value is not equal to the condition.
     *
     *  Valid values for text relations:
     *    - equals: Checks if the column value is equal to the condition value.
     *    - not_equals: Checks if the column value is not equal to the condition value.
     *    - starts_with: Checks if the column value starts with the condition value.
     *    - ends_with: Checks if the column value ends with the condition value.
     *    - contains: Checks if the column value contains the condition value.
     *    - not_contains: Checks if the column value does not contain the condition value.
     */
    relation: { type: coda.ValueType.String },
    // condition: Select products for a smart collection using a condition. Values are either strings or numbers, depending on the relation value.
    condition: { type: coda.ValueType.String },
  },
  displayProperty: 'condition',
});

export const CollectionSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */

    /**
     * Disabled
     */

    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the collection.',
      required: true,
      fixedId: 'graphql_gid',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the collection in the Shopify admin.',
      fixedId: 'admin_url',
    },
    /* NOT NEEDED
    collection_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      description: 'The ID for the collection.',
      useThousandsSeparator: false,
    },
    */
    body: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Html,
      description:
        'Text-only description of the collection, stripped of any HTML tags and formatting that were included.',
      fixedId: 'body',
    },
    body_html: {
      type: coda.ValueType.String,
      description: 'The description of the collection, including any HTML tags and formatting.',
      fixedId: 'body_html',
      mutable: true,
    },
    handle: {
      type: coda.ValueType.String,
      description: 'A unique string that identifies the collection.',
      mutable: true,
      fixedId: 'handle',
    },
    image: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      description: 'The image associated with the collection.',
      fixedId: 'image',
    },
    // TODO: maybe thumbnail are never needed ?
    // thumbnail: {
    //   type: coda.ValueType.String,
    //   codaType: coda.ValueHintType.ImageReference,
    //   description: `The thumbnail (${DEFAULT_THUMBNAIL_SIZE}x${DEFAULT_THUMBNAIL_SIZE}px) image associated with the collection.`,
    // },
    published: {
      type: coda.ValueType.Boolean,
      codaType: coda.ValueHintType.Toggle,
      description: 'Whether the collection is visible.',
      mutable: true,
      fixedId: 'published',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The time and date when the collection was made visible',
      fixedId: 'published_at',
    },
    published_scope: {
      type: coda.ValueType.String,
      description: 'Whether the collection is published to the Point of Sale channel.',
      fixedId: 'published_scope',
    },
    rules: {
      type: coda.ValueType.Array,
      items: SmartCollectionRuleSchema,
      description:
        'For a smart (automated) collection, the list of rules that define what products go into the smart collection.',
      fixedId: 'rules',
    },

    ruleSet: CollectionRuleSetSchema,

    disjunctive: {
      type: coda.ValueType.Boolean,
      description:
        'For a smart (automated) collection, , whether the product must match all the rules to be included in the smart collection.',
      fixedId: 'disjunctive',
    },
    sort_order: {
      type: coda.ValueType.String,
      description: 'The order in which products in the collection appear',
      fixedId: 'sort_order',
    },
    template_suffix: {
      type: coda.ValueType.String,
      description: 'The suffix of the Liquid template being used to show the collection in an online store.',
      mutable: true,
      fixedId: 'template_suffix',
    },
    title: {
      type: coda.ValueType.String,
      mutable: true,
      required: true,
      description: 'The name of the collection.',
      fixedId: 'title',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the collection was last modified.',
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'title',
  idProperty: 'graphql_gid',
  // admin_url will be the last featured property, added in Collections dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'handle'],

  // Card fields.
  subtitleProperties: ['handle', 'published_at', 'published_scope', 'template_suffix'],
  snippetProperty: 'body',
  imageProperty: 'image',
  linkProperty: 'admin_url',
});
export const collectionFieldDependencies = [
  // {
  //   field: 'image',
  //   dependencies: ['thumbnail'],
  // },
  {
    field: 'id',
    dependencies: ['admin_url'],
  },
];

export const CollectionReference = coda.makeReferenceSchemaFromObjectSchema(CollectionSchema, IDENTITY_COLLECTION);

export const CollectSchema = coda.makeObjectSchema({
  properties: {
    //! admin_graphql_api_id DOES NOT EXIST

    collect_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      fixedId: 'collect_id',
    },
    collection_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the related collection.',
      fixedId: 'collection_gid',
    },
    collection: {
      ...CollectionReference,
      description: 'Relation to the related collection.',
      fixedId: 'collection',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
    },
    position: {
      type: coda.ValueType.Number,
      description:
        'The position of this product in a manually sorted custom collection. The first position is 1. This value is applied only when the custom collection is sorted manually.',
      fixedId: 'position',
    },
    product_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the product in the custom collection.',
      fixedId: 'product_gid',
    },
    product: {
      ...ProductReference,
      description: 'Relation to the product in the custom collection.',
      fixedId: 'product',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'collect_id',
  idProperty: 'collect_id',
  featuredProperties: ['collect_id', 'collection', 'product'],
});
export const collectFieldDependencies = [
  {
    field: 'product_id',
    dependencies: ['product', 'product_gid'],
  },
  {
    field: 'collection_id',
    dependencies: ['collection', 'collection_gid'],
  },
  {
    field: 'published_at',
    dependencies: ['published'],
  },
];
