/**
 * Types of Rest Admin API resources that we support.
 */
enum RestResourceName {
  Article = 'Article',
  Blog = 'Blog',
  Collection = 'Collection',
  CustomCollection = 'CustomCollection',
  Customer = 'Customer',
  DraftOrder = 'DraftOrder',
  InventoryItem = 'InventoryItem',
  Location = 'Location',
  Order = 'Order',
  Page = 'Page',
  Product = 'Product',
  ProductVariant = 'ProductVariant',
  Shop = 'Shop',
}
type RestResourceNameTypes = typeof RestResourceName;

export type RestResource = {
  singular: string;
  plural: string;
  supportMetafields: boolean;
};
export const restResources: { [key in RestResourceNameTypes[keyof RestResourceNameTypes]]: RestResource } = {
  Article: {
    singular: 'article',
    plural: 'articles',
    supportMetafields: true,
  },
  Collection: {
    singular: 'collection',
    plural: 'collections',
    supportMetafields: true,
  },
  CustomCollection: {
    singular: 'custom_collection',
    plural: 'custom_collections',
    supportMetafields: true,
  },
  Blog: {
    singular: 'blog',
    plural: 'blogs',
    supportMetafields: true,
  },
  Customer: {
    singular: 'customer',
    plural: 'customers',
    supportMetafields: true,
  },
  DraftOrder: {
    singular: 'draft_order',
    plural: 'draft_orders',
    supportMetafields: true,
  },
  InventoryItem: {
    singular: 'inventory_item',
    plural: 'inventory_items',
    supportMetafields: false,
  },
  Location: {
    singular: 'location',
    plural: 'locations',
    supportMetafields: true,
  },
  Order: {
    singular: 'order',
    plural: 'orders',
    supportMetafields: true,
  },
  Page: {
    singular: 'page',
    plural: 'pages',
    supportMetafields: true,
  },
  Product: {
    singular: 'product',
    plural: 'products',
    supportMetafields: true,
  },
  ProductVariant: {
    singular: 'variant',
    plural: 'variants',
    supportMetafields: true,
  },
  Shop: {
    singular: 'shop',
    plural: 'shops',
    supportMetafields: true,
  },
} as const;
