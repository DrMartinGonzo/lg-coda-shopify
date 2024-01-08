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

export const OPTIONS_PUBLISHED_STATUS = ['any', 'published', 'unpublished'];
export const OPTIONS_PRODUCT_STATUS = ['any', 'active', 'archived', 'draft'];

export const OPTIONS_FILE_TYPE = [
  { display: 'Generic files', value: 'GENERIC_FILE' },
  { display: 'Images', value: 'IMAGE' },
  { display: 'Videos', value: 'VIDEO' },
];

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
export const IDENTITY_FILE = 'File';
export const IDENTITY_IMAGE = 'Image';
export const IDENTITY_METAOBJECT = 'Metaobject';
export const IDENTITY_PAGE = 'Page';
export const IDENTITY_PRODUCT = 'Product';
export const IDENTITY_PRODUCT_VARIANT = 'ProductVariant';

export const COLLECTION_TYPE__SMART = 'smart_collection';
export const COLLECTION_TYPE__CUSTOM = 'custom_collection';

export const RESOURCE_ARTICLE = 'OnlineStoreArticle';
export const RESOURCE_BLOG = 'OnlineStoreBlog';
export const RESOURCE_COLLECTION = 'Collection';
export const RESOURCE_CUSTOMER = 'Customer';
export const RESOURCE_ORDER = 'Order';
export const RESOURCE_PAGE = 'OnlineStorePage';
export const RESOURCE_PRODUCT = 'Product';
export const RESOURCE_PRODUCT_VARIANT = 'ProductVariant';

export const REST_DEFAULT_API_VERSION = '2023-10';
export const REST_DEFAULT_LIMIT = 250;

export const GRAPHQL_BUDGET__MAX = 500;
export const GRAPHQL_RETRIES__MAX = 5;
export const GRAPHQL_DEFAULT_RESTORE_RATE = 50;
export const GRAPHQL_DEFAULT_API_VERSION = '2023-04';

// TODO: rename these
export const CACHE_DAY = 86400; // 1 day
export const CACHE_MINUTE = 60; // 1 minute
export const CACHE_SINGLE_FETCH = 10; // 10s

export const FIELD_TYPES = {
  single_line_text_field: 'single_line_text_field',
  multi_line_text_field: 'multi_line_text_field',
  rich_text_field: 'rich_text_field',
  number_integer: 'number_integer',
  number_decimal: 'number_decimal',
  date: 'date',
  date_time: 'date_time',
  boolean: 'boolean',
  url: 'url',
  color: 'color',
  weight: 'weight',
  dimension: 'dimension',
  volume: 'volume',
  rating: 'rating',
  money: 'money',
  json: 'json',
  mixed_reference: 'mixed_reference',
  collection_reference: 'collection_reference',
  page_reference: 'page_reference',
  file_reference: 'file_reference',
  metaobject_reference: 'metaobject_reference',
  product_reference: 'product_reference',
  variant_reference: 'variant_reference',

  // ++ list variants
  // list.collection_reference,
  // list.color,
  // list.date,
  // list.date_time,
  // list.dimension,
  // list.file_reference,
  // list.metaobject_reference,
  // list.mixed_reference,
  // list.number_integer,
  // list.number_decimal,
  // list.page_reference,
  // list.product_reference,
  // list.rating,
  // list.single_line_text_field,
  // list.url,
  // list.variant_reference,
  // list.volume,
  // list.weight'
};
