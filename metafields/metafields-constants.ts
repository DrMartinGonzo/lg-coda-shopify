import { GraphQlResource } from '../types/GraphQl';
import { ResourceMetafieldsSyncTableDefinition } from '../types/Metafields';

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

export const RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS: ResourceMetafieldsSyncTableDefinition[] = [
  {
    display: 'Article',
    key: GraphQlResource.Article,
    syncTableGraphQlQueryOperation: 'articles', // TODO: no graphQL here
    graphQlQueryOperation: 'article', // TODO: no graphQL here
  },
  {
    display: 'Blog',
    key: GraphQlResource.Blog,
    syncTableGraphQlQueryOperation: 'blogs', // TODO: no graphQL here
    graphQlQueryOperation: 'blog', // TODO: no graphQL here
    storeFront: true,
  },
  {
    display: 'Collection',
    key: GraphQlResource.Collection,
    syncTableGraphQlQueryOperation: 'collections',
    graphQlQueryOperation: 'collection',
  },
  // {
  //   key: 'smart_collection',
  //   display: 'Smart Collection',
  //   metafieldOwnerType: 'LOL',
  //   adminUrlPart: 'collection',
  //   adminEntryUrlPart: 'collections',
  //   graphQlQueryOperation: 'collections',
  // },
  {
    display: 'Customer',
    key: GraphQlResource.Customer,
    syncTableGraphQlQueryOperation: 'customers',
    graphQlQueryOperation: 'customer',
  },
  // TODO: maybe add support for draft orders later
  // {
  //   key: GraphQlResource.DraftOrder,
  //   display: 'Draft Order',
  //   metafieldOwnerType: MetafieldOwnerType.Draftorder,
  //   syncTableGraphQlQueryOperation: 'draftOrders',
  //   graphQlQueryOperation: 'draftOrder',
  // },
  {
    display: 'Location',
    key: GraphQlResource.Location,
    syncTableGraphQlQueryOperation: 'locations',
    graphQlQueryOperation: 'location',
  },
  {
    display: 'Order',
    key: GraphQlResource.Order,
    syncTableGraphQlQueryOperation: 'orders',
    graphQlQueryOperation: 'order',
  },
  {
    display: 'Page',
    key: GraphQlResource.Page,
    syncTableGraphQlQueryOperation: 'pages', // TODO: no graphQL here
    graphQlQueryOperation: 'page', // TODO: no graphQL here
    storeFront: true,
  },
  {
    display: 'Product',
    key: GraphQlResource.Product,
    syncTableGraphQlQueryOperation: 'products',
    graphQlQueryOperation: 'product',
    storeFront: true,
  },
  // {
  //   display: 'Product Image',
  //   key: 'product_image',
  //   metafieldOwnerType: 'LOL',
  //   adminUrlPart: 'article',
  //   adminEntryUrlPart: 'articles',
  //   graphQlQueryOperation: 'articles',
  // },
  {
    display: 'Product Variant',
    key: GraphQlResource.ProductVariant,
    syncTableGraphQlQueryOperation: 'productVariants',
    graphQlQueryOperation: 'productVariant',
  },
  {
    display: 'Shop',
    key: GraphQlResource.Shop,
    syncTableGraphQlQueryOperation: 'shop',
    graphQlQueryOperation: 'shop',
  },
];
