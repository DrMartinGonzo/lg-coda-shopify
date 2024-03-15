// #region Imports
import * as coda from '@codahq/packs-sdk';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import { CACHE_DEFAULT, CACHE_DISABLED, GRAPHQL_NODES_LIMIT, REST_DEFAULT_API_VERSION } from '../constants';
import { METAFIELD_TYPES, METAFIELD_LEGACY_TYPES } from './metafields-constants';
import { extractValueAndUnitFromMeasurementString, isNullOrEmpty, maybeParseJson, unitToShortName } from '../helpers';
import {
  cleanQueryParams,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makeSyncTableGetRequest,
} from '../helpers-rest';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  graphQlGidToResourceName,
  idToGraphQlGid,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import {
  getMetaFieldFullKey,
  getResourceMetafieldsAdminUrl,
  getResourceMetafieldsRestApiUrl,
  preprendPrefixToMetaFieldKey,
  removePrefixFromMetaFieldKey,
  shouldUpdateSyncTableMetafieldValue,
  splitMetaFieldFullKey,
} from './metafields-helpers';

import { formatCollectionReference } from '../schemas/syncTable/CollectionSchema';
import { formatFileReference } from '../schemas/syncTable/FileSchema';
import { formatArticleReference } from '../schemas/syncTable/ArticleSchema';
import { formatBlogReference } from '../schemas/syncTable/BlogSchema';
import { formatCustomerReference } from '../schemas/syncTable/CustomerSchema';
import { formatLocationReference } from '../schemas/syncTable/LocationSchema';
import { formatMetafieldDefinitionReference } from '../schemas/syncTable/MetafieldDefinitionSchema';
import { formatMetaobjectReference } from '../schemas/syncTable/MetaObjectSchema';
import { formatOrderReference } from '../schemas/syncTable/OrderSchema';
import { formatPageReference } from '../schemas/syncTable/PageSchema';
import { formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { formatProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';

import {
  MutationSetMetafields,
  queryShopMetafieldsByKeys,
  makeQueryResourceMetafieldsByKeys,
  makeQuerySingleMetafield,
  querySingleNodeMetafieldsByKey,
} from './metafields-graphql';
import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../schemas/syncTable/MetafieldSchema';
import { GraphQlResourceName } from '../typesNew/ShopifyGraphQlResourceTypes';
import {
  fetchMetafieldDefinitionsGraphQl,
  findMatchingMetafieldDefinition,
  requireMatchingMetafieldDefinition,
} from '../metafieldDefinitions/metafieldDefinitions-functions';
import { ShopRestFetcher } from '../shop/shop-functions';
import { getResourceDefinitionByGraphQlName, requireResourceDefinitionWithMetaFieldOwnerType } from '../allResources';

import type { RestResources } from '../typesNew/ShopifyRestResourceTypes';
import type { Metafield as MetafieldType, MetafieldFragmentWithDefinition } from '../typesNew/Resources/Metafield';
import { CurrencyCode, MetafieldsSetInput, MetafieldOwnerType } from '../typesNew/generated/admin.types';
import type {
  GetShopMetafieldsByKeyQuery,
  GetShopMetafieldsByKeyQueryVariables,
  GetSingleMetafieldQuery,
  GetSingleMetafieldQueryVariables,
  MetafieldDefinitionFragment,
  MetafieldFieldsFragment,
  SetMetafieldsMutation,
  SetMetafieldsMutationVariables,
  GetSingleNodeMetafieldsByKeyQuery,
  GetSingleNodeMetafieldsByKeyQueryVariables,
} from '../typesNew/generated/admin.generated';
import type { CodaMetafieldKeyValueSet, CodaMetafieldListValue, CodaMetafieldValue } from '../helpers-setup';
import type { AllMetafieldTypeValue, MetafieldTypeValue } from './metafields-constants';
import type { FetchRequestOptions } from '../typesNew/Fetcher';
import type { SyncTableGraphQlContinuation, SyncTableRestContinuation } from '../types/SyncTable';
import type {
  ResourceTypeUnion,
  ResourceTypeGraphQlUnion,
  HasMetafieldSyncTableResourceTypeUnion,
} from '../typesNew/allResources';

// #endregion

// #region Parsing
export function parseMetafieldsCodaInput(metafields: string[]): CodaMetafieldKeyValueSet[] {
  return metafields && metafields.length ? metafields.map((m) => parseAndValidateFormatMetafieldFormulaOutput(m)) : [];
}

/**
 * Parse and validate one of the `Meta{…}` formulas.
 */
export function parseAndValidateMetaValueFormulaOutput(value: string) {
  const defaultErrorMessage = 'Invalid value. You must use one of the `Meta{…}` helper formulas or a blank value.';
  let parsedValue: CodaMetafieldValue | CodaMetafieldListValue;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  if (!parsedValue.type) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  return parsedValue;
}

/**
 * Parse and validate `FormatMetafield` and `FormatListMetafield` formulas.
 */
export function parseAndValidateFormatMetafieldFormulaOutput(value: string): CodaMetafieldKeyValueSet {
  const defaultErrorMessage = 'Invalid value. You must use `FormatMetafield` or `FormatListMetafield` formula.';
  let parsedValue: CodaMetafieldKeyValueSet;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  if (!parsedValue.key || (parsedValue.value !== null && !parsedValue.type)) {
    throw new coda.UserVisibleError(defaultErrorMessage);
  }
  return parsedValue;
}
// #endregion

// #region Autocomplete functions
function makeAutocompleteMetafieldKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
      { ownerType, includeFakeExtraDefinitions: true },
      context
    );
    const keys = metafieldDefinitions.map(getMetaFieldFullKey);
    return coda.simpleAutocomplete(search, keys);
  };
}

export async function autoCompleteMetafieldWithDefinitionFullKeys(
  context: coda.ExecutionContext,
  search: string,
  formulaContext: coda.MetadataContext
) {
  // can be the dynamic url of a metafields sync table or formulaContext.ownerType
  const metafieldOwnerType = (context.sync?.dynamicUrl as MetafieldOwnerType) || formulaContext.ownerType;
  if (metafieldOwnerType === undefined) {
    return [];
  }
  return makeAutocompleteMetafieldKeysWithDefinitions(metafieldOwnerType)(context, search, {});
}
// #endregion

// #region Format for Schema
// TODO: maybe we could return string arrays as a single string with delimiter, like '\n;;;\n' for easier editing inside Coda ?
/**
 * Format a metafield for a Resource schema that includes metafields
 */
export function formatMetaFieldValueForSchema(
  metafield: MetafieldFieldsFragment | RestResources['Metafield'] | { value: string; type: string }
) {
  const parsedValue = maybeParseJson(metafield?.value);
  if (typeof parsedValue === 'undefined' || parsedValue === null || parsedValue === '') return;

  switch (metafield.type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.boolean:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_TYPES.list_single_line_text_field:
    case METAFIELD_TYPES.list_url:
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_number_integer:
    case METAFIELD_TYPES.list_number_decimal:
    case METAFIELD_TYPES.list_date:
    case METAFIELD_TYPES.list_date_time:
      return parsedValue;

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
      return parsedValue.amount;

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
      const typeNotFoundError = `The 'metafield.type' you passed in is not supported. Your type: "${metafield.type}".`;
      throw new Error(typeNotFoundError);
    }
  }
}

export function normalizeRestMetafieldResponseToGraphQLResponse(
  metafield: RestResources['Metafield'],
  metafieldOwnerType: MetafieldOwnerType,
  metafieldDefinitions: MetafieldDefinitionFragment[]
) {
  const fullKey = getMetaFieldFullKey(metafield);
  const matchDefinition = findMatchingMetafieldDefinition(fullKey, metafieldDefinitions);
  let obj: MetafieldFragmentWithDefinition;
  obj = {
    __typename: GraphQlResourceName.Metafield,
    id: idToGraphQlGid(GraphQlResourceName.Metafield, metafield.id),
    key: metafield.key,
    namespace: metafield.namespace,
    type: metafield.type,
    value: metafield.value as string,
    createdAt: metafield.created_at,
    updatedAt: metafield.updated_at,
    ownerType: metafieldOwnerType,
    definition: matchDefinition,
  };

  return obj;
}

/**
 * Format a metafield for Metafield Sync Table Schema
 */
export function formatMetafieldForSchemaFromGraphQlApi(
  metafieldNode: MetafieldFragmentWithDefinition,
  ownerNodeGid: string,
  parentOwnerNodeGid: string | undefined,
  ownerResource: HasMetafieldSyncTableResourceTypeUnion,
  context: coda.ExecutionContext,
  includeHelperColumns = true
) {
  const fullKey = getMetaFieldFullKey(metafieldNode);
  const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
  const ownerId = graphQlGidToId(ownerNodeGid);
  const hasMetafieldDefinition = !!metafieldNode.definition;

  let obj: coda.SchemaType<typeof MetafieldSyncTableSchema> = {
    admin_graphql_api_id: metafieldNode.id,
    id: graphQlGidToId(metafieldNode.id),
    key: metaKey,
    namespace: metaNamespace,
    label: fullKey,
    owner_id: ownerId,
    owner_type: ownerResource.metafieldOwnerType,
    rawValue: metafieldNode.value,
    type: metafieldNode.type,
    created_at: metafieldNode.createdAt,
    updated_at: metafieldNode.updatedAt,
  };

  if (metafieldNode?.definition?.id) {
    const definitionId = graphQlGidToId(metafieldNode.definition.id);
    obj.definition_id = definitionId;
    obj.definition = formatMetafieldDefinitionReference(definitionId);
  }
  /**
   * We don't set it at once because parentOwnerId can be necessary but
   * undefined when formatting from a two way sync update (ex: ProductVariants).
   * Since this value is static, we return nothing to prevent erasing the
   * previous value. We could also retrieve the owner ID value directly in the
   * graphQl mutation result but doing it this way reduce the GraphQL query costs.
   */
  const maybeAdminUrl = getResourceMetafieldsAdminUrl(
    context,
    ownerResource,
    hasMetafieldDefinition,
    ownerId,
    parentOwnerNodeGid ? graphQlGidToId(parentOwnerNodeGid) : undefined
  );
  if (maybeAdminUrl) {
    obj.admin_url = maybeAdminUrl;
  }

  switch (ownerResource.graphQl.name) {
    case GraphQlResourceName.OnlineStoreArticle:
      obj.owner = formatArticleReference(ownerId);
      break;
    case GraphQlResourceName.OnlineStoreBlog:
      obj.owner = formatBlogReference(ownerId);
      break;
    case GraphQlResourceName.Collection:
      obj.owner = formatCollectionReference(ownerId);
      break;
    case GraphQlResourceName.Customer:
      obj.owner = formatCustomerReference(ownerId);
      break;
    case GraphQlResourceName.Location:
      obj.owner = formatLocationReference(ownerId);
      break;
    case GraphQlResourceName.Order:
      obj.owner = formatOrderReference(ownerId);
      break;
    case GraphQlResourceName.OnlineStorePage:
      obj.owner = formatPageReference(ownerId);
      break;
    case GraphQlResourceName.Product:
      obj.owner = formatProductReference(ownerId);
      break;
    case GraphQlResourceName.ProductVariant:
      obj.owner = formatProductVariantReference(ownerId);
      break;
  }

  if (includeHelperColumns) {
    const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === metafieldNode.type);
    if (helperColumn) {
      obj[helperColumn.key] = formatMetaFieldValueForSchema(metafieldNode);
    }
  }

  return obj;
}
// #endregion

// #region Format for API
/**
 * Permet de normaliser les metafields d'une two-way sync update de Coda en une
 * liste de CodaMetafieldKeyValueSet
 */
export async function getMetafieldKeyValueSetsFromUpdate(
  prefixedMetafieldFromKeys: string[],
  updateNewValue: any,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const promises = prefixedMetafieldFromKeys.map(async (fromKey) => {
    const value = updateNewValue[fromKey] as any;
    const realFromKey = removePrefixFromMetaFieldKey(fromKey);
    const metafieldDefinition = requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
    let formattedValue: string | null;
    try {
      formattedValue = await formatMetafieldValueForApi(
        value,
        metafieldDefinition.type.name as AllMetafieldTypeValue,
        context,
        metafieldDefinition.validations
      );
    } catch (error) {
      throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
    }

    return {
      key: realFromKey,
      value: formattedValue,
      type: metafieldDefinition.type.name as MetafieldTypeValue,
    } as CodaMetafieldKeyValueSet;
  });

  return Promise.all(promises);
}

/**
 * Format a coda Array parameter of type inputs.general.metafields
 * to an array of MetafieldRestInput
 */
/*
export function metafieldsCodaInputToMetafieldRestInputs(metafields: string[]): MetafieldType.Params.RestInput[] {
  const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
  return metafieldKeyValueSets.length
    ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
    : [];
}
*/

/**
 * Formate un objet MetafieldRestInput pour Rest Admin API
 * depuis un paramètre Coda utilisant une formule `MetafieldKeyValueSet(…)`
 */
export function formatMetafieldRestInputFromKeyValueSet(metafieldKeyValueSet: CodaMetafieldKeyValueSet) {
  const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
  if (metafieldKeyValueSet.value !== null) {
    return {
      namespace: metaNamespace,
      key: metaKey,
      value:
        typeof metafieldKeyValueSet.value === 'string'
          ? metafieldKeyValueSet.value
          : JSON.stringify(metafieldKeyValueSet.value),
      type: metafieldKeyValueSet.type,
    } as MetafieldType.Params.RestInput;
  }
}

/**
 * Formate un objet MetafieldRestInput pour GraphQL Admin API
 * depuis un paramètre Coda utilisant une formule `MetafieldKeyValueSet(…)`
 */
function formatMetafieldGraphQlInputFromMetafieldKeyValueSet(
  ownerGid: string,
  metafieldKeyValueSet: CodaMetafieldKeyValueSet
) {
  const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
  if (metafieldKeyValueSet.value !== null) {
    return {
      ownerId: ownerGid,
      key: metaKey,
      namespace: metaNamespace,
      type: metafieldKeyValueSet.type,
      value:
        typeof metafieldKeyValueSet.value === 'string'
          ? metafieldKeyValueSet.value
          : JSON.stringify(metafieldKeyValueSet.value),
    } as MetafieldsSetInput;
  }
}

/**
 * Format a Rating cell value for GraphQL Api
 */
function formatRatingFieldForApi(
  value: number,
  validations: MetafieldDefinitionFragment['validations']
): MetafieldType.Fields.Rating {
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
 * ! Cette fonction fait chier, globalement c'est elle qui oblige à passer le paramètre `context` de fonctions en fonctions.
   // TODO: voir si on peut améliorer ça
 */
export async function formatMoneyFieldForApi(
  amount: number,
  context: coda.ExecutionContext,
  currencyCode?: CurrencyCode
): Promise<MetafieldType.Fields.Money> {
  return {
    amount,
    currency_code: currencyCode ?? (await new ShopRestFetcher(context).getActiveCurrency()),
  };
}
/**
 * Format a Measurement cell value for GraphQL Api
 * @param measurementString the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementFieldForApi(
  measurementString: string,
  metafieldType: MetafieldTypeValue
): MetafieldType.Fields.Measurement {
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
export async function formatMetafieldValueForApi(
  value: any,
  type: AllMetafieldTypeValue,
  context: coda.ExecutionContext,
  validations?: MetafieldDefinitionFragment['validations']
): Promise<string | null> {
  if (isNullOrEmpty(value)) {
    return null;
  }

  switch (type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.boolean:
    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_LEGACY_TYPES.json_string:
      return value;

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
      return JSON.stringify(await formatMoneyFieldForApi(value, context));

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

  throw new Error(`Unknown metafield type: ${type}`);
}

// #endregion

// #region Rest requests
export const fetchMetafieldsRest = async (
  ownerId: number,
  ownerResource: ResourceTypeUnion,
  filters: {
    /** Show metafields with given namespace */
    namespace?: string;
    /** Show metafields with given key */
    key?: string;
  } = {},
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ metafields: RestResources['Metafield'][] }>> => {
  const params: {
    namespace?: string;
    key?: string;
  } = {};
  if (filters.namespace) {
    params.namespace = filters.namespace;
  }
  if (filters.key) {
    params.key = filters.key;
  }

  const fetchApiUrl = getResourceMetafieldsRestApiUrl(context, ownerId, ownerResource);
  const url = coda.withQueryParams(fetchApiUrl, params);
  return makeGetRequest({ ...requestOptions, url }, context);
};

/*
export const fetchSingleMetafieldRest = async (
  metafieldId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ metafield: RestResources['Metafield'] }>> => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
};
*/

/*
export const createResourceMetafieldRest = async (
  resourceId: number,
  restResource: RestResource,
  fullKey: string,
  value: string,
  type: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  if (!restResource.metafieldOwnerType) {
    throw new coda.UserVisibleError(`\`${restResource.singular}\` does not support metafields.`);
  }

  const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
  let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${restResource.plural}/${resourceId}/metafields.json`;

  // edge case
  if (restResource.singular === 'shop') {
    url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;
  }

  const value_type =
    type ?? (value.indexOf('{') === 0 ? METAFIELD_LEGACY_TYPES.json_string : METAFIELD_LEGACY_TYPES.string);
  const payload = {
    metafield: {
      namespace: metaNamespace,
      key: metaKey,
      value,
      type: value_type,
    },
  };

  return makePostRequest({ ...requestOptions, url, payload }, context);
};
*/

/*
export const updateResourceMetafieldRest = async (
  metafieldId: number,
  resourceId: number,
  restResource: RestResource,
  value: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  if (!restResource.metafieldOwnerType) {
    throw new coda.UserVisibleError(`\`${restResource.singular}\` does not support metafields.`);
  }
  let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${restResource.plural}/${resourceId}/metafields/${metafieldId}.json`;
  // edge case
  if (restResource.singular === 'shop') {
    url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;
  }

  const payload = {
    metafield: { value },
  };

  return makePutRequest({ ...requestOptions, url, payload }, context);
};
*/

export const deleteMetafieldRest = async (
  metafieldId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;
  return makeDeleteRequest({ ...requestOptions, url }, context);
};

export async function syncRestResourceMetafields(metafieldKeys: string[], context: coda.SyncExecutionContext) {
  const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
  const ownerResourceDefinition = requireResourceDefinitionWithMetaFieldOwnerType(metafieldOwnerType);
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;

  let metafieldDefinitions =
    prevContinuation?.extraContinuationData?.metafieldDefinitions ??
    (await fetchMetafieldDefinitionsGraphQl({ ownerType: metafieldOwnerType }, context));

  const params = cleanQueryParams({
    fields: ['id'].join(', '),
    // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
    // TODO: calculate best possible value based on effectiveMetafieldKeys.length
    limit: 30,
  });

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(
      `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${ownerResourceDefinition.rest.plural}.json`,
      params
    );

  let { response, continuation } = await makeSyncTableGetRequest(
    {
      url,
      extraContinuationData: { metafieldDefinitions },
    },
    context
  );
  if (response?.body[ownerResourceDefinition.rest.plural]) {
    // Add metafields by doing multiple Rest Admin API calls
    const items = [];
    await Promise.all(
      response.body[ownerResourceDefinition.rest.plural].map(async (resource) => {
        const response = await fetchMetafieldsRest(resource.id, ownerResourceDefinition, {}, context);
        response?.body?.metafields
          .filter((m) => (metafieldKeys.length ? metafieldKeys.includes(getMetaFieldFullKey(m)) : true))
          .forEach((m) => {
            items.push(
              formatMetafieldForSchemaFromGraphQlApi(
                normalizeRestMetafieldResponseToGraphQLResponse(m, metafieldOwnerType, metafieldDefinitions),
                idToGraphQlGid(ownerResourceDefinition.graphQl.name, m.owner_id),
                undefined,
                ownerResourceDefinition,
                context
              )
            );
          });
      })
    );

    return { result: items, continuation };
  }
}
// #endregion

// #region GraphQL Requests
/**
 * Fetch Metafields by their full key on a specific resource.
 *
 * params.ownerGid is not required when getting metafields for Shop. If
 * params.keys is not provided, all metafields (up to max of
 * GRAPHQL_NODES_LIMIT) will be fetched and returned.
 *
 * @returns undefined or Metafield nodes along with their owner Gid and possible parent owner GID
 */
export async function fetchMetafieldsGraphQlByKey(
  params: {
    keys?: string[];
    ownerGid?: string;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<
  | {
      ownerNodeGid: string;
      parentOwnerNodeGid: string;
      metafieldNodes: MetafieldFragmentWithDefinition[];
    }
  | undefined
> {
  const { keys, ownerGid } = params;
  // TODO: better check
  const maybeShopQuery = ownerGid === undefined;

  let metafieldNodes: MetafieldFragmentWithDefinition[];
  let ownerNodeGid: string;
  let parentOwnerNodeGid: string;
  const payload = {
    query: maybeShopQuery ? queryShopMetafieldsByKeys : querySingleNodeMetafieldsByKey,
    variables: {
      ownerGid: maybeShopQuery ? undefined : ownerGid,
      metafieldKeys: keys ?? [],
      countMetafields: !keys || !keys.length ? GRAPHQL_NODES_LIMIT : keys.length,
    } as GetShopMetafieldsByKeyQueryVariables | GetSingleNodeMetafieldsByKeyQueryVariables,
  };

  const { response } = await makeGraphQlRequest<GetShopMetafieldsByKeyQuery | GetSingleNodeMetafieldsByKeyQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data) {
    if ('shop' in response.body.data) {
      metafieldNodes = response.body.data.shop.metafields.nodes as MetafieldFragmentWithDefinition[];
      ownerNodeGid = response.body.data.shop.id;
    }
    if ('node' in response.body.data && 'metafields' in response.body.data.node) {
      metafieldNodes = response.body.data.node.metafields.nodes as MetafieldFragmentWithDefinition[];
      ownerNodeGid = response.body.data.node.id;
      parentOwnerNodeGid =
        'parentOwner' in response.body.data.node ? response.body.data.node.parentOwner?.id : undefined;
    }
  }

  if (metafieldNodes.length) {
    return {
      ownerNodeGid,
      parentOwnerNodeGid,
      metafieldNodes,
    };
  }
}

/**
 * Fetch a single Metafield by its full key on a specific resource.
 * params.ownerGid is not required when getting metafields for Shop.
 *
 * @returns undefined or single Metafield node along with its owner Gid and possible parent owner Gid
 */
export async function fetchSingleMetafieldGraphQlByKey(
  params: {
    fullKey: string;
    ownerGid?: string;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<
  | {
      ownerNodeGid: string;
      parentOwnerNodeGid: string;
      metafieldNode: MetafieldFragmentWithDefinition;
    }
  | undefined
> {
  const { fullKey, ownerGid } = params;
  const metafieldsResponse = await fetchMetafieldsGraphQlByKey(
    { keys: [fullKey], ownerGid: ownerGid },
    context,
    requestOptions
  );
  if (metafieldsResponse) {
    const { metafieldNodes, ownerNodeGid, parentOwnerNodeGid } = metafieldsResponse;
    if (metafieldNodes.length) {
      const metafieldNode = metafieldNodes.find((m) => m.key === fullKey) as MetafieldFragmentWithDefinition;
      if (metafieldNode) {
        return {
          ownerNodeGid,
          parentOwnerNodeGid,
          metafieldNode,
        };
      }
    }
  }
}

/*
export async function fetchSingleMetafieldGraphQlById(
  params: {
    ownerGid?: string;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<GetSingleMetafieldQuery['node'] | undefined> {
  const payload = {
    query: makeQuerySingleMetafield,
    variables: { gid: params.ownerGid } as GetSingleMetafieldQueryVariables,
  };

  const { response } = await makeGraphQlRequest<GetSingleMetafieldQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );

  if (response?.body?.data?.node) {
    return response.body.data.node;
  }
}
*/

export const setMetafieldsGraphQl = async (
  metafieldsSetInputs: MetafieldsSetInput[],
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: MutationSetMetafields,
    variables: {
      inputs: metafieldsSetInputs,
    } as SetMetafieldsMutationVariables,
  };
  return makeGraphQlRequest<SetMetafieldsMutation>(
    {
      ...requestOptions,
      payload,
      getUserErrors: (body: { data: SetMetafieldsMutation }) => body?.data?.metafieldsSet?.userErrors,
    },
    context
  );
};

export async function syncGraphQlResourceMetafields(metafieldKeys: string[], context: coda.SyncExecutionContext) {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  /**
   * Apparemment le max (une query de 250 productVariants avec le produit
   * parent et 250 metafields) coute 167, donc on est large
   */
  const defaultMaxEntriesPerRun = GRAPHQL_NODES_LIMIT;
  const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
    defaultMaxEntriesPerRun,
    prevContinuation,
    context
  );
  if (shouldDeferBy > 0) {
    return skipGraphQlSyncTableRun(prevContinuation as unknown as SyncTableGraphQlContinuation, shouldDeferBy);
  }

  let items: any[];
  const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
  const ownerResource = requireResourceDefinitionWithMetaFieldOwnerType(metafieldOwnerType);
  if (!('plural' in ownerResource.graphQl)) {
    throw new Error('GraphQlResourceDefinition.graphQl.plural not found');
  }

  const isShopQuery = metafieldOwnerType === MetafieldOwnerType.Shop;
  const graphQlQueryOperation = ownerResource.graphQl.plural;
  const query = isShopQuery ? queryShopMetafieldsByKeys : makeQueryResourceMetafieldsByKeys(graphQlQueryOperation);

  const payload = {
    query: query,
    variables: {
      metafieldKeys,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : GRAPHQL_NODES_LIMIT,
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
    },
  };

  type GenericMetafieldsData = {
    [K in string]: {
      nodes: {
        id: string;
        parentOwner: { id: string };
        metafields: { nodes: MetafieldFragmentWithDefinition[] };
      }[];
      id: string;
      parentOwner?: { id: string };
    };
  };
  const { response, continuation } = await makeSyncTableGraphQlRequest<
    GenericMetafieldsData | GetShopMetafieldsByKeyQuery
  >(
    {
      payload,
      maxEntriesPerRun,
      prevContinuation,
      getPageInfo: isShopQuery ? undefined : (data: any) => data[graphQlQueryOperation]?.pageInfo,
    },
    context
  );

  if (isShopQuery && 'metafields' in response?.body?.data?.shop && response?.body?.data?.shop?.metafields?.nodes) {
    items = response.body.data.shop.metafields.nodes
      .map((metafieldNode: MetafieldFragmentWithDefinition) =>
        formatMetafieldForSchemaFromGraphQlApi(
          metafieldNode,
          response.body.data.shop.id,
          undefined,
          ownerResource,
          context
        )
      )
      .filter(Boolean);
  }

  if (response?.body?.data[graphQlQueryOperation]?.nodes) {
    items = response.body.data[graphQlQueryOperation].nodes
      .map((ownerNode) =>
        ownerNode.metafields.nodes.map((metafieldNode: MetafieldFragmentWithDefinition) =>
          formatMetafieldForSchemaFromGraphQlApi(
            metafieldNode,
            ownerNode.id,
            ownerNode?.parentOwner?.id,
            ownerResource,
            context
          )
        )
      )
      .flat()
      .filter(Boolean);
  }

  return {
    result: items,
    continuation: continuation,
  };
}
export interface DeletedMetafieldsByKeysRest {
  id: number;
  key: string;
  namespace: string;
}
const deleteMetafieldsByKeysRest = async (
  metafieldsToDelete: CodaMetafieldKeyValueSet[],
  ownerId: number,
  ownerResource: ResourceTypeUnion,
  context: coda.ExecutionContext
): Promise<DeletedMetafieldsByKeysRest[]> => {
  const response = await fetchMetafieldsRest(ownerId, ownerResource, {}, context, { cacheTtlSecs: CACHE_DISABLED });
  if (response?.body?.metafields) {
    const promises = metafieldsToDelete.map(async (metafieldKeyValueSet) => {
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
      const metafield = response.body.metafields.find((m) => m.key === metaKey && m.namespace === metaNamespace);
      if (metafield !== undefined) {
        try {
          await deleteMetafieldRest(metafield.id, context);
        } catch (error) {
          // If the request failed because the server returned a 300+ status code.
          if (coda.StatusCodeError.isStatusCodeError(error)) {
            const statusError = error as coda.StatusCodeError;
            if (statusError.statusCode === 404) {
              console.error(
                `Metafield ${metafieldKeyValueSet.key} not found for resource ${ownerResource.rest.singular} with ID ${ownerId}. Possibly already deleted.`
              );
            }
          }
          // The request failed for some other reason. Re-throw the error so that it bubbles up.
          throw error;
        }
      } else {
        console.error(
          `Metafield ${metafieldKeyValueSet.key} not found for resource ${ownerResource.rest.singular} with ID ${ownerId}. Possibly already deleted.`
        );
      }

      // If no errors were thrown, then the metafield was deleted.
      return {
        id: metafield?.id,
        namespace: metaNamespace,
        key: metaKey,
      } as DeletedMetafieldsByKeysRest;
    });

    const results = await Promise.all(promises);
    return results.filter((r) => !!r);
  }

  return [];
};
export async function updateResourceMetafieldsGraphQl(
  ownerGid: string,
  metafieldKeyValueSets: CodaMetafieldKeyValueSet[],
  context: coda.ExecutionContext
): Promise<{ deletedMetafields: DeletedMetafieldsByKeysRest[]; updatedMetafields: MetafieldFragmentWithDefinition[] }> {
  let deletedMetafields: DeletedMetafieldsByKeysRest[] = [];
  const updatedMetafields: MetafieldFragmentWithDefinition[] = [];

  const graphQlResourceName = graphQlGidToResourceName(ownerGid);
  const metafieldsToDelete = metafieldKeyValueSets.filter((set) => set.value === null);
  const metafieldsToUpdate = metafieldKeyValueSets.filter((set) => set.value && set.value !== null);

  if (graphQlResourceName && metafieldsToDelete.length) {
    const ownerResourceDefinition = getResourceDefinitionByGraphQlName(graphQlResourceName);
    deletedMetafields = await deleteMetafieldsByKeysRest(
      metafieldsToDelete,
      graphQlGidToId(ownerGid),
      ownerResourceDefinition,
      context
    );
  }

  if (metafieldsToUpdate.length) {
    const metafieldsSetInputs = metafieldsToUpdate
      .map((m) => formatMetafieldGraphQlInputFromMetafieldKeyValueSet(ownerGid, m))
      .filter(Boolean);

    const { response: updateResponse } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
    if (updateResponse) {
      const graphQldata = updateResponse.body.data as SetMetafieldsMutation;
      if (graphQldata?.metafieldsSet?.metafields?.length) {
        graphQldata.metafieldsSet.metafields.forEach((metafield: MetafieldFragmentWithDefinition) => {
          updatedMetafields.push(metafield);
        });
      }
    }
  }

  return { deletedMetafields, updatedMetafields };
}
/**
 * Perform metafields update / deletions using GraphQL Admin API and return the
 * result formatted in a way to be incorporated in a sync table row
 */
export async function updateAndFormatResourceMetafieldsGraphQl(
  params: {
    ownerGid: string;
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[];
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean;
  },
  context: coda.ExecutionContext
): Promise<{ [key: string]: any }> {
  let obj = {};

  const { deletedMetafields, updatedMetafields } = await updateResourceMetafieldsGraphQl(
    params.ownerGid,
    params.metafieldKeyValueSets,
    context
  );
  if (deletedMetafields.length) {
    deletedMetafields.forEach((m) => {
      const prefixedKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(m));
      obj[prefixedKey] = undefined;
    });
  }

  if (updatedMetafields.length) {
    updatedMetafields.forEach((metafield) => {
      const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
      if (shouldUpdateSyncTableMetafieldValue(metafield.type, params.schemaWithIdentity)) {
        obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      }
    });
  }

  return obj;
}
// Pour les ressources dont les metafields ne peuvent pas être update
// directement dans la requête de la ressource mais seulement par des requêtes
// spécifiques pour chaque metafield
// TODO: faire la fonction équivalente quand on peut update en un seul appel ?
// CAD une fonction qui gere l'update de la ressource et de ses metafields et qui gere aussi la suppression des metafields
export async function updateResourceMetafieldsRest(
  ownerId: number,
  ownerResource: ResourceTypeUnion,
  metafieldKeyValueSets: CodaMetafieldKeyValueSet[],
  context: coda.ExecutionContext
): Promise<{ deletedMetafields: DeletedMetafieldsByKeysRest[]; updatedMetafields: RestResources['Metafield'][] }> {
  const metafieldsToDelete = metafieldKeyValueSets.filter((set) => set.value === null);
  const metafieldsToUpdate = metafieldKeyValueSets.filter((set) => set.value && set.value !== null);

  const promises: (Promise<any> | undefined)[] = [];
  if (metafieldsToDelete.length) {
    promises.push(deleteMetafieldsByKeysRest(metafieldsToDelete, ownerId, ownerResource, context));
  } else {
    promises.push(undefined);
  }

  if (metafieldsToUpdate.length) {
    const metafieldRestInputs = metafieldsToUpdate.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean);
    metafieldRestInputs.forEach((input) => {
      const url = getResourceMetafieldsRestApiUrl(context, ownerId, ownerResource);
      const payload = {
        metafield: {
          namespace: input.namespace,
          key: input.key,
          type: input.type,
          value: input.value,
        },
      };
      promises.push(
        makePostRequest<{ metafield: RestResources['Metafield'][] }>({ url, payload }, context).then(
          (response) => response.body.metafield
        )
      );
    });
  } else {
    promises.push(undefined);
  }

  const [deletedMetafields, ...updatedMetafields] = (await Promise.all(promises)) as [
    DeletedMetafieldsByKeysRest[],
    ...RestResources['Metafield'][]
  ];

  return {
    deletedMetafields: deletedMetafields ? deletedMetafields.filter(Boolean) : [],
    updatedMetafields: updatedMetafields ? updatedMetafields.filter(Boolean) : [],
  };
}
/**
 * Perform metafields update / deletions using Rest Admin API and return the
 * result formatted in a way to be incorporated in a sync table row
 */
type RowMetafieldsProperties = { [key: string]: any };
export async function updateAndFormatResourceMetafieldsRest(
  params: {
    ownerId: number;
    ownerResource: ResourceTypeUnion;
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[];
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean;
  },
  context: coda.ExecutionContext
): Promise<RowMetafieldsProperties> {
  let obj = {};

  const { deletedMetafields, updatedMetafields } = await updateResourceMetafieldsRest(
    params.ownerId,
    params.ownerResource,
    params.metafieldKeyValueSets,
    context
  );
  if (deletedMetafields.length) {
    deletedMetafields.forEach((m) => {
      const prefixedKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(m));
      obj[prefixedKey] = undefined;
    });
  }

  if (updatedMetafields.length) {
    updatedMetafields.forEach((metafield) => {
      const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
      if (shouldUpdateSyncTableMetafieldValue(metafield.type, params.schemaWithIdentity)) {
        obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      }
    });
  }

  return obj;
}
// #endregion

// #region Unused stuff
/*
export const getResourceMetafieldByNamespaceKey = async (
  resourceId: number,
  resourceType: string,
  metaNamespace: string,
  metaKey: string,
  context: coda.ExecutionContext
): Promise<MetafieldRest> => {
  const res = await fetchResourceMetafields(
    getResourceMetafieldsRestUrl(getMetafieldRestEndpointFromRestResourceType(resourceType), resourceId, context),
    { namespace: metaNamespace, key: metaKey },
    context
  );
  return res.body.metafields.find((meta: MetafieldRest) => meta.namespace === metaNamespace && meta.key === metaKey);
};
*/

/*
export async function formatMetafieldDeleteInputFromResourceUpdate(
  resourceId: number,
  metafieldFromKeys: string[],
  context: coda.ExecutionContext
): Promise<MetafieldDeleteInput[]> {
  if (!metafieldFromKeys.length) return [];

  const response = await fetchResourceMetafields(resourceId, 'variant', {}, context);
  if (response?.body?.metafields) {
    return metafieldFromKeys.map((fromKey) => {
      // const value = update.newValue[fromKey] as any;
      const realFromKey = getMetaFieldRealFromKey(fromKey);
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
      const metafield = response.body.metafields.find((m) => m.key === metaKey && m.namespace === metaNamespace);
      if (metafield) {
        return {
          id: idToGraphQlGid('Metafield', metafield.id),
        };
      } else {
        throw new Error(`Metafield ${realFromKey} not found in resource ${resourceId}`);
      }
    });
  }
}
*/
// #endregion
