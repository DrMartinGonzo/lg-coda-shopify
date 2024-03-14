import { GraphQlResourceName } from '../types/RequestsGraphQl';
import { MetafieldOwnerType } from '../types/admin.types';

import { SupportedGraphQlResourceWithMetafields } from '../types/Metafields';

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

type MetafieldTypes = typeof METAFIELD_TYPES;
/** A union of all the supported `metafield.type`s */
export type MetafieldTypeValue = MetafieldTypes[keyof MetafieldTypes];
type MetafieldLegacyTypes = typeof METAFIELD_LEGACY_TYPES;
/** A union of all the supported legacy `metafield.type`s */
type MetafieldLegacyTypeValue = MetafieldLegacyTypes[keyof MetafieldLegacyTypes];
/** A union of all the supported modern and legacy `metafield.type`s */
export type AllMetafieldTypeValue = MetafieldTypeValue | MetafieldLegacyTypeValue;

/**
 * An interface describing a resource metafields sync table definition.
 * On s'en sert pour définir la dynamicUrl de chaque sync table à partir de key.
 * Du coup derrière on peut récupérer les autres infos comme les parties d'url, etc…
 */
export interface ResourceMetafieldsSyncTableDefinition {
  /** The GraphQL resource type, acting as key */
  key: SupportedGraphQlResourceWithMetafields;
  /** Possible types of a metafield's owner resource */
  metafieldOwnerType: MetafieldOwnerType;
  /** The human readable display value of resource type */
  display: string;
  /** The query operation used to request all owners and their Metafields */
  syncTableGraphQlQueryOperation: string;
  /** The query operation used to request a specific owner and its Metafields */
  graphQlQueryOperation: string;
  /** Wether we should use storefront to query these metafields or not */
  storeFront?: boolean;
  /** Wether MetafieldDefinitions are supported in Shopify Admin for this resource */
  supportMetafieldDefinitions: boolean;
}
export const RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS: ResourceMetafieldsSyncTableDefinition[] = [
  {
    display: 'Article',
    key: GraphQlResourceName.OnlineStoreArticle,
    metafieldOwnerType: MetafieldOwnerType.Article,
    syncTableGraphQlQueryOperation: 'articles', // no graphQL here
    graphQlQueryOperation: 'article', // no graphQL here
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Blog',
    key: GraphQlResourceName.OnlineStoreBlog,
    metafieldOwnerType: MetafieldOwnerType.Blog,
    syncTableGraphQlQueryOperation: 'blogs', // no graphQL here
    graphQlQueryOperation: 'blog', // no graphQL here
    storeFront: true,
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Collection',
    key: GraphQlResourceName.Collection,
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
    key: GraphQlResourceName.Customer,
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
    key: GraphQlResourceName.Location,
    metafieldOwnerType: MetafieldOwnerType.Location,
    syncTableGraphQlQueryOperation: 'locations',
    graphQlQueryOperation: 'location',
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Order',
    key: GraphQlResourceName.Order,
    metafieldOwnerType: MetafieldOwnerType.Order,
    syncTableGraphQlQueryOperation: 'orders',
    graphQlQueryOperation: 'order',
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Page',
    key: GraphQlResourceName.OnlineStorePage,
    metafieldOwnerType: MetafieldOwnerType.Page,
    syncTableGraphQlQueryOperation: 'pages', // no graphQL here
    graphQlQueryOperation: 'page', // no graphQL here
    storeFront: true,
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Product',
    key: GraphQlResourceName.Product,
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
    key: GraphQlResourceName.ProductVariant,
    metafieldOwnerType: MetafieldOwnerType.Productvariant,
    syncTableGraphQlQueryOperation: 'productVariants',
    graphQlQueryOperation: 'productVariant',
    supportMetafieldDefinitions: true,
  },
  {
    display: 'Shop',
    key: GraphQlResourceName.Shop,
    metafieldOwnerType: MetafieldOwnerType.Shop,
    syncTableGraphQlQueryOperation: 'shop',
    graphQlQueryOperation: 'shop',
    supportMetafieldDefinitions: false,
  },
];
