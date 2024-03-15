/**
 * Types of GraphQL Admin API resources that we support.
 */
export enum GraphQlResourceName {
  Collection = 'Collection',
  Customer = 'Customer',
  DraftOrder = 'DraftOrder',
  GenericFile = 'GenericFile',
  Image = 'MediaImage',
  InventoryItem = 'InventoryItem',
  Location = 'Location',
  Metaobject = 'Metaobject',
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
  Video = 'Video',
}
