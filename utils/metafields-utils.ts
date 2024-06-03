// #region Imports
import { ResultOf } from './tada-utils';

import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { InvalidValueError, UnsupportedValueError } from '../Errors/Errors';
import { SupportedMetafieldOwnerType } from '../Resources/GraphQl/MetafieldGraphQl';
import {
  METAFIELD_LEGACY_TYPES,
  METAFIELD_TYPES,
  MeasurementField,
  MetafieldLegacyType,
  MetafieldType,
  MoneyField,
  RatingField,
} from '../Resources/Mixed/METAFIELD_TYPES';
import { SupportedMetafieldOwnerResource } from '../Resources/Rest/Metafield';
import {
  GraphQlResourceName,
  GraphQlResourceNames,
  RestResourceSingular,
  RestResourcesSingular,
} from '../Resources/types/SupportedResource';
import { DEFAULT_CURRENCY_CODE } from '../config';
import { CUSTOM_FIELD_PREFIX_KEY } from '../constants';
import { metafieldDefinitionFragment } from '../graphql/metafieldDefinitions-graphql';
import { FormatRowReferenceFn } from '../schemas/CodaRows.types';
import { formatCollectionReference } from '../schemas/syncTable/CollectionSchema';
import { formatFileReference } from '../schemas/syncTable/FileSchema';
import { formatMetaobjectReference } from '../schemas/syncTable/MetaObjectSchema';
import { formatPageReference } from '../schemas/syncTable/PageSchema';
import { formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { formatProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';
import { CurrencyCode, MetafieldOwnerType } from '../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from './conversion-utils';
import {
  extractValueAndUnitFromMeasurementString,
  isNullishOrEmpty,
  maybeParseJson,
  splitAndTrimValues,
  unitToShortName,
} from './helpers';

// #endregion

// #region Format For Api
/**
 * Format a Rating cell value for GraphQL Api
 */
function formatRatingField(
  value: number,
  validations: ResultOf<typeof metafieldDefinitionFragment>['validations']
): RatingField {
  if (!validations) {
    throw new Error('Validations are required to format a rating field');
  }
  return {
    scale_min: parseFloat(validations.find((v) => v.name === 'scale_min').value),
    scale_max: parseFloat(validations.find((v) => v.name === 'scale_max').value),
    value: value,
  };
}

/**
 * Format a Rating or list of rating cell values for GraphQL Api
 */
function formatRatingFieldsForApi(
  value: number | number[],
  validations: ResultOf<typeof metafieldDefinitionFragment>['validations']
): string {
  return Array.isArray(value)
    ? JSON.stringify(value.map((v) => formatRatingFieldsForApi(v, validations)))
    : JSON.stringify(formatRatingField(value, validations));
}

/**
 * Format a Money cell value
 */
function formatMoneyField(amount: number, currency_code: CurrencyCode): MoneyField {
  return { amount, currency_code: currency_code ?? DEFAULT_CURRENCY_CODE };
}

/**
 * Format a Money cell value for GraphQL Api
 */
function formatMoneyFieldsForApi(amount: number, currency_code: CurrencyCode): string {
  return JSON.stringify(formatMoneyField(amount, currency_code));
}

/**
 * Format a Measurement cell value
 * @param measurementValue the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementField(measurementValue: string, metafieldType: MetafieldType): MeasurementField {
  const measurementType = metafieldType.replace('list.', '');
  const { value, unitFull } = extractValueAndUnitFromMeasurementString(measurementValue, measurementType);
  return {
    value,
    unit: unitFull,
  };
}

/**
 * Format a Measurement or list of Measurement cell value for GraphQL Api
 * @param measurementValue the string or list of strings entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementFieldsForApi(measurementValue: string | string[], metafieldType: MetafieldType): string {
  return Array.isArray(measurementValue)
    ? JSON.stringify(measurementValue.map((v) => formatMeasurementFieldsForApi(v, metafieldType)))
    : JSON.stringify(formatMeasurementField(measurementValue, metafieldType));
}

/**
 * Format a Reference or list of Reference cell value for GraphQL Api
 * @param value
 * @param graphQlResourceName
 */
function formatReferenceFieldsForApi(
  value: { id: string } | { id: string }[],
  graphQlResourceName?: GraphQlResourceName
) {
  return Array.isArray(value)
    ? JSON.stringify(value.map((v) => formatReferenceFieldsForApi(v, graphQlResourceName)))
    : graphQlResourceName === undefined
    ? value?.id
    : idToGraphQlGid(graphQlResourceName, value?.id);
}

/**
 * This function is the same for a metaobject field and a metafield
 * @param value the Coda column cell value
 * @param type the type of field
 * @param validations possible validations from the field definition
 * @param currencyCode the current Shop currency code
 */
export function formatMetafieldValueForApi(
  value: any,
  type: MetafieldType | MetafieldLegacyType,
  validations?: ResultOf<typeof metafieldDefinitionFragment>['validations'],
  currencyCode?: CurrencyCode
): string | null {
  if (isNullishOrEmpty(value)) {
    return null;
  }

  switch (type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.json_string:
      return value;

    case METAFIELD_TYPES.boolean:
    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.list_single_line_text_field:
    case METAFIELD_TYPES.list_url:
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_number_integer:
    case METAFIELD_TYPES.list_number_decimal:
    case METAFIELD_TYPES.list_date:
    case METAFIELD_TYPES.list_date_time:
      return JSON.stringify(value);

    // NOT SUPPORTED
    case METAFIELD_TYPES.rich_text_field:
      break;

    // RATING
    case METAFIELD_TYPES.rating:
    case METAFIELD_TYPES.list_rating:
      return formatRatingFieldsForApi(value, validations);

    // MONEY
    case METAFIELD_TYPES.money:
      return formatMoneyFieldsForApi(value, currencyCode);

    // REFERENCE
    case METAFIELD_TYPES.page_reference:
    case METAFIELD_TYPES.list_page_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Page);

    case METAFIELD_TYPES.file_reference:
    case METAFIELD_TYPES.list_file_reference:
      return formatReferenceFieldsForApi(value);

    case METAFIELD_TYPES.metaobject_reference:
    case METAFIELD_TYPES.list_metaobject_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Metaobject);

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
      return value;
    case METAFIELD_TYPES.list_mixed_reference:
      // The value could have been converted to a real string by coda
      return JSON.stringify(Array.isArray(value) ? value : splitAndTrimValues(value));

    case METAFIELD_TYPES.collection_reference:
    case METAFIELD_TYPES.list_collection_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Collection);

    case METAFIELD_TYPES.product_reference:
    case METAFIELD_TYPES.list_product_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Product);

    case METAFIELD_TYPES.variant_reference:
    case METAFIELD_TYPES.list_variant_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.ProductVariant);

    // MEASUREMENT
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
    case METAFIELD_TYPES.list_weight:
      return formatMeasurementFieldsForApi(value, type);

    default:
      break;
  }

  throw new UnsupportedValueError('MetafieldType', type);
}
// #endregion

// #region Format for Schema
function formatReferenceFieldsForSchema(
  parsedValue: string | string[],
  formatReference: FormatRowReferenceFn<string | number, any>,
  useRawGid = false
) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((id: string) => formatReferenceFieldsForSchema(id, formatReference, useRawGid))
    : formatReference(useRawGid ? parsedValue : graphQlGidToId(parsedValue));
}

function formatIntegerFieldsForSchema(parsedValue: string | string[]) {
  return Array.isArray(parsedValue) ? parsedValue.map((v) => formatIntegerFieldsForSchema(v)) : parseInt(parsedValue);
}

function formatDecimalFieldsForSchema(parsedValue: string | string[]) {
  return Array.isArray(parsedValue) ? parsedValue.map((v) => formatDecimalFieldsForSchema(v)) : parseFloat(parsedValue);
}

function formatMeasurementFieldsForSchema(
  parsedValue: { value: string; unit: string } | { value: string; unit: string }[]
) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((v) => formatMeasurementFieldsForSchema(v))
    : `${parsedValue.value}${unitToShortName(parsedValue.unit)}`;
}

function formatRatingFieldsForSchema(parsedValue: { value: string } | { value: string }[]) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((v) => formatRatingFieldsForSchema(v))
    : parseFloat(parsedValue.value);
}

function formatMoneyFieldForSchema(parsedValue: { amount: string }) {
  return parseFloat(parsedValue.amount);
}

// TODO: maybe we could return string arrays as a single string with delimiter, like '\n;;;\n' for easier editing inside Coda ?
/**
 * Format a metafield for a Resource schema that includes metafields
 */
export function formatMetaFieldValueForSchema({ value, type }: { value: string; type: string }) {
  const parsedValue = maybeParseJson(value);
  if (typeof parsedValue === 'undefined' || parsedValue === null || parsedValue === '') return;

  switch (type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.boolean:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_TYPES.list_single_line_text_field:
    case METAFIELD_TYPES.list_url:
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_date:
    case METAFIELD_TYPES.list_date_time:
      return parsedValue;

    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.list_number_integer:
      return formatIntegerFieldsForSchema(parsedValue);

    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.list_number_decimal:
      return formatDecimalFieldsForSchema(parsedValue);

    case METAFIELD_TYPES.rich_text_field:
      return convertSchemaToHtml(parsedValue);

    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.json_string:
      return JSON.stringify(parsedValue);

    // RATING
    case METAFIELD_TYPES.rating:
    case METAFIELD_TYPES.list_rating:
      return formatRatingFieldsForSchema(parsedValue);

    // MONEY
    case METAFIELD_TYPES.money:
      return formatMoneyFieldForSchema(parsedValue);

    // REFERENCES
    case METAFIELD_TYPES.collection_reference:
    case METAFIELD_TYPES.list_collection_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatCollectionReference);

    // Files are the only resources that use GraphQL GID
    case METAFIELD_TYPES.file_reference:
    case METAFIELD_TYPES.list_file_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatFileReference, true);

    case METAFIELD_TYPES.metaobject_reference:
    case METAFIELD_TYPES.list_metaobject_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatMetaobjectReference);

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
    case METAFIELD_TYPES.list_mixed_reference:
      return parsedValue;

    case METAFIELD_TYPES.page_reference:
    case METAFIELD_TYPES.list_page_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatPageReference);

    case METAFIELD_TYPES.product_reference:
    case METAFIELD_TYPES.list_product_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatProductReference);

    case METAFIELD_TYPES.variant_reference:
    case METAFIELD_TYPES.list_variant_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatProductVariantReference);

    // MEASUREMENT
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
    case METAFIELD_TYPES.list_weight:
      return formatMeasurementFieldsForSchema(parsedValue);

    default: {
      throw new UnsupportedValueError('MetafieldType', type);
    }
  }
}

// export function normalizeRestMetafieldToGraphQL(
//   metafield: Metafield,
//   metafieldOwnerType: MetafieldOwnerType,
//   metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>>
// ) {
//   const { apiData } = metafield;
//   const matchDefinition = findMatchingMetafieldDefinition(metafield.fullKey, metafieldDefinitions);
//   let obj: ResultOf<typeof metafieldFieldsFragmentWithDefinition>;
//   obj = {
//     __typename: GraphQlResourceName.Metafield,
//     id: idToGraphQlGid(GraphQlResourceName.Metafield, apiData.id),
//     key: apiData.key,
//     namespace: apiData.namespace,
//     type: apiData.type,
//     value: apiData.value as string,
//     createdAt: apiData.created_at,
//     updatedAt: apiData.updated_at,
//     ownerType: metafieldOwnerType,
//     definition: matchDefinition,
//   };

//   return obj;
// }
// #endregion

// #region Metafield key utils
/**
 * This function checks if a given metafield key is the 'full' one or not.
 * When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
 */
function hasMetafieldFullKey(metafield: { namespace: string; key: string }) {
  return metafield.key.indexOf(metafield.namespace) === 0;
}

/**
 * A naive way to check if any of the keys might be a metafield key
 */
function maybeHasMetaFieldKeys(keys: string[]) {
  return keys.some((key) => key.indexOf('.') !== -1);
}

export function getMetaFieldFullKey(m: { namespace: string; key: string }): string {
  if (hasMetafieldFullKey(m)) return m.key as string;
  return `${m.namespace}.${m.key}`;
}

export const splitMetaFieldFullKey = (fullKey: string) => {
  const lastDotIndex = fullKey.lastIndexOf('.');
  if (lastDotIndex === -1) {
    throw new InvalidValueError('Metafield full key', fullKey);
  }

  return {
    metaKey: fullKey.substring(lastDotIndex + 1),
    metaNamespace: fullKey.substring(0, lastDotIndex),
  };
};

/**
 * Prepend a custom prefix to the metafield key
 * This allows us to detect if a coda column key is a metafield column to handle updates
 */
export function preprendPrefixToMetaFieldKey(fullKey: string): string {
  return CUSTOM_FIELD_PREFIX_KEY + fullKey;
}

/**
 * Remove our custom prefix from the metafield key
 */
export function removePrefixFromMetaFieldKey(fromKey: string): string {
  return fromKey.replace(CUSTOM_FIELD_PREFIX_KEY, '');
}

/**
 * Check if the given key is a prefixed metafield key.
 */
export function isPrefixedMetaFieldKey(fromKey: string): boolean {
  return fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY);
}

/**
 * Differentiate between the metafields columns and the standard columns from
 * the effective columns keys that we can get when coda does an update or
 * perform a sync table request.
 */
export function separatePrefixedMetafieldsKeysFromKeys(fromKeys: string[]) {
  const prefixedMetafieldFromKeys = fromKeys.filter((fromKey) => isPrefixedMetaFieldKey(fromKey));
  const standardFromKeys = fromKeys.filter((fromKey) => prefixedMetafieldFromKeys.indexOf(fromKey) === -1);

  return { prefixedMetafieldFromKeys, standardFromKeys };
}
// #endregion

// #region Converters
/**
 * Matches a GraphQl MetafieldOwnerType to the corresponding GraphQL resource name.
 *
 * @param {MetafieldOwnerType} ownerType - the MetafieldOwnerType to match
 * @return {GraphQlResourceName} the corresponding GraphQL resource name
 */
export function matchOwnerTypeToResourceName(ownerType: MetafieldOwnerType): GraphQlResourceName {
  switch (ownerType) {
    case MetafieldOwnerType.Article:
      return GraphQlResourceNames.Article;
    case MetafieldOwnerType.Blog:
      return GraphQlResourceNames.Blog;
    case MetafieldOwnerType.Collection:
      return GraphQlResourceNames.Collection;
    case MetafieldOwnerType.Customer:
      return GraphQlResourceNames.Customer;
    case MetafieldOwnerType.Draftorder:
      return GraphQlResourceNames.DraftOrder;
    case MetafieldOwnerType.Location:
      return GraphQlResourceNames.Location;
    case MetafieldOwnerType.Order:
      return GraphQlResourceNames.Order;
    case MetafieldOwnerType.Page:
      return GraphQlResourceNames.Page;
    case MetafieldOwnerType.Product:
      return GraphQlResourceNames.Product;
    case MetafieldOwnerType.Productvariant:
      return GraphQlResourceNames.ProductVariant;
    case MetafieldOwnerType.Shop:
      return GraphQlResourceNames.Shop;

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

/**
 * Matches a GraphQl MetafieldOwnerType to the corresponding Rest owner resource name.
 *
 * @param {MetafieldOwnerType} ownerType - the MetafieldOwnerType to match
 * @return {GraphQlResourceNames} the corresponding Rest owner resource name
 */
export function matchOwnerTypeToOwnerResource(ownerType: MetafieldOwnerType): SupportedMetafieldOwnerResource {
  switch (ownerType) {
    case MetafieldOwnerType.Article:
      return RestResourcesSingular.Article;
    case MetafieldOwnerType.Blog:
      return RestResourcesSingular.Blog;
    case MetafieldOwnerType.Collection:
      return RestResourcesSingular.Collection;
    case MetafieldOwnerType.Customer:
      return RestResourcesSingular.Customer;
    case MetafieldOwnerType.Draftorder:
      return RestResourcesSingular.DraftOrder;
    case MetafieldOwnerType.Location:
      return RestResourcesSingular.Location;
    case MetafieldOwnerType.Order:
      return RestResourcesSingular.Order;
    case MetafieldOwnerType.Page:
      return RestResourcesSingular.Page;
    case MetafieldOwnerType.Product:
      return RestResourcesSingular.Product;
    case MetafieldOwnerType.Productvariant:
      return RestResourcesSingular.ProductVariant;
    case MetafieldOwnerType.Shop:
      return RestResourcesSingular.Shop;

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

/**
 * Matches a Rest owner resource name to the corresponding GraphQl MetafieldOwnerType.
 *
 * @param {RestResourceSingular} ownerResource - the Rest owner resource name
 * @return {SupportedMetafieldOwnerType} the corresponding GraphQl MetafieldOwnerType
 */
export function matchOwnerResourceToMetafieldOwnerType(
  ownerResource: RestResourceSingular
): SupportedMetafieldOwnerType {
  switch (ownerResource) {
    case RestResourcesSingular.Article:
      return MetafieldOwnerType.Article;
    case RestResourcesSingular.Blog:
      return MetafieldOwnerType.Blog;
    case RestResourcesSingular.Collection:
      return MetafieldOwnerType.Collection;
    case RestResourcesSingular.Customer:
      return MetafieldOwnerType.Customer;
    case RestResourcesSingular.DraftOrder:
      return MetafieldOwnerType.Draftorder;
    case RestResourcesSingular.Location:
      return MetafieldOwnerType.Location;
    case RestResourcesSingular.Order:
      return MetafieldOwnerType.Order;
    case RestResourcesSingular.Page:
      return MetafieldOwnerType.Page;
    case RestResourcesSingular.Product:
      return MetafieldOwnerType.Product;
    case RestResourcesSingular.ProductVariant:
      return MetafieldOwnerType.Productvariant;
    case RestResourcesSingular.Shop:
      return MetafieldOwnerType.Shop;

    default:
      throw new UnsupportedValueError('OwnerResource', ownerResource);
  }
}

// #region Misc
/**
 * Metafields should be deleted if their string value is empty of contains an empty JSON.stringified array
 */
export function shouldDeleteMetafield(string: string) {
  return isNullishOrEmpty(string) || string === '[]';
}

/**
 * Determine if a table cell value derived from a metafield ot metaobject field
 * value should be updated or not.
 * They are updatable if the value is not a reference to another resource
 * (except for mixed_reference and list_mixed_reference, wich use raw text
 * columns), or if is, it should not come from an action using `coda.withIdentity`
 * This is to prevent breaking existing relations when using `coda.withIdentity`.
 *
 * @param fieldType the type of the field definition
 * @param schemaWithIdentity wether the data will be consumed by an action wich result use a `coda.withIdentity` schema.
 * @returns `true` if the value should be updated
 */
export function shouldUpdateSyncTableMetafieldValue(fieldType: string, schemaWithIdentity = false): boolean {
  const isReference = fieldType.indexOf('_reference') !== -1;
  const shouldUpdateReference =
    !schemaWithIdentity ||
    (schemaWithIdentity &&
      [METAFIELD_TYPES.mixed_reference, METAFIELD_TYPES.list_mixed_reference].includes(fieldType as any));

  return !isReference || (isReference && shouldUpdateReference);
}
// #endregion
