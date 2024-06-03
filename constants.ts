import { SupportedResource } from './Resources/types/SupportedResource';
import { countryNames } from './contants--generated';

// #region Cache
export const CACHE_DISABLED = 0;
export const CACHE_DEFAULT = 60 * 5; // 5 minute, Coda default as of 23/02/2024
export const CACHE_MAX = 60 * 60 * 24 * 365; // 1 year
export const CACHE_DAY = 60 * 60 * 24; // 1 day
export const CACHE_TEN_MINUTES = 60 * 10; // 10 minute
// #endregion

// #region Options
/** Noms complets des pays formattés avec leur code associé pour autocompletion */
export const OPTIONS_COUNTRY_NAMES = Object.entries(countryNames).map(([key, value]) => ({
  display: value,
  value: key,
}));

export const OPTIONS_DRAFT_ORDER_STATUS = ['open', 'completed', 'invoice_sent'];

export const OPTIONS_FILE_TYPE = [
  { display: 'Generic files', value: 'GENERIC_FILE' },
  { display: 'Images', value: 'IMAGE' },
  { display: 'Videos', value: 'VIDEO' },
];

// The status of the metaobject. Valid values:
//  - ACTIVE: The metaobjects is active for public use.
//  - DRAFT: The metaobjects is an internal record.
export const OPTIONS_METAOBJECT_STATUS = [
  { display: 'Active', value: 'ACTIVE' },
  { display: 'Draft', value: 'DRAFT' },
];

/**
 open: Show only open orders.
 closed: Show only closed orders.
 cancelled: Show only canceled orders.
 any: Show orders of any status, including archived
 */
export const OPTIONS_ORDER_STATUS = ['any', 'open', 'closed', 'cancelled'];

export const OPTIONS_ORDER_FINANCIAL_STATUS = [
  'any',
  'authorized',
  'pending',
  'paid',
  'partially_paid',
  'refunded',
  'voided',
  'partially_refunded',
  'unpaid',
];
export const OPTIONS_ORDER_FULFILLMENT_STATUS = ['any', 'shipped', 'partial', 'unshipped', 'unfulfilled'];

// The status of the product. Valid values:
//  - ACTIVE: The product is ready to sell and is available to customers on the online store, sales channels, and apps. By default, existing products are set to active.
//  - ARCHIVED: The product is no longer being sold and isn't available to customers on sales channels and apps.
//  - DRAFT: The product isn't ready to sell and is unavailable to customers on sales channels and apps. By default, duplicated and unarchived products are set to draft.
export const OPTIONS_PRODUCT_STATUS_GRAPHQL = [
  // { display: 'All', value: '*' },
  { display: 'Active', value: 'ACTIVE' },
  { display: 'Archived', value: 'ARCHIVED' },
  { display: 'Draft', value: 'DRAFT' },
];
export const OPTIONS_PRODUCT_STATUS_REST = [
  { display: 'Active', value: 'active' },
  { display: 'Archived', value: 'archived' },
  { display: 'Draft', value: 'draft' },
];
export const DEFAULT_PRODUCT_STATUS_GRAPHQL = 'DRAFT';
export const DEFAULT_PRODUCT_STATUS_REST = 'draft';

export const OPTIONS_PUBLISHED_STATUS = [
  { display: 'Any', value: 'any' },
  { display: 'Published', value: 'published' },
  { display: 'Unpublished', value: 'unpublished' },
];
// #endregion

// #region Pack
export const PREFIX_FAKE = 'FAKE_';
export const FULL_SIZE = 'Full size';

const PACK_PREFIX_KEY = 'lgs_';
export const CUSTOM_FIELD_PREFIX_KEY = `${PACK_PREFIX_KEY}meta__`;

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
} as const satisfies Partial<Record<SupportedResource, string>>;

export type Identity = (typeof PACK_IDENTITIES)[keyof typeof PACK_IDENTITIES];
// #endregion

export const REST_DEFAULT_LIMIT = 250;
export const GRAPHQL_NODES_LIMIT = 250;

export const CODA_SUPPORTED_CURRENCIES = [
  'BRL',
  'CHF',
  'EUR',
  'GBP',
  'IDR',
  'ILS',
  'INR',
  'JPY',
  'KRW',
  'NOK',
  'PLN',
  'RUB',
  'TRY',
  'UAH',
  'USD',
  'VND',
  'XBT',
];

export const NOT_FOUND = 'NOT_FOUND';

