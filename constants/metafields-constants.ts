// #region Imports
import { CurrencyCode } from '../types/admin.types';

// #endregion

export const METAFIELD_LIST_PREFIX = 'list.';

export const METAFIELD_TYPES = {
  boolean: 'boolean',
  collection_reference: 'collection_reference',
  color: 'color',
  date_time: 'date_time',
  date: 'date',
  dimension: 'dimension',
  file_reference: 'file_reference',
  json: 'json',
  link: 'link',
  metaobject_reference: 'metaobject_reference',
  mixed_reference: 'mixed_reference',
  money: 'money',
  multi_line_text_field: 'multi_line_text_field',
  number_decimal: 'number_decimal',
  number_integer: 'number_integer',
  page_reference: 'page_reference',
  product_reference: 'product_reference',
  rating: 'rating',
  rich_text_field: 'rich_text_field',
  single_line_text_field: 'single_line_text_field',
  url: 'url',
  variant_reference: 'variant_reference',
  volume: 'volume',
  weight: 'weight',

  // ++ list variants
  list_collection_reference: `${METAFIELD_LIST_PREFIX}collection_reference`,
  list_color: `${METAFIELD_LIST_PREFIX}color`,
  list_date: `${METAFIELD_LIST_PREFIX}date`,
  list_date_time: `${METAFIELD_LIST_PREFIX}date_time`,
  list_dimension: `${METAFIELD_LIST_PREFIX}dimension`,
  list_file_reference: `${METAFIELD_LIST_PREFIX}file_reference`,
  list_metaobject_reference: `${METAFIELD_LIST_PREFIX}metaobject_reference`,
  list_link: `${METAFIELD_LIST_PREFIX}link`,
  list_mixed_reference: `${METAFIELD_LIST_PREFIX}mixed_reference`,
  list_number_integer: `${METAFIELD_LIST_PREFIX}number_integer`,
  list_number_decimal: `${METAFIELD_LIST_PREFIX}number_decimal`,
  list_page_reference: `${METAFIELD_LIST_PREFIX}page_reference`,
  list_product_reference: `${METAFIELD_LIST_PREFIX}product_reference`,
  list_rating: `${METAFIELD_LIST_PREFIX}rating`,
  list_single_line_text_field: `${METAFIELD_LIST_PREFIX}single_line_text_field`,
  list_url: `${METAFIELD_LIST_PREFIX}url`,
  list_variant_reference: `${METAFIELD_LIST_PREFIX}variant_reference`,
  list_volume: `${METAFIELD_LIST_PREFIX}volume`,
  list_weight: `${METAFIELD_LIST_PREFIX}weight`,
} as const;

export const METAFIELD_LEGACY_TYPES = {
  string: 'string',
  integer: 'integer',
  json_string: 'json_string',
} as const;

/** All supported modern `metafield.type`s */
export type MetafieldType = (typeof METAFIELD_TYPES)[keyof typeof METAFIELD_TYPES];

/** All supported legacy `metafield.type`s */
export type MetafieldLegacyType = (typeof METAFIELD_LEGACY_TYPES)[keyof typeof METAFIELD_LEGACY_TYPES];

export type MetafieldRatingType = (typeof METAFIELD_TYPES)['rating'];
export type MetafieldListRatingType = (typeof METAFIELD_TYPES)['list_rating'];

export type MetafieldLinkType = (typeof METAFIELD_TYPES)['link'];
export type MetafieldListLinkType = (typeof METAFIELD_TYPES)['list_link'];

export type MetafieldMeasurementType =
  | (typeof METAFIELD_TYPES)['dimension']
  | (typeof METAFIELD_TYPES)['volume']
  | (typeof METAFIELD_TYPES)['weight'];
export type MetafieldListMeasurementType =
  | (typeof METAFIELD_TYPES)['list_dimension']
  | (typeof METAFIELD_TYPES)['list_volume']
  | (typeof METAFIELD_TYPES)['list_weight'];

export type MetafieldReferenceType =
  | (typeof METAFIELD_TYPES)['collection_reference']
  | (typeof METAFIELD_TYPES)['metaobject_reference']
  | (typeof METAFIELD_TYPES)['mixed_reference']
  | (typeof METAFIELD_TYPES)['page_reference']
  | (typeof METAFIELD_TYPES)['product_reference']
  | (typeof METAFIELD_TYPES)['variant_reference'];

type MetafieldListReferenceType =
  | (typeof METAFIELD_TYPES)['list_collection_reference']
  | (typeof METAFIELD_TYPES)['list_metaobject_reference']
  | (typeof METAFIELD_TYPES)['list_mixed_reference']
  | (typeof METAFIELD_TYPES)['list_page_reference']
  | (typeof METAFIELD_TYPES)['list_product_reference']
  | (typeof METAFIELD_TYPES)['list_variant_reference'];

export type LinkField = { url: string; text?: string };

export interface MoneyField {
  currency_code: CurrencyCode;
  amount: number;
}

export interface RatingField {
  scale_min: number;
  scale_max: number;
  value: number;
}

export interface MeasurementField {
  unit: string;
  value: number;
}
