import { Article } from '@shopify/shopify-api/rest/admin/2023-10/article';
import { Asset } from '@shopify/shopify-api/rest/admin/2023-10/asset';
import { Blog } from '@shopify/shopify-api/rest/admin/2023-10/blog';
import { Collect } from '@shopify/shopify-api/rest/admin/2023-10/collect';
import { Collection } from '@shopify/shopify-api/rest/admin/2023-10/collection';
import { CustomCollection } from '@shopify/shopify-api/rest/admin/2023-10/custom_collection';
import { Customer } from '@shopify/shopify-api/rest/admin/2023-10/customer';
import { DraftOrder } from '@shopify/shopify-api/rest/admin/2023-10/draft_order';
import { InventoryItem } from '@shopify/shopify-api/rest/admin/2023-10/inventory_item';
import { InventoryLevel } from '@shopify/shopify-api/rest/admin/2023-10/inventory_level';
import { Location } from '@shopify/shopify-api/rest/admin/2023-10/location';
import { Metafield } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import { Order } from '@shopify/shopify-api/rest/admin/2023-10/order';
import { Page } from '@shopify/shopify-api/rest/admin/2023-10/page';
import { Product } from '@shopify/shopify-api/rest/admin/2023-10/product';
import { Redirect } from '@shopify/shopify-api/rest/admin/2023-10/redirect';
import { Shop } from '@shopify/shopify-api/rest/admin/2023-10/shop';
import { SmartCollection } from '@shopify/shopify-api/rest/admin/2023-10/smart_collection';
import { Theme } from '@shopify/shopify-api/rest/admin/2023-10/theme';
import { Variant } from '@shopify/shopify-api/rest/admin/2023-10/variant';

// #region Rest
export type RestResources = {
  Article: Article;
  Asset: Asset;
  Blog: Blog;
  Collect: Collect;
  Collection: Collection;
  CustomCollection: CustomCollection;
  Customer: Customer;
  DraftOrder: DraftOrder;
  InventoryItem: InventoryItem;
  InventoryLevel: InventoryLevel;
  Location: Location;
  Metafield: Metafield;
  Order: Order;
  Page: Page;
  Product: Product;
  Redirect: Redirect;
  Shop: Shop;
  SmartCollection: SmartCollection;
  Theme: Theme;
  Variant: Variant;
};

export enum RestResourceSingular {
  Article = 'article',
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
}

export enum RestResourcePlural {
  Article = 'articles',
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
