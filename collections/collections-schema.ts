import * as coda from '@codahq/packs-sdk';

import { ProductReference, ProductSchema } from '../products/products-schema';

export const ProductIdsCollectionSchema = coda.makeObjectSchema({
  properties: {
    product_id: { type: coda.ValueType.Number, required: true },
    collection_id: { type: coda.ValueType.Number, required: true },
    unique_id: { type: coda.ValueType.String, required: true },
  },
  displayProperty: 'unique_id',
  idProperty: 'unique_id',
  featuredProperties: ['product_id'],
});

export const ProductInCollectionSchema = coda.makeObjectSchema({
  properties: {
    collection_id: { type: coda.ValueType.Number, required: true },
    product: ProductReference,
    unique_id: { type: coda.ValueType.String, required: true },
  },
  displayProperty: 'product',
  idProperty: 'unique_id',
  featuredProperties: ['collection_id', 'product'],
});

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

export const CollectionSchema = coda.makeObjectSchema({
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

    admin_graphql_api_id: { type: coda.ValueType.String },
    // A description of the collection, complete with HTML markup. Many templates display this on their collection pages.
    body_html: { type: coda.ValueType.String, codaType: coda.ValueHintType.Html },
    // A unique, human-readable string for the collection automatically generated from its title. This is used in themes by the Liquid templating language to refer to the collection. (limit: 255 characters)
    handle: { type: coda.ValueType.String },
    // The ID for the collection.
    collection_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    // The time and date (ISO 8601 format) when the collection was made visible. Returns null for a hidden collection.
    published_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // Whether the collection is published to the Point of Sale channel. Valid values:
    //  - web: The collection is published to the Online Store channel but not published to the Point of Sale channel.
    //  - global: The collection is published to both the Online Store channel and the Point of Sale channel.
    published_scope: { type: coda.ValueType.String },
    // The order in which products in the collection appear. Valid values:
    //  - alpha-asc: Alphabetically, in ascending order (A - Z).
    //  - alpha-desc: Alphabetically, in descending order (Z - A).
    //  - best-selling: By best-selling products.
    //  - created: By date created, in ascending order (oldest - newest).
    //  - created-desc: By date created, in descending order (newest - oldest).
    //  - manual: In the order set manually by the shop owner.
    //  - price-asc: By price, in ascending order (lowest - highest).
    //  - price-desc: By price, in descending order (highest - lowest).
    sort_order: { type: coda.ValueType.String },
    // The suffix of the liquid template being used. For example, if the value is custom, then the collection is using the collection.custom.liquid template. If the value is null, then the collection is using the default collection.liquid.
    template_suffix: { type: coda.ValueType.String },
    // The name of the collection. (limit: 255 characters)

    title: { type: coda.ValueType.String },
    // The date and time (ISO 8601 format) when the collection was last modified.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // Image associated with the collection. Valid values are:
    image: CollectionImageSchema,
  },
  displayProperty: 'title',
  idProperty: 'collection_id',
  featuredProperties: ['title', 'handle'],
});

export const CustomCollectionSchema = coda.makeObjectSchema({
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
    //
    admin_graphql_api_id: { type: coda.ValueType.String },
    body: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Html,
      description: 'The description of the custom collection.',
    },
    body_html: {
      type: coda.ValueType.String,
      description: 'The description of the custom collection, in raw HTML.',
    },
    // A human-friendly unique string for the custom collection automatically generated from its title. This is used in shop themes by the Liquid templating language to refer to the custom collection. (limit: 255 characters)
    handle: { type: coda.ValueType.String },
    // Image associated with the custom collection.
    // image: CollectionImageSchema,
    image: { type: coda.ValueType.String, codaType: coda.ValueHintType.ImageAttachment },
    // The ID for the collection.
    custom_collection_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    // Whether the custom collection is published to the Online Store channel.
    published: { type: coda.ValueType.Boolean },
    // The time and date (ISO 8601 format) when the collection was made visible. Returns null for a hidden collection.
    published_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // Whether the collection is published to the Point of Sale channel. Valid values:
    //  - web: The custom collection is published to the Online Store channel but not published to the Point of Sale channel.
    //  - global: The custom collection is published to both the Online Store channel and the Point of Sale channel.
    published_scope: { type: coda.ValueType.String },
    // The order in which products in the custom collection appear. Valid values:
    //  - alpha-asc: Alphabetically, in ascending order (A - Z).
    //  - alpha-desc: Alphabetically, in descending order (Z - A).
    //  - best-selling: By best-selling products.
    //  - created: By date created, in ascending order (oldest - newest).
    //  - created-desc: By date created, in descending order (newest - oldest).
    //  - manual: Order created by the shop owner.
    //  - price-asc: By price, in ascending order (lowest - highest).
    //  - price-desc: By price, in descending order (highest - lowest).
    sort_order: { type: coda.ValueType.String },
    // The suffix of the liquid template being used. For example, if the value is custom, then the collection is using the collection.custom.liquid template. If the value is null, then the collection is using the default collection.liquid.
    template_suffix: { type: coda.ValueType.String },
    // The name of the custom collection. (limit: 255 characters)
    title: { type: coda.ValueType.String },
    // The date and time (ISO 8601 format) when the custom collection was last modified.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'title',
  idProperty: 'custom_collection_id',
  featuredProperties: ['custom_collection_id', 'title', 'handle'],
});

export const SmartCollectionRuleSchema = coda.makeObjectSchema({
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

export const SmartCollectionSchema = coda.makeObjectSchema({
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
    admin_graphql_api_id: { type: coda.ValueType.String },
    // The description of the smart collection. Includes HTML markup. Many shop themes display this on the smart collection page.
    body_html: { type: coda.ValueType.String, codaType: coda.ValueHintType.Html },
    // A human-friendly unique string for the smart collection. Automatically generated from the title. Used in shop themes by the Liquid templating language to refer to the smart collection. (maximum: 255 characters)
    handle: { type: coda.ValueType.String },
    // The ID of the smart collection.
    smart_collection_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    // The image associated with the smart collection. Valid values:
    // image: CollectionImageSchema,
    image: { type: coda.ValueType.String, codaType: coda.ValueHintType.ImageAttachment },
    // The date and time (ISO 8601 format) that the smart collection was published. Returns null when the collection is hidden.
    published_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // Whether the smart collection is published to the Point of Sale channel. Valid values:
    //  - web: The smart collection is published to the Online Store channel but not published to the Point of Sale channel.
    //  - global: The smart collection is published to both the Online Store channel and the Point of Sale channel.
    published_scope: { type: coda.ValueType.String },
    // The list of rules that define what products go into the smart collection. Each rule has the following properties:
    rules: { type: coda.ValueType.Array, items: SmartCollectionRuleSchema },
    // Whether the product must match all the rules to be included in the smart collection. Valid values:
    //  - true: Products only need to match one or more of the rules to be included in the smart collection.
    //  - false: Products must match all of the rules to be included in the smart collection.
    disjunctive: { type: coda.ValueType.Boolean },
    // The order of the products in the smart collection. Valid values:
    //  - alpha-asc: The products are sorted alphabetically from A to Z.
    //  - alpha-des: The products are sorted alphabetically from Z to A.
    //  - best-selling: The products are sorted by number of sales.
    //  - created: The products are sorted by the date they were created, from oldest to newest.
    //  - created-desc: The products are sorted by the date they were created, from newest to oldest.
    //  - manual: The products are manually sorted by the shop owner.
    //  - price-asc: The products are sorted by price from lowest to highest.
    //  - price-desc: The products are sorted by price from highest to lowest.
    sort_order: { type: coda.ValueType.String },
    // The suffix of the Liquid template that the shop uses. By default, the original template is called product.liquid, and additional templates are called product.suffix.liquid.
    template_suffix: { type: coda.ValueType.String },
    // The name of the custom collection. (limit: 255 characters)
    title: { type: coda.ValueType.String },
    // The date and time (ISO 8601 format) when the smart collection was last modified.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'title',
  idProperty: 'smart_collection_id',
  featuredProperties: ['smart_collection_id', 'title', 'handle'],
});

export const CollectSchema = coda.makeObjectSchema({
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

    admin_graphql_api_id: { type: coda.ValueType.String },
    collect_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    collection_id: { type: coda.ValueType.Number },
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    position: { type: coda.ValueType.Number },
    product: ProductReference,
    sort_value: { type: coda.ValueType.String },
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'collect_id',
  idProperty: 'collect_id',
  featuredProperties: ['collect_id', 'collection_id', 'product'],
});
