import { countryNames } from './contants--generated';

/**
 open: Show only open orders.
 closed: Show only closed orders.
 cancelled: Show only canceled orders.
 any: Show orders of any status, including archived
 */
export const OPTIONS_ORDER_STATUS = ['any', 'open', 'closed', 'cancelled'];

export const OPTIONS_DRAFT_ORDER_STATUS = ['open', 'completed', 'invoice_sent'];

export const DEFAULT_THUMBNAIL_SIZE = 64;

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

export const OPTIONS_PUBLISHED_STATUS = [
  { display: 'Any', value: 'any' },
  { display: 'Published', value: 'published' },
  { display: 'Unpublished', value: 'unpublished' },
];

// The status of the product. Valid values:
//  - ACTIVE: The product is ready to sell and is available to customers on the online store, sales channels, and apps. By default, existing products are set to active.
//  - ARCHIVED: The product is no longer being sold and isn't available to customers on sales channels and apps.
//  - DRAFT: The product isn't ready to sell and is unavailable to customers on sales channels and apps. By default, duplicated and unarchived products are set to draft.
export const OPTIONS_PRODUCT_STATUS_GRAPHQL = [
  { display: 'All', value: '*' },
  { display: 'Active', value: 'ACTIVE' },
  { display: 'Archived', value: 'ARCHIVED' },
  { display: 'Draft', value: 'DRAFT' },
];
export const OPTIONS_PRODUCT_STATUS_REST = [
  { display: 'Active', value: 'active' },
  { display: 'Archived', value: 'archived' },
  { display: 'Draft', value: 'draft' },
];
export const DEFAULT_PRODUCT_STATUS_REST = 'draft';

// The status of the metaobject. Valid values:
//  - ACTIVE: The metaobjects is active for public use.
//  - DRAFT: The metaobjects is an internal record.
export const OPTIONS_METAOBJECT_STATUS = [
  { display: 'Active', value: 'ACTIVE' },
  { display: 'Draft', value: 'DRAFT' },
];

export const OPTIONS_FILE_TYPE = [
  { display: 'Generic files', value: 'GENERIC_FILE' },
  { display: 'Images', value: 'IMAGE' },
  { display: 'Videos', value: 'VIDEO' },
];

export const DEFAULT_PRODUCT_OPTION_NAME = 'Coda Default';

export const COLLECTION_TYPE__SMART = 'smart_collection';
export const COLLECTION_TYPE__CUSTOM = 'custom_collection';

export const REST_DEFAULT_LIMIT = 250;
export const GRAPHQL_NODES_LIMIT = 250;


export const CACHE_DISABLED = 0;
export const CACHE_DEFAULT = 60 * 5; // 5 minute, Coda default as of 23/02/2024
export const CACHE_MAX = 60 * 60 * 24 * 365; // 1 year
export const CACHE_DAY = 60 * 60 * 24; // 1 day
export const CACHE_TEN_MINUTES = 60 * 10; // 10 minute

const PACK_PREFIX_KEY = 'lgs_';
export const CUSTOM_FIELD_PREFIX_KEY = `${PACK_PREFIX_KEY}meta__`;
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
] as const;

/** Noms complets des pays formattés avec leur clé pour autocompletion */
export const countryNameAutocompleteValues = Object.keys(countryNames).map((key) => ({
  display: countryNames[key],
  value: key,
}));

export enum Identity {
  Article = 'Article',
  Blog = 'Blog',
  Collection = 'Collection',
  Collect = 'Collect',
  Customer = 'Customer',
  DraftOrder = 'DraftOrder',
  File = 'File',
  InventoryItem = 'InventoryItem',
  InventoryLevel = 'InventoryLevel',
  Location = 'Location',
  Metafield = 'Metafield',
  MetafieldDefinition = 'MetafieldDefinition',
  Metaobject = 'Metaobject',
  Order = 'Order',
  OrderLineItem = 'OrderLineItem',
  OrderTransaction = 'OrderTransaction',
  Page = 'Page',
  Product = 'Product',
  ProductVariant = 'ProductVariant',
  Redirect = 'Redirect',
  Shop = 'Shop',
}

// #region Error Messages
export const NOT_FOUND = 'NOT_FOUND';
export const METAFIELDS_REQUIRED = 'Resource with metafieldOwnerType required';
export const GRAPHQL_REQUIRED_FOR_METAFIELDS =
  '`useGraphQl` must be enabled for at resource definition level to update metafields with GraphQL';
export const INVALID_GID = 'Invalid GID provided';
// #endregion
