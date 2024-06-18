// #region Imports
import { SupportedResource } from './resourceNames-constants';

// #endregion

const PACK_PREFIX_KEY = 'lgs_';
export const CUSTOM_FIELD_PREFIX_KEY = `${PACK_PREFIX_KEY}meta__`;
export const PACK_TEST_ENDPOINT = 'https://coda-pack-test.myshopify.com';

/**
 * Coda Identities. Also used as diplay name
 */
export const PACK_IDENTITIES = {
  Article: 'Article',
  Asset: 'Asset',
  Blog: 'Blog',
  Collection: 'Collection',
  Collect: 'Collect',
  Customer: 'Customer',
  DraftOrder: 'DraftOrder',
  File: 'File',
  InventoryItem: 'InventoryItem',
  InventoryLevel: 'InventoryLevel',
  Location: 'Location',
  Metafield: 'Metafield',
  MetafieldDefinition: 'MetafieldDefinition',
  Metaobject: 'Metaobject',
  MetaobjectDefinition: 'MetaobjectDefinition',
  Order: 'Order',
  OrderLineItem: 'OrderLineItem',
  OrderTransaction: 'OrderTransaction',
  Page: 'Page',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  Redirect: 'Redirect',
  Shop: 'Shop',
  Theme: 'Theme',
  Translation: 'Translation',
  TranslatableContent: 'TranslatableContent',
} as const satisfies Partial<Record<SupportedResource, string>>;

export type Identity = (typeof PACK_IDENTITIES)[keyof typeof PACK_IDENTITIES];
