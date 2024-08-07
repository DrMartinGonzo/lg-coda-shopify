import { CurrencyCode } from './types/admin.types';

export const REST_DEFAULT_API_VERSION = '2023-10';
export const GRAPHQL_DEFAULT_API_VERSION = '2024-07';

export const GRAPHQL_BUDGET__MAX = 900; // Don't put this at 1000 (theoretical max) because we can have multiple syncs happening at the same time in different documents
export const GRAPHQL_RETRIES__MAX = 5;

/** The default thumbnail size when no size is defined by the user */
export const DEFAULT_THUMBNAIL_SIZE = 64;
/** Default currency code to use when we are unable to fetch the one defined in the current shop */
export const DEFAULT_CURRENCY_CODE = 'USD' as CurrencyCode;
/** The default product variant option value when creating a product */
export const DEFAULT_PRODUCTVARIANT_OPTION_VALUE = 'Coda Default';
