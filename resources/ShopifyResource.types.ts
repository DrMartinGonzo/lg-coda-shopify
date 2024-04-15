// #region Rest

export enum RestResourceSingular {
  Article = 'article',
  Asset = 'asset',
  Blog = 'blog',
  Collection = 'collection',
  Collect = 'collect',
  CustomCollection = 'custom_collection',
  SmartCollection = 'smart_collection',
  Customer = 'customer',
  DraftOrder = 'draft_order',
  InventoryItem = 'inventory_item',
  InventoryLevel = 'inventory_level',
  Location = 'location',
  Metafield = 'metafield',
  Order = 'order',
  Page = 'page',
  Product = 'product',
  ProductVariant = 'variant',
  Redirect = 'redirect',
  Shop = 'shop',
  Theme = 'theme',
}

export enum RestResourcePlural {
  Article = 'articles',
  Asset = 'assets',
  Blog = 'blogs',
  Collection = 'collections',
  Collect = 'collects',
  CustomCollection = 'custom_collections',
  SmartCollection = 'smart_collections',
  Customer = 'customers',
  DraftOrder = 'draft_orders',
  InventoryItem = 'inventory_items',
  InventoryLevel = 'inventory_levels',
  Location = 'locations',
  Metafield = 'metafields',
  Order = 'orders',
  Page = 'pages',
  Product = 'products',
  ProductVariant = 'variants',
  Redirect = 'redirects',
  Shop = 'shops',
  Theme = 'themes',
}
// #endregion

// #region GraphQl
/**
 * Types of GraphQL Admin API resources
 */
export enum GraphQlResourceName {
  Collection = 'Collection',
  Customer = 'Customer',
  DraftOrder = 'DraftOrder',
  GenericFile = 'GenericFile',
  Image = 'MediaImage',
  InventoryItem = 'InventoryItem',
  InventoryLevel = 'InventoryLevel',
  Location = 'Location',
  MediaImage = 'MediaImage',
  Metaobject = 'Metaobject',
  MetaobjectDefinition = 'MetaobjectDefinition',
  Metafield = 'Metafield',
  MetafieldDefinition = 'MetafieldDefinition',
  OnlineStoreArticle = 'OnlineStoreArticle',
  OnlineStoreBlog = 'OnlineStoreBlog',
  OnlineStorePage = 'OnlineStorePage',
  Order = 'Order',
  OrderTransaction = 'OrderTransaction',
  Product = 'Product',
  ProductVariant = 'ProductVariant',
  Shop = 'Shop',
  UrlRedirect = 'UrlRedirect',
  Video = 'Video',
}
// #endregion
