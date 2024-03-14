// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import { CACHE_DEFAULT, CACHE_DISABLED, METAFIELD_PREFIX_KEY, REST_DEFAULT_API_VERSION } from '../constants';
import { METAFIELD_TYPES, METAFIELD_LEGACY_TYPES, METAFIELD_TYPES_RAW_REFERENCE } from './metafields-constants';
import {
  arrayUnique,
  capitalizeFirstChar,
  extractValueAndUnitFromMeasurementString,
  getUnitMap,
  isNullOrEmpty,
  maybeParseJson,
  unitToShortName,
} from '../helpers';
import {
  cleanQueryParams,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
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

import { CollectionReference, formatCollectionReference } from '../schemas/syncTable/CollectionSchema';
import { FileReference, formatFileReference } from '../schemas/syncTable/FileSchema';
import { formatArticleReference } from '../schemas/syncTable/ArticleSchema';
import { formatBlogReference } from '../schemas/syncTable/BlogSchema';
import { formatCustomerReference } from '../schemas/syncTable/CustomerSchema';
import { formatLocationReference } from '../schemas/syncTable/LocationSchema';
import { formatMetafieldDefinitionReference } from '../schemas/syncTable/MetafieldDefinitionSchema';
import { formatMetaobjectReference, getMetaobjectReferenceSchema } from '../schemas/syncTable/MetaObjectSchema';
import { formatOrderReference } from '../schemas/syncTable/OrderSchema';
import { PageReference, formatPageReference } from '../schemas/syncTable/PageSchema';
import { ProductReference, formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { ProductVariantReference, formatProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';

import {
  MutationSetMetafields,
  QueryShopMetafieldsByKeys,
  makeQueryResourceMetafieldsByKeys,
  makeQuerySingleMetafield,
  makeQuerySingleResourceMetafieldsByKeys,
} from './metafields-graphql';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields-constants';

import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../schemas/syncTable/MetafieldSchema';
import { GraphQlResourceName } from '../types/RequestsGraphQl';
import { RestResourcePlural, RestResourceSingular } from '../types/RequestsRest';
import {
  fetchMetafieldDefinitionsGraphQl,
  findMatchingMetafieldDefinition,
  makeAutocompleteMetafieldKeysWithDefinitions,
  requireMatchingMetafieldDefinition,
} from '../metafieldDefinitions/metafieldDefinitions-functions';
import { ShopRestFetcher } from '../shop/shop-functions';
import { getResourceDefinitionFromGraphQlName } from '../allResources';

import type * as Rest from '../types/RestResources';
import type {
  MetafieldFragmentWithDefinition,
  MetafieldRestInput,
  ShopifyMeasurementField,
  ShopifyMoneyField,
  ShopifyRatingField,
  SupportedGraphQlResourceWithMetafields,
} from '../types/Metafields';
import type { ResourceMetafieldsSyncTableDefinition } from './metafields-constants';
import type {
  MoneyInput,
  CurrencyCode,
  MetafieldsSetInput,
  MetafieldDefinition,
  MetafieldOwnerType,
} from '../types/admin.types';
import type {
  GetSingleMetafieldQuery,
  GetSingleMetafieldQueryVariables,
  MetafieldDefinitionFragment,
  MetafieldFieldsFragment,
  MetaobjectFieldDefinitionFragment,
  SetMetafieldsMutation,
  SetMetafieldsMutationVariables,
} from '../types/admin.generated';
import type { CodaMetafieldKeyValueSet, CodaMetafieldListValue, CodaMetafieldValue } from '../helpers-setup';
import type { RestResource } from '../types/RequestsRest';
import type { AllMetafieldTypeValue, MetafieldTypeValue } from './metafields-constants';
import type { FetchRequestOptions } from '../types/Requests';
import type { SyncTableGraphQlContinuation, SyncTableRestContinuation } from '../types/SyncTable';
import type { ResourceTypeUnion, ResourceTypeGraphQlUnion } from '../typesNew/allResources';

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
export async function autoCompleteMetafieldWithDefinitionFullKeys(
  context: coda.ExecutionContext,
  search: string,
  formulaContext: coda.MetadataContext
) {
  /**
   * graphQlResource can be the dynamic url of a metafields sync table or
   * formulaContext.ownerType (a key from RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS)
   */
  const graphQlResource =
    (context.sync?.dynamicUrl as SupportedGraphQlResourceWithMetafields) || formulaContext.ownerType;
  if (graphQlResource === undefined || graphQlResource === '') {
    return [];
  }
  const { metafieldOwnerType } = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  return makeAutocompleteMetafieldKeysWithDefinitions(metafieldOwnerType)(context, search, {});
}
// #endregion

// #region Helpers
/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
export function hasMetafieldsInUpdates(
  updates: Array<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>>
) {
  const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
  return allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
}

/**
 * Metafields should be deleted if their string value is empty of contains an empty JSON.stringified array
 */
export function shouldDeleteMetafield(string: string) {
  return string === null || string === undefined || string === '' || string === '[]';
}

export function mapMetaFieldToSchemaProperty(
  fieldDefinition: MetafieldDefinitionFragment | MetaobjectFieldDefinitionFragment
): coda.Schema & coda.ObjectSchemaProperty {
  const type = fieldDefinition.type.name;
  let description = fieldDefinition.description;
  const isMetaobjectFieldDefinition = !fieldDefinition.hasOwnProperty('namespace');

  let schemaKey = fieldDefinition.key;

  /**
   * Add full key to description for metafields, not metaobject fields
   * We prefix fromKey to be able to determine later wich columns are metafield values
   */
  if (!isMetaobjectFieldDefinition) {
    const fullKey = getMetaFieldFullKey(fieldDefinition as MetafieldDefinition);
    description += (description ? '\n' : '') + `field key: [${fullKey}]`;

    schemaKey = METAFIELD_PREFIX_KEY + fullKey;
  }

  const baseProperty = {
    description,
    fromKey: schemaKey,
    fixedId: schemaKey,
  };

  // Add eventual choices
  const choicesValidation = fieldDefinition.validations.find((v) => v.name === 'choices');
  if (choicesValidation && choicesValidation.value) {
    baseProperty['codaType'] = coda.ValueHintType.SelectList;
    baseProperty['options'] = JSON.parse(choicesValidation.value);
  }

  switch (type) {
    // Simple strings
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.json:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.json_string:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        mutable: true,
      };
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_single_line_text_field:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String },
      };

    // Rich text
    case METAFIELD_TYPES.rich_text_field:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Html,
      };

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        mutable: true,
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(getUnitMap(type)).join(
          ', '
        )}.`,
      };
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String },
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
          getUnitMap(type.replace('list.', ''))
        ).join(', ')}.`,
      };

    // URL
    case METAFIELD_TYPES.url:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Url,
        mutable: true,
      };
    case METAFIELD_TYPES.list_url:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
      };

    // RATING
    case METAFIELD_TYPES.rating:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        // codaType: coda.ValueHintType.Scale,
        // maximum: maximumStr ? parseFloat(maximumStr) : undefined,
        mutable: true,
      };
    case METAFIELD_TYPES.list_rating:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.Number },
      };

    // NUMBER
    case METAFIELD_TYPES.number_integer:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        precision: 0,
        mutable: true,
      };
    case METAFIELD_TYPES.list_number_integer:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.Number, precision: 0 },
      };

    case METAFIELD_TYPES.number_decimal:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        mutable: true,
      };
    case METAFIELD_TYPES.list_number_decimal:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.Number },
      };

    // MONEY
    case METAFIELD_TYPES.money:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        codaType: coda.ValueHintType.Currency,

        mutable: true,
      };

    // TRUE_FALSE
    case METAFIELD_TYPES.boolean:
      return {
        ...baseProperty,
        type: coda.ValueType.Boolean,
        mutable: true,
      };

    // DATE_TIME
    case METAFIELD_TYPES.date:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Date,
        mutable: true,
      };
    case METAFIELD_TYPES.list_date:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Date },
      };

    case METAFIELD_TYPES.date_time:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.DateTime,
        mutable: true,
      };
    case METAFIELD_TYPES.list_date_time:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
      };

    // REFERENCES
    case METAFIELD_TYPES.collection_reference:
      return {
        ...baseProperty,
        ...CollectionReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_collection_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: CollectionReference,
        mutable: true,
      };

    case METAFIELD_TYPES.file_reference:
      return {
        ...baseProperty,
        ...FileReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_file_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: FileReference,
        mutable: true,
      };

    case METAFIELD_TYPES.metaobject_reference:
      return {
        ...baseProperty,
        ...getMetaobjectReferenceSchema(fieldDefinition),
        mutable: true,
      };
    case METAFIELD_TYPES.list_metaobject_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: getMetaobjectReferenceSchema(fieldDefinition),
        mutable: true,
      };

    case METAFIELD_TYPES.mixed_reference:
      return {
        ...baseProperty,
        description: '⚠️ We only support raw value for mixed references.\n' + baseProperty.description,
        type: coda.ValueType.String,
        mutable: true,
      };
    case METAFIELD_TYPES.list_mixed_reference:
      return {
        ...baseProperty,
        description: '⚠️ We only support raw values for mixed references.\n' + baseProperty.description,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String },
        mutable: true,
      };

    case METAFIELD_TYPES.page_reference:
      return {
        ...baseProperty,
        ...PageReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_page_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PageReference,
        mutable: true,
      };

    case METAFIELD_TYPES.product_reference:
      return {
        ...baseProperty,
        ...ProductReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_product_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: ProductReference,
        mutable: true,
      };

    case METAFIELD_TYPES.variant_reference:
      return {
        ...baseProperty,
        ...ProductVariantReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_variant_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: ProductVariantReference,
        mutable: true,
      };

    default:
      break;
  }

  throw new Error(`Unknown metafield type: ${type}`);
}

export async function augmentSchemaWithMetafields<SchemaT extends coda.ObjectSchemaDefinition<string, string>>(
  baseSchema: SchemaT,
  ownerType: MetafieldOwnerType,
  context: coda.ExecutionContext
) {
  const schema: SchemaT = { ...baseSchema };
  schema.featuredProperties = schema.featuredProperties ?? [];

  const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl({ ownerType }, context);
  metafieldDefinitions.forEach((metafieldDefinition) => {
    const property = mapMetaFieldToSchemaProperty(metafieldDefinition);
    if (property) {
      const fullKey = getMetaFieldFullKey(metafieldDefinition);
      const name = accents.remove(metafieldDefinition.name);
      const propName = `Meta${capitalizeFirstChar(name)}`;
      property.displayName = `${metafieldDefinition.name} [${fullKey}]`;
      schema.properties[propName] = property;
      // always feature metafields properties so that the user know they are synced
      schema.featuredProperties.push(propName);
    }
  });

  return schema;
}

function getResourceMetafieldsRestApiUrl(
  context: coda.ExecutionContext,
  ownerId: number,
  ownerResource: ResourceTypeUnion
) {
  return `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${ownerResource.rest.plural}/${ownerId}/metafields.json`;
}

function getResourceMetafieldsAdminUrl(
  context: coda.ExecutionContext,
  restResource: ResourceTypeUnion,
  hasMetafieldDefinition: boolean,
  ownerId: number,
  parentOwnerId?: number
) {
  let admin_url: string;
  const { singular, plural } = restResource.rest;

  switch (singular) {
    case RestResourceSingular.Article:
    case RestResourceSingular.Blog:
    case RestResourceSingular.Collection:
    case RestResourceSingular.Customer:
    case RestResourceSingular.Order:
    case RestResourceSingular.Page:
    case RestResourceSingular.Product:
      admin_url = `${context.endpoint}/admin/${plural}/${ownerId}/metafields`;
      break;

    case RestResourceSingular.Location:
      admin_url = `${context.endpoint}/admin/settings/${plural}/${ownerId}/metafields`;
      break;

    case RestResourceSingular.ProductVariant:
      if (parentOwnerId) {
        admin_url = `${context.endpoint}/admin/${RestResourcePlural.Product}/${parentOwnerId}/${plural}/${ownerId}/metafields`;
      }
      break;

    default:
      break;
  }
  if (admin_url && !hasMetafieldDefinition) {
    admin_url += `/unstructured`;
  }
  return admin_url;
}

/**
 * Returns the ResourceMetafieldsSyncTableDefinition for the given resource type and also validates resource type
 */
export const requireResourceMetafieldsSyncTableDefinition = (
  graphQlResource: SupportedGraphQlResourceWithMetafields
) => {
  const definition = RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.find((v) => v.key === graphQlResource);
  if (!definition) {
    throw new coda.UserVisibleError('Unknown resource type: ' + graphQlResource);
  }
  return definition;
};

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
    const ownerResourceDefinition = getResourceDefinitionFromGraphQlName(graphQlResourceName);
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
): Promise<{ deletedMetafields: DeletedMetafieldsByKeysRest[]; updatedMetafields: Rest.Metafield[] }> {
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
        makePostRequest<{ metafield: Rest.Metafield[] }>({ url, payload }, context).then(
          (response) => response.body.metafield
        )
      );
    });
  } else {
    promises.push(undefined);
  }

  const [deletedMetafields, ...updatedMetafields] = (await Promise.all(promises)) as [
    DeletedMetafieldsByKeysRest[],
    ...Rest.Metafield[]
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
export type RowMetafieldsProperties = { [key: string]: any };
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

// #region Metafield key functions
/**
 * This function checks if a given metafield key is the 'full' one or not.
 * When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
 */
const hasMetafieldFullKey = (metafield: { namespace: string; key: string }) =>
  metafield.key.indexOf(metafield.namespace) === 0;

/**
 * A naive way to check if any of the keys might be a metafield key
 */
export function maybeHasMetaFieldKeys(keys: string[]) {
  return keys.some((key) => key.indexOf('.') !== -1);
}

export function getMetaFieldFullKey(m: { namespace: string; key: string }): string {
  if (hasMetafieldFullKey(m)) return m.key as string;
  return `${m.namespace}.${m.key}`;
}

export const splitMetaFieldFullKey = (fullKey: string) => {
  const lastDotIndex = fullKey.lastIndexOf('.');
  if (lastDotIndex === -1) {
    throw new Error(`Not a metafield full key: ${fullKey}`);
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
  return METAFIELD_PREFIX_KEY + fullKey;
}

/**
 * Remove our custom prefix from the metafield key
 */
export function removePrefixFromMetaFieldKey(fromKey: string) {
  return fromKey.replace(METAFIELD_PREFIX_KEY, '');
}

/**
 * Differentiate between the metafields columns and the standard columns from
 * the effective columns keys that we can get when coda does an update or
 * perform a sync table request.
 */
export function separatePrefixedMetafieldsKeysFromKeys(fromKeys: string[]) {
  const prefixedMetafieldFromKeys = fromKeys.filter((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
  const standardFromKeys = fromKeys.filter((fromKey) => prefixedMetafieldFromKeys.indexOf(fromKey) === -1);

  return { prefixedMetafieldFromKeys, standardFromKeys };
}
// #endregion

// #region Format for Schema
// TODO: maybe we could return string arrays as a single string with delimiter, like '\n;;;\n' for easier editing inside Coda ?
/**
 * Format a metafield for a Resource schema that includes metafields
 */
export function formatMetaFieldValueForSchema(
  metafield: MetafieldFieldsFragment | Rest.Metafield | { value: string; type: string }
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
  metafield: Rest.Metafield,
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
  ownerResource: ResourceTypeGraphQlUnion,
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
    owner_type: ownerResource.graphQl.name,
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
export function metafieldsCodaInputToMetafieldRestInputs(metafields: string[]): MetafieldRestInput[] {
  const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
  return metafieldKeyValueSets.length
    ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
    : [];
}

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
    } as MetafieldRestInput;
  }
}

/**
 * Formate un objet MetafieldRestInput pour GraphQL Admin API
 * depuis un paramètre Coda utilisant une formule `MetafieldKeyValueSet(…)`
 */
export function formatMetafieldGraphQlInputFromMetafieldKeyValueSet(
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
): ShopifyRatingField {
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
): Promise<ShopifyMoneyField> {
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
): ShopifyMeasurementField {
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
): Promise<coda.FetchResponse<{ metafields: Rest.Metafield[] }>> => {
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

export const fetchSingleMetafieldRest = async (
  metafieldId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ metafield: Rest.Metafield }>> => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
};

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

export const deleteMetafieldRest = async (
  metafieldId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;
  return makeDeleteRequest({ ...requestOptions, url }, context);
};

export async function syncRestResourceMetafields(metafieldKeys: string[], context: coda.SyncExecutionContext) {
  const graphQlResourceName = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
  const ownerResourceDefinition = getResourceDefinitionFromGraphQlName(graphQlResourceName);
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;

  // TODO: better check
  if (!ownerResourceDefinition || !('metafieldOwnerType' in ownerResourceDefinition)) {
    throw new Error(`\`${graphQlResourceName}\` does not support metafields.`);
  }

  let metafieldDefinitions =
    prevContinuation?.extraContinuationData?.metafieldDefinitions ??
    (await fetchMetafieldDefinitionsGraphQl({ ownerType: ownerResourceDefinition.metafieldOwnerType }, context));

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
                normalizeRestMetafieldResponseToGraphQLResponse(
                  m,
                  ownerResourceDefinition.metafieldOwnerType,
                  metafieldDefinitions
                ),
                idToGraphQlGid(graphQlResourceName, m.owner_id),
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
 * Get a single Metafield from a specific resource and return the metafield node
 * along with its owner GID
 */
export async function fetchSingleMetafieldGraphQlByKey(
  params: {
    graphQlResource: SupportedGraphQlResourceWithMetafields;
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
  const { graphQlResource, fullKey, ownerGid } = params;
  const isShopQuery = graphQlResource === GraphQlResourceName.Shop;
  const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  const { graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;

  const payload = {
    query: isShopQuery ? QueryShopMetafieldsByKeys : makeQuerySingleResourceMetafieldsByKeys(graphQlQueryOperation),
    variables: {
      ownerGid: isShopQuery ? undefined : ownerGid,
      metafieldKeys: [fullKey],
      countMetafields: 1,
    },
  };

  const { response } = await makeGraphQlRequest<{
    [K in string]: {
      metafields: { nodes: MetafieldFragmentWithDefinition[] };
      id: string;
      parentOwner?: { id: string };
    };
  }>({ ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT }, context);

  if (response?.body?.data[graphQlQueryOperation]?.metafields?.nodes) {
    // When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
    const metafieldNode: MetafieldFragmentWithDefinition = response.body.data[
      graphQlQueryOperation
    ].metafields.nodes.find((m: MetafieldFragmentWithDefinition) => m.key === fullKey);
    if (metafieldNode) {
      return {
        ownerNodeGid: response.body.data[graphQlQueryOperation].id,
        parentOwnerNodeGid: response.body.data[graphQlQueryOperation].parentOwner?.id,
        metafieldNode,
      };
    }
  }
}

/**
 * Get all Metafields (up to 250) from a specific resource and return metafields node along with their owner GID
 */
export async function fetchMetafieldsGraphQl(
  params: {
    graphQlResource: SupportedGraphQlResourceWithMetafields;
    ownerGid?: string;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<{
  ownerNodeGid: string;
  parentOwnerNodeGid: string;
  metafieldNodes: MetafieldFragmentWithDefinition[];
}> {
  const { graphQlResource, ownerGid } = params;
  const isShopQuery = graphQlResource === GraphQlResourceName.Shop;
  const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  const { graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;

  const payload = {
    query: isShopQuery ? QueryShopMetafieldsByKeys : makeQuerySingleResourceMetafieldsByKeys(graphQlQueryOperation),
    variables: {
      ownerGid: isShopQuery ? undefined : ownerGid,
      metafieldKeys: [],
      countMetafields: 250,
    },
  };

  const { response } = await makeGraphQlRequest<{
    [K in string]: {
      metafields: { nodes: MetafieldFragmentWithDefinition[] };
      id: string;
      parentOwner?: { id: string };
    };
  }>({ ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT }, context);
  if (response?.body?.data[graphQlQueryOperation]?.metafields) {
    const metafieldNodes: MetafieldFragmentWithDefinition[] =
      response.body.data[graphQlQueryOperation].metafields.nodes;
    return {
      ownerNodeGid: response.body.data[graphQlQueryOperation].id,
      parentOwnerNodeGid: response.body.data[graphQlQueryOperation].parentOwner?.id,
      metafieldNodes,
    };
  }
}

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
  const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  /**
   * Apparemment le max (une query de 250 productVariants avec le produit
   * parent et 250 metafields) coute 167, donc on est large
   */
  const defaultMaxEntriesPerRun = 250;
  const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
    defaultMaxEntriesPerRun,
    prevContinuation,
    context
  );
  if (shouldDeferBy > 0) {
    return skipGraphQlSyncTableRun(prevContinuation as unknown as SyncTableGraphQlContinuation, shouldDeferBy);
  }

  const isShopQuery = graphQlResource === GraphQlResourceName.Shop;
  const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  const ownerResourceDefinition = getResourceDefinitionFromGraphQlName(resourceMetafieldsSyncTableDefinition.key);
  const { syncTableGraphQlQueryOperation: graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;

  const query = isShopQuery
    ? QueryShopMetafieldsByKeys
    : makeQueryResourceMetafieldsByKeys(graphQlQueryOperation, metafieldKeys.length ? false : true);

  const payload = {
    query: query,
    variables: {
      metafieldKeys,
      countMetafields: metafieldKeys.length ? metafieldKeys.length : 250,
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
  type ShopMetafieldsData = {
    [K in string]: {
      metafields: { nodes: MetafieldFragmentWithDefinition[] };
      id: string;
    };
  };

  const { response, continuation } = await makeSyncTableGraphQlRequest<GenericMetafieldsData & ShopMetafieldsData>(
    {
      payload,
      maxEntriesPerRun,
      prevContinuation,
      getPageInfo: isShopQuery ? undefined : (data: any) => data[graphQlQueryOperation]?.pageInfo,
    },
    context
  );

  let items: any[];
  if (isShopQuery && response?.body?.data[graphQlQueryOperation]?.metafields?.nodes) {
    items = response.body.data[graphQlQueryOperation].metafields.nodes
      .map((metafieldNode) =>
        formatMetafieldForSchemaFromGraphQlApi(
          metafieldNode,
          response.body.data[graphQlQueryOperation].id,
          undefined,
          ownerResourceDefinition,
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
            ownerResourceDefinition,
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
