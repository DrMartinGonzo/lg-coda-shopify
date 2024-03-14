import { Identity } from '../constants';
import { MetafieldOwnerType } from './admin.types';

export interface BaseSyncTableRestParams {
  limit?: number;
}

/**
 * Types of Rest Admin API resources that we support.
 */
export enum RestResourceName {
  Article = Identity.Article,
  Blog = Identity.Blog,
  Collection = Identity.Collection,
  Collect = Identity.Collect,
  CustomCollection = 'CustomCollection',
  SmartCollection = 'SmartCollection',
  Customer = Identity.Customer,
  DraftOrder = Identity.DraftOrder,
  InventoryItem = Identity.InventoryItem,
  InventoryLevel = Identity.InventoryLevel,
  Location = Identity.Location,
  Order = Identity.Order,
  Page = Identity.Page,
  Product = Identity.Product,
  ProductVariant = Identity.ProductVariant,
  Redirect = Identity.Redirect,
  Shop = Identity.Shop,
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
  metafieldOwnerType: MetafieldOwnerType;
};

export const restResources: Record<RestResourceName, RestResource> = {
  Article: {
    singular: RestResourceSingular.Article,
    plural: RestResourcePlural.Article,
    metafieldOwnerType: MetafieldOwnerType.Article,
  },
  Blog: {
    singular: RestResourceSingular.Blog,
    plural: RestResourcePlural.Blog,
    metafieldOwnerType: MetafieldOwnerType.Blog,
  },
  Collection: {
    singular: RestResourceSingular.Collection,
    plural: RestResourcePlural.Collection,
    metafieldOwnerType: MetafieldOwnerType.Collection,
  },
  Collect: {
    singular: RestResourceSingular.Collect,
    plural: RestResourcePlural.Collect,
    metafieldOwnerType: MetafieldOwnerType.Collection,
  },
  CustomCollection: {
    singular: RestResourceSingular.CustomCollection,
    plural: RestResourcePlural.CustomCollection,
    metafieldOwnerType: MetafieldOwnerType.Collection,
  },
  SmartCollection: {
    singular: RestResourceSingular.SmartCollection,
    plural: RestResourcePlural.SmartCollection,
    metafieldOwnerType: MetafieldOwnerType.Collection,
  },
  Customer: {
    singular: RestResourceSingular.Customer,
    plural: RestResourcePlural.Customer,
    metafieldOwnerType: MetafieldOwnerType.Customer,
  },
  DraftOrder: {
    singular: RestResourceSingular.DraftOrder,
    plural: RestResourcePlural.DraftOrder,
    metafieldOwnerType: MetafieldOwnerType.Draftorder,
  },
  InventoryItem: {
    singular: RestResourceSingular.InventoryItem,
    plural: RestResourcePlural.InventoryItem,
    metafieldOwnerType: undefined,
  },
  InventoryLevel: {
    singular: RestResourceSingular.InventoryLevel,
    plural: RestResourcePlural.InventoryLevel,
    metafieldOwnerType: undefined,
  },
  Location: {
    singular: RestResourceSingular.Location,
    plural: RestResourcePlural.Location,
    metafieldOwnerType: MetafieldOwnerType.Location,
  },
  Order: {
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
    metafieldOwnerType: MetafieldOwnerType.Order,
  },
  Page: {
    singular: RestResourceSingular.Page,
    plural: RestResourcePlural.Page,
    metafieldOwnerType: MetafieldOwnerType.Page,
  },
  Product: {
    singular: RestResourceSingular.Product,
    plural: RestResourcePlural.Product,
    metafieldOwnerType: MetafieldOwnerType.Product,
  },
  ProductVariant: {
    singular: RestResourceSingular.ProductVariant,
    plural: RestResourcePlural.ProductVariant,
    metafieldOwnerType: MetafieldOwnerType.Productvariant,
  },
  Redirect: {
    singular: RestResourceSingular.Redirect,
    plural: RestResourcePlural.Redirect,
    metafieldOwnerType: undefined,
  },
  Shop: {
    singular: RestResourceSingular.Shop,
    plural: RestResourcePlural.Shop,
    metafieldOwnerType: MetafieldOwnerType.Shop,
  },
} as const;
