import type { Article } from '@shopify/shopify-api/rest/admin/2023-10/article';
import type { Asset } from '@shopify/shopify-api/rest/admin/2023-10/asset';
import type { Blog } from '@shopify/shopify-api/rest/admin/2023-10/blog';
import type { Collection } from '@shopify/shopify-api/rest/admin/2023-10/collection';
import type { CustomCollection } from '@shopify/shopify-api/rest/admin/2023-10/custom_collection';
import type { Customer } from '@shopify/shopify-api/rest/admin/2023-10/customer';
import type { DraftOrder } from '@shopify/shopify-api/rest/admin/2023-10/draft_order';
import type { InventoryItem } from '@shopify/shopify-api/rest/admin/2023-10/inventory_item';
import type { InventoryLevel } from '@shopify/shopify-api/rest/admin/2023-10/inventory_level';
import type { Location } from '@shopify/shopify-api/rest/admin/2023-10/location';
import type { Metafield } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import type { Order } from '@shopify/shopify-api/rest/admin/2023-10/order';
import type { Page } from '@shopify/shopify-api/rest/admin/2023-10/page';
import type { Product } from '@shopify/shopify-api/rest/admin/2023-10/product';
import type { Redirect } from '@shopify/shopify-api/rest/admin/2023-10/redirect';
import type { SmartCollection } from '@shopify/shopify-api/rest/admin/2023-10/smart_collection';
import type { Variant } from '@shopify/shopify-api/rest/admin/2023-10/variant';
import type { Shop } from '@shopify/shopify-api/rest/admin/2023-10/shop';
import type { Theme } from '@shopify/shopify-api/rest/admin/2023-10/theme';

export type RestResources = {
  Article: Article;
  Asset: Asset;
  Blog: Blog;
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
  SmartCollection: SmartCollection;
  Variant: Variant;
  Shop: Shop;
  Theme: Theme;
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
  Order = 'orders',
  Page = 'pages',
  Product = 'products',
  ProductVariant = 'variants',
  Redirect = 'redirects',
  Shop = 'shops',
}
