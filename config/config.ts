import { CurrencyCode } from '../types/admin.types';

export const REST_DEFAULT_API_VERSION = '2023-10';
export const GRAPHQL_DEFAULT_API_VERSION = '2023-10'; // Don't put this at 1000 (theoretical max) because we can have multiple syncs happening at the same time in different documents

export const GRAPHQL_BUDGET__MAX = 900;
export const GRAPHQL_RETRIES__MAX = 5;

export const DEFAULT_CURRENCY_CODE = 'USD' as CurrencyCode;
