// #region Imports
import { CurrencyCode } from '../../types/admin.types';

// #endregion

export const METAFIELD_TYPES = {
  boolean: 'boolean',
  collection_reference: 'collection_reference',
  color: 'color',
  date_time: 'date_time',
  date: 'date',
  dimension: 'dimension',
  file_reference: 'file_reference',
  json: 'json',
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
  list_collection_reference: 'list.collection_reference',
  list_color: 'list.color',
  list_date: 'list.date',
  list_date_time: 'list.date_time',
  list_dimension: 'list.dimension',
  list_file_reference: 'list.file_reference',
  list_metaobject_reference: 'list.metaobject_reference',
  list_mixed_reference: 'list.mixed_reference',
  list_number_integer: 'list.number_integer',
  list_number_decimal: 'list.number_decimal',
  list_page_reference: 'list.page_reference',
  list_product_reference: 'list.product_reference',
  list_rating: 'list.rating',
  list_single_line_text_field: 'list.single_line_text_field',
  list_url: 'list.url',
  list_variant_reference: 'list.variant_reference',
  list_volume: 'list.volume',
  list_weight: 'list.weight',
} as const;

export const METAFIELD_LEGACY_TYPES = {
  string: 'string',
  integer: 'integer',
  json_string: 'json_string',
} as const;

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

/** All supported modern `metafield.type`s */
export type MetafieldType = (typeof METAFIELD_TYPES)[keyof typeof METAFIELD_TYPES];

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

/** All supported legacy `metafield.type`s */
export type MetafieldLegacyType = (typeof METAFIELD_LEGACY_TYPES)[keyof typeof METAFIELD_LEGACY_TYPES];
