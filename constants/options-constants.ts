// #region Imports
import * as coda from '@codahq/packs-sdk';
import { countryNames } from '../contants--generated';

// #endregion

type StringOption = coda.SimpleAutocompleteOption<coda.ParameterType.String>;

export const OPTIONS_COMMENTABLE: StringOption[] = [
  { display: 'No', value: 'no' },
  { display: 'Moderate', value: 'moderate' },
  { display: 'Yes', value: 'yes' },
];

/** Noms complets des pays formattés avec leur code associé pour autocompletion */
export const OPTIONS_COUNTRY_NAMES: StringOption[] = Object.entries(countryNames).map(([key, value]) => ({
  display: value,
  value: key,
}));

export const OPTIONS_CONSENT_STATE = {
  subscribed: {
    display: 'Subscribed',
    value: 'subscribed',
  },
  notSubscribed: {
    display: 'Not subscribed',
    value: 'not_subscribed',
  },
  unSubscribed: {
    display: 'Unsubscribed',
    value: 'unsubscribed',
  },
  redacted: {
    display: 'Redacted',
    value: 'redacted',
  },
  invalid: {
    display: 'Invalid',
    value: 'invalid',
  },
  pending: {
    display: 'Pending',
    value: 'pending',
  },
} as const satisfies { [key: string]: StringOption };

export const OPTIONS_CONSENT_OPT_IN_LEVEL = {
  // After providing their information, the customer receives a confirmation and is required to perform a intermediate step before receiving marketing information.
  confirmed: {
    display: 'Confirmed opt-in',
    value: 'confirmed_opt_in',
  },
  // After providing their information, the customer receives marketing information without any intermediate steps.
  single: {
    display: 'Single opt-in',
    value: 'single_opt_in',
  },
  // The customer receives marketing information but how they were opted in is unknown.
  unknown: {
    display: 'Unknown',
    value: 'unknown',
  },
} as const satisfies { [key: string]: StringOption };

export const OPTIONS_DRAFT_ORDER_STATUS: StringOption[] = [
  { display: 'Open', value: 'open' },
  { display: 'Completed', value: 'completed' },
  { display: 'Invoice sent', value: 'invoice_sent' },
];

export const OPTIONS_FILE_TYPE: StringOption[] = [
  { display: 'Generic files', value: 'GENERIC_FILE' },
  { display: 'Images', value: 'IMAGE' },
  { display: 'Videos', value: 'VIDEO' },
];

/**
 The status of the metaobject. Valid values:
  - ACTIVE: The metaobjects is active for public use.
  - DRAFT: The metaobjects is an internal record.
 */
export const OPTIONS_METAOBJECT_STATUS: StringOption[] = [
  { display: 'Active', value: 'ACTIVE' },
  { display: 'Draft', value: 'DRAFT' },
];

/**
 open: Show only open orders.
 closed: Show only closed orders.
 cancelled: Show only canceled orders.
 any: Show orders of any status, including archived
 */
export const OPTIONS_ORDER_STATUS: StringOption[] = [
  { display: 'Any', value: 'any' },
  { display: 'Open', value: 'open' },
  { display: 'Closed', value: 'closed' },
  { display: 'Cancelled', value: 'cancelled' },
];

export const OPTIONS_ORDER_FINANCIAL_STATUS: StringOption[] = [
  { display: 'Any', value: 'any' },
  { display: 'Authorized', value: 'authorized' },
  { display: 'Pending', value: 'pending' },
  { display: 'Paid', value: 'paid' },
  { display: 'Partially paid', value: 'partially_paid' },
  { display: 'Refunded', value: 'refunded' },
  { display: 'Voided', value: 'voided' },
  { display: 'Partially refunded', value: 'partially_refunded' },
  { display: 'Unpaid', value: 'unpaid' },
];

export const OPTIONS_ORDER_FULFILLMENT_STATUS: StringOption[] = [
  { display: 'Any', value: 'any' },
  { display: 'Shipped', value: 'shipped' },
  { display: 'Partial', value: 'partial' },
  { display: 'Unshipped', value: 'unshipped' },
  { display: 'Unfulfilled', value: 'unfulfilled' },
];

/**
 The status of the product. Valid values:
  - ACTIVE: The product is ready to sell and is available to customers on the online store, sales channels, and apps. By default, existing products are set to active.
  - ARCHIVED: The product is no longer being sold and isn't available to customers on sales channels and apps.
  - DRAFT: The product isn't ready to sell and is unavailable to customers on sales channels and apps. By default, duplicated and unarchived products are set to draft.
 */
export const OPTIONS_PRODUCT_STATUS_GRAPHQL: StringOption[] = [
  // { display: 'All', value: '*' },
  { display: 'Active', value: 'ACTIVE' },
  { display: 'Archived', value: 'ARCHIVED' },
  { display: 'Draft', value: 'DRAFT' },
];
export const DEFAULT_PRODUCT_STATUS_GRAPHQL = 'DRAFT';

export const OPTIONS_PUBLISHED_STATUS: StringOption[] = [
  { display: 'Any', value: 'any' },
  { display: 'Published', value: 'published' },
  { display: 'Unpublished', value: 'unpublished' },
];
