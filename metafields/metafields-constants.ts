import { GraphQlResource } from '../types/RequestsGraphQl';
import { MetafieldOwnerType } from '../types/admin.types';

import type { ResourceMetafieldsSyncTableDefinition } from '../types/Metafields';

// TODO: switch to enum ?
export const METAFIELD_TYPES = {
  boolean: 'boolean',
  collection_reference: 'collection_reference',
  color: 'color',
  date_time: 'date_time',
  date: 'date',
  dimension: 'dimension',
  file_reference: 'file_reference',
  json: 'json',
  metaobject_reference: 'metaobject_reference',
  mixed_reference: 'mixed_reference',
  money: 'money',
  multi_line_text_field: 'multi_line_text_field',
  number_decimal: 'number_decimal',
  number_integer: 'number_integer',
  page_reference: 'page_reference',
  product_reference: 'product_reference',
  rating: 'rating',
  rich_text_field: 'rich_text_field',
  single_line_text_field: 'single_line_text_field',
  url: 'url',
  variant_reference: 'variant_reference',
  volume: 'volume',
  weight: 'weight',

  // ++ list variants
  list_collection_reference: 'list.collection_reference',
  list_color: 'list.color',
  list_date: 'list.date',
  list_date_time: 'list.date_time',
  list_dimension: 'list.dimension',
  list_file_reference: 'list.file_reference',
  list_metaobject_reference: 'list.metaobject_reference',
  list_mixed_reference: 'list.mixed_reference',
  list_number_integer: 'list.number_integer',
  list_number_decimal: 'list.number_decimal',
  list_page_reference: 'list.page_reference',
  list_product_reference: 'list.product_reference',
  list_rating: 'list.rating',
  list_single_line_text_field: 'list.single_line_text_field',
  list_url: 'list.url',
  list_variant_reference: 'list.variant_reference',
  list_volume: 'list.volume',
  list_weight: 'list.weight',
} as const;

export const METAFIELD_LEGACY_TYPES = {
  string: 'string',
  integer: 'integer',
  json_string: 'json_string',
} as const;

// these are simple strings, not using Coda relation type columns
export const METAFIELD_TYPES_RAW_REFERENCE = [
  METAFIELD_TYPES.mixed_reference,
  METAFIELD_TYPES.list_mixed_reference,
] as const;

export const RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS: ResourceMetafieldsSyncTableDefinition[] = [
  {
    display: 'Article',
    key: GraphQlResource.Article,
    metafieldOwnerType: MetafieldOwnerType.Article,
    syncTableGraphQlQueryOperation: 'articles', // no graphQL here
    graphQlQueryOperation: 'article', // no graphQL here
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Blog',
    key: GraphQlResource.Blog,
    metafieldOwnerType: MetafieldOwnerType.Blog,
    syncTableGraphQlQueryOperation: 'blogs', // no graphQL here
    graphQlQueryOperation: 'blog', // no graphQL here
    storeFront: true,
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Collection',
    key: GraphQlResource.Collection,
    metafieldOwnerType: MetafieldOwnerType.Collection,
    syncTableGraphQlQueryOperation: 'collections',
    graphQlQueryOperation: 'collection',
    supportMetafieldDefinitions: true,
  },
  // {
  //   key: 'smart_collection',
  //   display: 'Smart Collection',
  //   metafieldOwnerType: 'LOL',
  //   adminUrlPart: 'collection',
  //   adminEntryUrlPart: 'collections',
  //   graphQlQueryOperation: 'collections',
  //   supportMetafieldDefinitions: false,
  // },
  {
    display: 'Customer',
    key: GraphQlResource.Customer,
    metafieldOwnerType: MetafieldOwnerType.Customer,
    syncTableGraphQlQueryOperation: 'customers',
    graphQlQueryOperation: 'customer',
    supportMetafieldDefinitions: true,
  },
  // TODO: maybe add support for draft orders later
  // {
  //   key: GraphQlResource.DraftOrder,
  //   display: 'Draft Order',
  //   metafieldOwnerType: MetafieldOwnerType.Draftorder,
  //   syncTableGraphQlQueryOperation: 'draftOrders',
  //   graphQlQueryOperation: 'draftOrder',
  //   supportMetafieldDefinitions: true,
  // },
  {
    display: 'Location',
    key: GraphQlResource.Location,
    metafieldOwnerType: MetafieldOwnerType.Location,
    syncTableGraphQlQueryOperation: 'locations',
    graphQlQueryOperation: 'location',
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Order',
    key: GraphQlResource.Order,
    metafieldOwnerType: MetafieldOwnerType.Order,
    syncTableGraphQlQueryOperation: 'orders',
    graphQlQueryOperation: 'order',
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Page',
    key: GraphQlResource.Page,
    metafieldOwnerType: MetafieldOwnerType.Page,
    syncTableGraphQlQueryOperation: 'pages', // no graphQL here
    graphQlQueryOperation: 'page', // no graphQL here
    storeFront: true,
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Product',
    key: GraphQlResource.Product,
    metafieldOwnerType: MetafieldOwnerType.Product,
    syncTableGraphQlQueryOperation: 'products',
    graphQlQueryOperation: 'product',
    storeFront: true,
    supportMetafieldDefinitions: true,
  },
  // {
  //   display: 'Product Image',
  //   key: 'product_image',
  //   metafieldOwnerType: 'LOL',
  //   adminUrlPart: 'article',
  //   adminEntryUrlPart: 'articles',
  //   graphQlQueryOperation: 'articles',
  //   supportMetafieldDefinitions: false,
  // },
  {
    display: 'Product Variant',
    key: GraphQlResource.ProductVariant,
    metafieldOwnerType: MetafieldOwnerType.Productvariant,
    syncTableGraphQlQueryOperation: 'productVariants',
    graphQlQueryOperation: 'productVariant',
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Shop',
    key: GraphQlResource.Shop,
    metafieldOwnerType: MetafieldOwnerType.Shop,
    syncTableGraphQlQueryOperation: 'shop',
    graphQlQueryOperation: 'shop',
    supportMetafieldDefinitions: false,
  },
];
