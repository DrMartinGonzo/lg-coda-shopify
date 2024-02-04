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
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the collection.',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the collection in the Shopify admin.',
    },

    collection_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'collection_id',
      required: true,
      useThousandsSeparator: false,
      description: 'The ID for the collection.',
    },

    body: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Html,
      fixedId: 'body',
      description:
        'Text-only description of the collection, stripped of any HTML tags and formatting that were included.',
    },
    body_html: {
      type: coda.ValueType.String,
      fixedId: 'body_html',
      fromKey: 'body_html',
      mutable: true,
      description: 'The description of the collection, including any HTML tags and formatting.',
    },
    handle: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'handle',
      fromKey: 'handle',
      description: 'A unique string that identifies the collection.',
    },
    // image: {
    //   type: coda.ValueType.String,
    //   codaType: coda.ValueHintType.ImageReference,
    //   description: 'The image associated with the collection.',
    //   fixedId: 'image',
    // },
    image_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fixedId: 'image_url',
      mutable: true,
      description: 'The image associated with the collection.',
    },
    image_alt_text: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'image_alt_text',
      description: `Alternative text that describes the image associated with the collection.`,
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
      mutable: true,
      fixedId: 'published',
      fromKey: 'published',
      description: 'Whether the collection is visible.',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'published_at',
      fromKey: 'published_at',
      description: 'The time and date when the collection was made visible',
    },
    published_scope: {
      type: coda.ValueType.String,
      fixedId: 'published_scope',
      fromKey: 'published_scope',
      description: 'Whether the collection is published to the Point of Sale channel.',
    },
    rules: {
      type: coda.ValueType.Array,
      items: SmartCollectionRuleSchema,
      fixedId: 'rules',
      description:
        'For a smart (automated) collection, the list of rules that define what products go into the smart collection.',
    },

    ruleSet: CollectionRuleSetSchema,

    disjunctive: {
      type: coda.ValueType.Boolean,
      fixedId: 'disjunctive',
      description:
        'For a smart (automated) collection, , whether the product must match all the rules to be included in the smart collection.',
    },
    sort_order: {
      type: coda.ValueType.String,
      fixedId: 'sort_order',
      fromKey: 'sort_order',
      description: 'The order in which products in the collection appear',
    },
    template_suffix: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'template_suffix',
      fromKey: 'template_suffix',
      description: 'The suffix of the Liquid template being used to show the collection in an online store.',
    },
    title: {
      type: coda.ValueType.String,
      mutable: true,
      required: true,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The name of the collection.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the collection was last modified.',
    },
  },
  displayProperty: 'title',
  idProperty: 'collection_id',
  // admin_url will be the last featured property, added in Collections dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'handle'],

  // Card fields.
  subtitleProperties: ['handle', 'published_at', 'published_scope', 'template_suffix'],
  snippetProperty: 'body',
  imageProperty: 'image_url',
  linkProperty: 'admin_url',
});
export const collectionFieldDependencies = [
  {
    field: 'image',
    dependencies: ['image_url', 'image_alt_text'],
  },
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
      required: true,
      fromKey: 'id',
      fixedId: 'collect_id',
      useThousandsSeparator: false,
    },
    collection_id: {
      type: coda.ValueType.Number,
      fromKey: 'collection_id',
      fixedId: 'collection_id',
      useThousandsSeparator: false,
      description: 'The ID of the custom collection containing the product.',
    },
    collection: {
      ...CollectionReference,
      fixedId: 'collection',
      description: 'Relation to the related collection.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the collect was created.',
    },
    position: {
      type: coda.ValueType.Number,
      fixedId: 'position',
      fromKey: 'position',
      description:
        'The position of this product in a manually sorted custom collection. The first position is 1. This value is applied only when the custom collection is sorted manually.',
    },
    product_id: {
      type: coda.ValueType.Number,
      fixedId: 'product_id',
      fromKey: 'product_id',
      useThousandsSeparator: false,
      description: 'The unique numeric identifier for the product in the custom collection.',
    },
    product: {
      ...ProductReference,
      fixedId: 'product',
      description: 'Relation to the product in the custom collection.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the collect was last updated.',
    },
  },
  displayProperty: 'collect_id',
  idProperty: 'collect_id',
  featuredProperties: ['collect_id', 'collection', 'product', 'created_at', 'updated_at'],
});
export const collectFieldDependencies = [
  {
    field: 'product_id',
    dependencies: ['product'],
  },
  {
    field: 'collection_id',
    dependencies: ['collection'],
  },
  {
    field: 'published_at',
    dependencies: ['published'],
  },
];
