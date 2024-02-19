export const IS_ADMIN_RELEASE = true;

/**
 open: Show only open orders.
 closed: Show only closed orders.
 cancelled: Show only canceled orders.
 any: Show orders of any status, including archived
 */
export const OPTIONS_ORDER_STATUS = ['any', 'open', 'closed', 'cancelled'];

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

export const METAFIELDS_RESOURCE_TYPES = [
  'article',
  'blog',
  'collection',
  'customer',
  'draft_order',
  'order',
  'page',
  'product_image',
  'product',
  'shop',
  'variant',
];

export const PACK_ID = 11612;
export const NOT_FOUND = 'NOT_FOUND';

export const IDENTITY_ARTICLE = 'Article';
export const IDENTITY_BLOG = 'Blog';
export const IDENTITY_COLLECTION = 'Collection';
export const IDENTITY_CUSTOMER = 'Customer';
export const IDENTITY_LOCATION = 'Location';
export const IDENTITY_FILE = 'File';
export const IDENTITY_IMAGE = 'Image';
export const IDENTITY_METAOBJECT = 'Metaobject';
export const IDENTITY_ORDER = 'Order';
export const IDENTITY_ORDER_LINE_ITEM = 'OrderLineItem';
export const IDENTITY_ORDER_TRANSACTION = 'OrderTransaction';
export const IDENTITY_PAGE = 'Page';
export const IDENTITY_INVENTORYITEM = 'InventoryItem';
export const IDENTITY_INVENTORYLEVEL = 'InventoryLevel';
export const IDENTITY_PRODUCT = 'Product';
export const IDENTITY_PRODUCT_VARIANT = 'ProductVariant';
export const IDENTITY_REDIRECT = 'Redirect';

export const COLLECTION_TYPE__SMART = 'smart_collection';
export const COLLECTION_TYPE__CUSTOM = 'custom_collection';

export const REST_DEFAULT_API_VERSION = '2023-10';
export const REST_DEFAULT_LIMIT = 250;

// Don't put this at 1000 (theoretical max) because we can have multiple syncs happening at the same time in different documents
export const GRAPHQL_BUDGET__MAX = 900;
export const GRAPHQL_RETRIES__MAX = 5;
export const GRAPHQL_DEFAULT_API_VERSION = '2023-07';

// TODO: rename these
export const CACHE_DAY = 86400; // 1 day
export const CACHE_YEAR = CACHE_DAY * 365; // 1 year
export const CACHE_TEN_MINUTES = 60 * 10; // 10 minute
export const CACHE_MINUTE = 60; // 1 minute
export const CACHE_SINGLE_FETCH = 10; // 10s

const PACK_PREFIX_KEY = 'lgs_';
export const METAFIELD_PREFIX_KEY = `${PACK_PREFIX_KEY}meta__`;
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
