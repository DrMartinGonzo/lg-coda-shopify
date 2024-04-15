// #region Imports
import { ResultOf } from './tada-utils';

import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { InvalidValueError, UnsupportedValueError } from '../Errors';
import { ResourceName } from '../Resources/Abstract/Rest/AbstractRestResource';
import { SupportedMetafieldOwnerType } from '../Resources/GraphQl/MetafieldGraphQl';
import {
  AllMetafieldTypeValue,
  Fields,
  METAFIELD_LEGACY_TYPES,
  METAFIELD_TYPES,
  METAFIELD_TYPES_RAW_REFERENCE,
  MetafieldTypeValue,
} from '../Resources/Mixed/Metafield.types';
import { SupportedMetafieldOwnerResource } from '../Resources/Rest/Metafield';
import { GraphQlResourceName } from '../Resources/types/GraphQlResource.types';
import { DEFAULT_CURRENCY_CODE } from '../config';
import { CUSTOM_FIELD_PREFIX_KEY } from '../constants';
import { metafieldDefinitionFragment } from '../graphql/metafieldDefinitions-graphql';
import { formatCollectionReference } from '../schemas/syncTable/CollectionSchema';
import { formatFileReference } from '../schemas/syncTable/FileSchema';
import { formatMetaobjectReference } from '../schemas/syncTable/MetaObjectSchema';
import { formatPageReference } from '../schemas/syncTable/PageSchema';
import { formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { formatProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';
import { CurrencyCode, MetafieldOwnerType } from '../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from './conversion-utils';
import { extractValueAndUnitFromMeasurementString, isNullishOrEmpty, maybeParseJson, unitToShortName } from './helpers';

// #endregion

// #region Format For Api
/**
 * Format a Rating cell value for GraphQL Api
 */
function formatRatingFieldForApi(
  value: number,
  validations: ResultOf<typeof metafieldDefinitionFragment>['validations']
): Fields.Rating {
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
 * Format a Money cell value for GraphQL Api
 */
function formatMoneyFieldForApi(amount: number, currency_code: CurrencyCode): Fields.Money {
  return { amount, currency_code: currency_code ?? DEFAULT_CURRENCY_CODE };
}
/**
 * Format a Measurement cell value for GraphQL Api
 * @param measurementString the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementFieldForApi(
  measurementString: string,
  metafieldType: MetafieldTypeValue
): Fields.Measurement {
  const measurementType = metafieldType.replace('list.', '');
  const { value, unit, unitFull } = extractValueAndUnitFromMeasurementString(measurementString, measurementType);
  return {
    value,
    unit: unitFull,
  };
}

/**
 * This function is the same for a metaobject field and a metafield
 * @param value the Coda column cell value
 * @param type the type of field
 * @param validations possible validations from the field definition
 * @param codaSchema
 */
export function formatMetafieldValueForApi(
  value: any,
  type: AllMetafieldTypeValue,
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
      return JSON.stringify(formatRatingFieldForApi(value, validations));
    case METAFIELD_TYPES.list_rating:
      return JSON.stringify(value.map((v) => formatRatingFieldForApi(v, validations)));

    // MONEY
    case METAFIELD_TYPES.money:
      return JSON.stringify(formatMoneyFieldForApi(value, currencyCode));

    // REFERENCE
    case METAFIELD_TYPES.page_reference:
      return idToGraphQlGid(GraphQlResourceName.OnlineStorePage, value?.id);
    case METAFIELD_TYPES.list_page_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.OnlineStorePage, v?.id)));

    case METAFIELD_TYPES.file_reference:
      return value?.id;
    case METAFIELD_TYPES.list_file_reference:
      return JSON.stringify(value.map((v) => v?.id));

    case METAFIELD_TYPES.metaobject_reference:
      return idToGraphQlGid(GraphQlResourceName.Metaobject, value?.id);
    case METAFIELD_TYPES.list_metaobject_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.Metaobject, v?.id)));

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
      return value;
    case METAFIELD_TYPES.list_mixed_reference:
      // The value could have been converted to a real string by coda
      return JSON.stringify(Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim()));

    case METAFIELD_TYPES.collection_reference:
      return idToGraphQlGid(GraphQlResourceName.Collection, value?.id);
    case METAFIELD_TYPES.list_collection_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.Collection, v?.id)));

    case METAFIELD_TYPES.product_reference:
      return idToGraphQlGid(GraphQlResourceName.Product, value?.id);
    case METAFIELD_TYPES.list_product_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.Product, v?.id)));

    case METAFIELD_TYPES.variant_reference:
      return idToGraphQlGid(GraphQlResourceName.ProductVariant, value?.id);
    case METAFIELD_TYPES.list_variant_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.ProductVariant, v?.id)));

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return JSON.stringify(formatMeasurementFieldForApi(value, type));
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return JSON.stringify(value.map((v) => JSON.stringify(formatMeasurementFieldForApi(v, type))));

    default:
      break;
  }

  throw new UnsupportedValueError('MetafieldType', type);
}
// #endregion

// #region Format for Schema
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

    case METAFIELD_TYPES.number_integer:
    case METAFIELD_LEGACY_TYPES.integer:
      return parseInt(parsedValue);

    case METAFIELD_TYPES.number_decimal:
      return parseFloat(parsedValue);

    case METAFIELD_TYPES.list_number_integer:
      return parsedValue.map((v) => parseInt(v));

    case METAFIELD_TYPES.list_number_decimal:
      return parsedValue.map((v) => parseFloat(v));

    case METAFIELD_TYPES.rich_text_field:
      return convertSchemaToHtml(parsedValue);

    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.json_string:
      return JSON.stringify(parsedValue);

    // RATING
    case METAFIELD_TYPES.rating:
      return parsedValue.value;
    case METAFIELD_TYPES.list_rating:
      return parsedValue.map((v) => v.value);

    // MONEY
    case METAFIELD_TYPES.money:
      return parseFloat(parsedValue.amount);

    // REFERENCES
    case METAFIELD_TYPES.collection_reference:
      return formatCollectionReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_collection_reference:
      return parsedValue.map((v) => formatCollectionReference(graphQlGidToId(v)));

    case METAFIELD_TYPES.file_reference:
      return formatFileReference(parsedValue);
    case METAFIELD_TYPES.list_file_reference:
      return parsedValue.map(formatFileReference);

    case METAFIELD_TYPES.metaobject_reference:
      return formatMetaobjectReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_metaobject_reference:
      return parsedValue.map((v) => formatMetaobjectReference(graphQlGidToId(v)));

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
    case METAFIELD_TYPES.list_mixed_reference:
      return parsedValue;

    case METAFIELD_TYPES.page_reference:
      return formatPageReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_page_reference:
      return parsedValue.map((v) => formatPageReference(graphQlGidToId(v)));

    case METAFIELD_TYPES.product_reference:
      return formatProductReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_product_reference:
      return parsedValue.map((v) => formatProductReference(graphQlGidToId(v)));

    case METAFIELD_TYPES.variant_reference:
      return formatProductVariantReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_variant_reference:
      return parsedValue.map((v) => formatProductVariantReference(graphQlGidToId(v)));

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return `${parsedValue.value}${unitToShortName(parsedValue.unit)}`;
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return parsedValue.map((v) => `${v.value}${unitToShortName(v.unit)}`);

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
const hasMetafieldFullKey = (metafield: { namespace: string; key: string }) =>
  metafield.key.indexOf(metafield.namespace) === 0;

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
export function preprendPrefixToMetaFieldKey(fullKey: string) {
  return CUSTOM_FIELD_PREFIX_KEY + fullKey;
}

/**
 * Remove our custom prefix from the metafield key
 */
export function removePrefixFromMetaFieldKey(fromKey: string) {
  return fromKey.replace(CUSTOM_FIELD_PREFIX_KEY, '');
}

/**
 * Differentiate between the metafields columns and the standard columns from
 * the effective columns keys that we can get when coda does an update or
 * perform a sync table request.
 */
export function separatePrefixedMetafieldsKeysFromKeys(fromKeys: string[]) {
  const prefixedMetafieldFromKeys = fromKeys.filter((fromKey) => fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY));
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
      return GraphQlResourceName.OnlineStoreArticle;
    case MetafieldOwnerType.Blog:
      return GraphQlResourceName.OnlineStoreBlog;
    case MetafieldOwnerType.Collection:
      return GraphQlResourceName.Collection;
    case MetafieldOwnerType.Customer:
      return GraphQlResourceName.Customer;
    case MetafieldOwnerType.Draftorder:
      return GraphQlResourceName.DraftOrder;
    case MetafieldOwnerType.Location:
      return GraphQlResourceName.Location;
    case MetafieldOwnerType.Order:
      return GraphQlResourceName.Order;
    case MetafieldOwnerType.Page:
      return GraphQlResourceName.OnlineStorePage;
    case MetafieldOwnerType.Product:
      return GraphQlResourceName.Product;
    case MetafieldOwnerType.Productvariant:
      return GraphQlResourceName.ProductVariant;
    case MetafieldOwnerType.Shop:
      return GraphQlResourceName.Shop;

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

/**
 * Matches a GraphQl MetafieldOwnerType to the corresponding Rest owner resource name.
 *
 * @param {MetafieldOwnerType} ownerType - the MetafieldOwnerType to match
 * @return {GraphQlResourceName} the corresponding Rest owner resource name
 */
export function matchOwnerTypeToOwnerResource(ownerType: MetafieldOwnerType): SupportedMetafieldOwnerResource {
  switch (ownerType) {
    case MetafieldOwnerType.Article:
      return 'article';
    case MetafieldOwnerType.Blog:
      return 'blog';
    case MetafieldOwnerType.Collection:
      return 'collection';
    case MetafieldOwnerType.Customer:
      return 'customer';
    case MetafieldOwnerType.Draftorder:
      return 'draft_order';
    case MetafieldOwnerType.Location:
      return 'location';
    case MetafieldOwnerType.Order:
      return 'order';
    case MetafieldOwnerType.Page:
      return 'page';
    case MetafieldOwnerType.Product:
      return 'product';
    case MetafieldOwnerType.Productvariant:
      return 'variant';
    case MetafieldOwnerType.Shop:
      return 'shop';

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

/**
 * Matches a Rest owner resource name to the corresponding GraphQl MetafieldOwnerType.
 *
 * @param {ResourceName} ownerResource - the Rest owner resource name
 * @return {SupportedMetafieldOwnerType} the corresponding GraphQl MetafieldOwnerType
 */
export function matchOwnerResourceToMetafieldOwnerType(ownerResource: ResourceName): SupportedMetafieldOwnerType {
  switch (ownerResource) {
    case 'article':
      return MetafieldOwnerType.Article;
    case 'blog':
      return MetafieldOwnerType.Blog;
    case 'collection':
      return MetafieldOwnerType.Collection;
    case 'customer':
      return MetafieldOwnerType.Customer;
    case 'draft_order':
      return MetafieldOwnerType.Draftorder;
    case 'location':
      return MetafieldOwnerType.Location;
    case 'order':
      return MetafieldOwnerType.Order;
    case 'page':
      return MetafieldOwnerType.Page;
    case 'product':
      return MetafieldOwnerType.Product;
    case 'variant':
      return MetafieldOwnerType.Productvariant;
    case 'shop':
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
 * (except for references in METAFIELD_TYPES_RAW_REFERENCE, wich uses raw text
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
    !schemaWithIdentity || (schemaWithIdentity && METAFIELD_TYPES_RAW_REFERENCE.includes(fieldType as any));

  return !isReference || (isReference && shouldUpdateReference);
}
// #endregion
