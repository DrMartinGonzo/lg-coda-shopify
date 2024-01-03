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

export const IDENTITY_COLLECTION = 'Collection';
export const IDENTITY_FILE = 'File';
export const IDENTITY_IMAGE = 'Image';
export const IDENTITY_METAOBJECT = 'Metaobject';
export const IDENTITY_PAGE = 'Page';
export const IDENTITY_PRODUCT = 'Product';
export const IDENTITY_PRODUCT_VARIANT = 'ProductVariant';

export const COLLECTION_TYPE__SMART = 'smart_collection';
export const COLLECTION_TYPE__CUSTOM = 'custom_collection';

export const RESOURCE_COLLECTION = 'Collection';
export const RESOURCE_PRODUCT = 'Product';

export const GRAPHQL_BUDGET__MAX = 500;
export const GRAPHQL_RETRIES__MAX = 5;
export const GRAPHQL_DEFAULT_RESTORE_RATE = 50;
