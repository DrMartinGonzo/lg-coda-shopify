import { NotFoundError } from '../../Errors/Errors';
import { getKeyFromValue } from '../../utils/helpers';

export type SupportedResource =
  | 'Article'
  | 'Asset'
  | 'Blog'
  | 'Collection'
  | 'CustomCollection'
  | 'SmartCollection'
  | 'Collect'
  | 'Customer'
  | 'DraftOrder'
  | 'File'
  | 'InventoryItem'
  | 'InventoryLevel'
  | 'Location'
  | 'Metafield'
  | 'MetafieldDefinition'
  | 'Metaobject'
  | 'MetaobjectDefinition'
  | 'Order'
  | 'OrderLineItem'
  | 'OrderTransaction'
  | 'Page'
  | 'Product'
  | 'ProductVariant'
  | 'Redirect'
  | 'Shop'
  | 'Theme';

export const RestResourcesSingular = {
  Article: 'article',
  Asset: 'asset',
  Blog: 'blog',
  Collection: 'collection',
  Collect: 'collect',
  CustomCollection: 'custom_collection',
  SmartCollection: 'smart_collection',
  Customer: 'customer',
  DraftOrder: 'draft_order',
  InventoryItem: 'inventory_item',
  InventoryLevel: 'inventory_level',
  Location: 'location',
  Metafield: 'metafield',
  Order: 'order',
  Page: 'page',
  Product: 'product',
  ProductVariant: 'variant',
  Redirect: 'redirect',
  Shop: 'shop',
  Theme: 'theme',
} as const satisfies Partial<Record<SupportedResource, string>> & Record<string, string>;
export type RestResourceSingular = (typeof RestResourcesSingular)[keyof typeof RestResourcesSingular];

export function singularToPlural(singular: RestResourceSingular): RestResourcePlural {
  const resourceKey = getKeyFromValue(RestResourcesSingular, singular);
  const plural = RestResourcesPlural[resourceKey];
  if (plural === undefined) throw new NotFoundError('plural');
  return plural;
}
export function pluralToSingular(plural: RestResourcePlural): RestResourceSingular {
  const resourceKey = getKeyFromValue(RestResourcesPlural, plural);
  const singular = RestResourcesSingular[resourceKey];
  if (plural === undefined) throw new NotFoundError('singular');
  return singular;
}

export const RestResourcesPlural = {
  Article: 'articles',
  Asset: 'assets',
  Blog: 'blogs',
  Collection: 'collections',
  Collect: 'collects',
  CustomCollection: 'custom_collections',
  SmartCollection: 'smart_collections',
  Customer: 'customers',
  DraftOrder: 'draft_orders',
  InventoryItem: 'inventory_items',
  InventoryLevel: 'inventory_levels',
  Location: 'locations',
  Metafield: 'metafields',
  Order: 'orders',
  Page: 'pages',
  Product: 'products',
  ProductVariant: 'variants',
  Redirect: 'redirects',
  Shop: 'shops',
  Theme: 'themes',
} as const satisfies Partial<Record<SupportedResource, string>> & Record<string, string>;
type RestResourcePlural = (typeof RestResourcesPlural)[keyof typeof RestResourcesPlural];

/**
 * Types of GraphQL Admin API resources
 */
export const GraphQlResourceNames = {
  Article: 'OnlineStoreArticle',
  Blog: 'OnlineStoreBlog',
  Collection: 'Collection',
  Customer: 'Customer',
  DraftOrder: 'DraftOrder',
  GenericFile: 'GenericFile',
  Image: 'MediaImage',
  InventoryItem: 'InventoryItem',
  InventoryLevel: 'InventoryLevel',
  Location: 'Location',
  MediaImage: 'MediaImage',
  Metaobject: 'Metaobject',
  MetaobjectDefinition: 'MetaobjectDefinition',
  Metafield: 'Metafield',
  MetafieldDefinition: 'MetafieldDefinition',
  Order: 'Order',
  OrderTransaction: 'OrderTransaction',
  Page: 'OnlineStorePage',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  Redirect: 'UrlRedirect',
  Shop: 'Shop',
  Video: 'Video',
} as const satisfies Partial<Record<SupportedResource, string>> & Record<string, string>;
export type GraphQlResourceName = (typeof GraphQlResourceNames)[keyof typeof GraphQlResourceNames];

export type Node = {
  /** A globally-unique ID. */
  id: string;
};
