import { MetafieldOwnerType } from './admin.types';

/**
 * Types of Rest Admin API resources that we support.
 */
export enum RestResourceName {
  Article = 'Article',
  Blog = 'Blog',
  Collection = 'Collection',
  Collect = 'Collect',
  CustomCollection = 'CustomCollection',
  SmartCollection = 'SmartCollection',
  Customer = 'Customer',
  DraftOrder = 'DraftOrder',
  InventoryItem = 'InventoryItem',
  InventoryLevel = 'InventoryLevel',
  Location = 'Location',
  Order = 'Order',
  Page = 'Page',
  Product = 'Product',
  ProductVariant = 'ProductVariant',
  Redirect = 'Redirect',
  Shop = 'Shop',
}

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

export type RestResource = {
  singular: RestResourceSingular;
  plural: RestResourcePlural;
  metafieldOwnerType?: MetafieldOwnerType;
  supportMetafields: boolean;
};

export const restResources: Record<RestResourceName, RestResource> = {
  Article: {
    singular: RestResourceSingular.Article,
    plural: RestResourcePlural.Article,
    metafieldOwnerType: MetafieldOwnerType.Article,
    supportMetafields: true,
  },
  Blog: {
    singular: RestResourceSingular.Blog,
    plural: RestResourcePlural.Blog,
    metafieldOwnerType: MetafieldOwnerType.Blog,
    supportMetafields: true,
  },
  Collection: {
    singular: RestResourceSingular.Collection,
    plural: RestResourcePlural.Collection,
    metafieldOwnerType: MetafieldOwnerType.Collection,
    supportMetafields: true,
  },
  Collect: {
    singular: RestResourceSingular.Collect,
    plural: RestResourcePlural.Collect,
    metafieldOwnerType: MetafieldOwnerType.Collection,
    supportMetafields: true,
  },
  CustomCollection: {
    singular: RestResourceSingular.CustomCollection,
    plural: RestResourcePlural.CustomCollection,
    metafieldOwnerType: MetafieldOwnerType.Collection,
    supportMetafields: true,
  },
  SmartCollection: {
    singular: RestResourceSingular.SmartCollection,
    plural: RestResourcePlural.SmartCollection,
    // TODO: check
    supportMetafields: false,
  },
  Customer: {
    singular: RestResourceSingular.Customer,
    plural: RestResourcePlural.Customer,
    metafieldOwnerType: MetafieldOwnerType.Customer,
    supportMetafields: true,
  },
  DraftOrder: {
    singular: RestResourceSingular.DraftOrder,
    plural: RestResourcePlural.DraftOrder,
    metafieldOwnerType: MetafieldOwnerType.Draftorder,
    supportMetafields: true,
  },
  InventoryItem: {
    singular: RestResourceSingular.InventoryItem,
    plural: RestResourcePlural.InventoryItem,
    supportMetafields: false,
  },
  InventoryLevel: {
    singular: RestResourceSingular.InventoryLevel,
    plural: RestResourcePlural.InventoryLevel,
    supportMetafields: false,
  },
  Location: {
    singular: RestResourceSingular.Location,
    plural: RestResourcePlural.Location,
    metafieldOwnerType: MetafieldOwnerType.Location,
    supportMetafields: true,
  },
  Order: {
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
    metafieldOwnerType: MetafieldOwnerType.Order,
    supportMetafields: true,
  },
  Page: {
    singular: RestResourceSingular.Page,
    plural: RestResourcePlural.Page,
    metafieldOwnerType: MetafieldOwnerType.Page,
    supportMetafields: true,
  },
  Product: {
    singular: RestResourceSingular.Product,
    plural: RestResourcePlural.Product,
    metafieldOwnerType: MetafieldOwnerType.Product,
    supportMetafields: true,
  },
  ProductVariant: {
    singular: RestResourceSingular.ProductVariant,
    plural: RestResourcePlural.ProductVariant,
    metafieldOwnerType: MetafieldOwnerType.Productvariant,
    supportMetafields: true,
  },
  Redirect: {
    singular: RestResourceSingular.Redirect,
    plural: RestResourcePlural.Redirect,
    supportMetafields: false,
  },
  Shop: {
    singular: RestResourceSingular.Shop,
    plural: RestResourcePlural.Shop,
    metafieldOwnerType: MetafieldOwnerType.Shop,
    supportMetafields: true,
  },
} as const;
