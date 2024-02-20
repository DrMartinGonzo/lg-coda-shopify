// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import { CACHE_SINGLE_FETCH, METAFIELD_PREFIX_KEY, NOT_FOUND, REST_DEFAULT_API_VERSION } from '../constants';
import { METAFIELD_TYPES, METAFIELD_LEGACY_TYPES } from './metafields-constants';
import type { AllMetafieldTypeValue, MetafieldTypeValue } from '../types/Metafields';
import {
  capitalizeFirstChar,
  extractValueAndUnitFromMeasurementString,
  getUnitMap,
  maybeParseJson,
  unitToShortName,
} from '../helpers';
import {
  GetRequestParams,
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
import { CollectionReference, formatCollectionReferenceValueForSchema } from '../schemas/syncTable/CollectionSchema';
import { FileReference, formatFileReferenceValueForSchema } from '../schemas/syncTable/FileSchema';
import { PageReference, formatPageReferenceValueForSchema } from '../schemas/syncTable/PageSchema';
import { ProductReference, formatProductReferenceValueForSchema } from '../schemas/syncTable/ProductSchemaRest';
import {
  ProductVariantReference,
  formatProductVariantReferenceValueForSchema,
} from '../schemas/syncTable/ProductVariantSchema';
import {
  MutationSetMetafields,
  QueryShopMetafieldsByKeys,
  makeQueryResourceMetafieldsByKeys,
  makeQuerySingleResourceMetafieldsByKeys,
  queryMetafieldDefinitions,
} from './metafields-graphql';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields-constants';
import {
  formatMetaobjectReferenceValueForSchema,
  getMetaobjectReferenceSchema,
} from '../schemas/syncTable/MetaObjectSchema';

import {
  MetafieldFragmentWithDefinition,
  MetafieldRestInput,
  ResourceMetafieldsSyncTableDefinition,
  ShopifyMeasurementField,
  ShopifyMoneyField,
  ShopifyRatingField,
  SupportedGraphQlResourceWithMetafields,
} from '../types/Metafields';
import {
  MoneyInput,
  CurrencyCode,
  MetafieldsSetInput,
  MetafieldDefinition,
  MetafieldOwnerType,
} from '../types/admin.types';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import {
  MetafieldDefinitionFragment,
  MetafieldFieldsFragment,
  MetaobjectFieldDefinitionFragment,
  SetMetafieldsMutation,
  SetMetafieldsMutationVariables,
} from '../types/admin.generated';
import { MetafieldSchema, metafieldSyncTableHelperEditColumns } from '../schemas/syncTable/MetafieldSchema';
import { GraphQlResource } from '../types/GraphQl';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { RestResource, restResources } from '../types/Rest';
import { getRestResourceFromGraphQlResourceType } from '../helpers-rest';
import { formatCustomerReferenceValueForSchema } from '../schemas/syncTable/CustomerSchema';
import { formatLocationReferenceValueForSchema } from '../schemas/syncTable/LocationSchema';
import { formatOrderReferenceValueForSchema } from '../schemas/syncTable/OrderSchema';
import { formatBlogReferenceValueForSchema } from '../schemas/syncTable/BlogSchema';
import { SyncTableGraphQlContinuation, SyncTableRestContinuation } from '../types/tableSync';

// #endregion

// #region Autocomplete functions
export function makeAutocompleteMetafieldNameKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl({ ownerType }, context);
    const searchObjects = metafieldDefinitions.map((metafield) => {
      return {
        name: metafield.name,
        fullKey: `${metafield.namespace}.${metafield.key}`,
      };
    });
    return coda.autocompleteSearchObjects(search, searchObjects, 'name', 'fullKey');
  };
}

export function makeAutocompleteMetafieldKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl({ ownerType }, context);
    const keys = metafieldDefinitions.map((metafield) => `${metafield.namespace}.${metafield.key}`);
    return coda.simpleAutocomplete(search, keys);
  };
}
// #endregion

// #region Helpers
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
    const fullKey = getMetafieldDefinitionFullKey(fieldDefinition as MetafieldDefinition);
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
      } as coda.Schema & coda.ObjectSchemaProperty;

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

export async function augmentSchemaWithMetafields(
  baseSchema: coda.ObjectSchema<any, any>,
  ownerType: MetafieldOwnerType,
  context: coda.ExecutionContext
) {
  const schema: coda.ObjectSchema<any, any> = { ...baseSchema };

  const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl({ ownerType }, context);
  metafieldDefinitions.forEach((metafieldDefinition) => {
    const name = accents.remove(metafieldDefinition.name);
    const propName = `Meta ${capitalizeFirstChar(name)}`;
    schema.properties[propName] = mapMetaFieldToSchemaProperty(metafieldDefinition);
    // always feature metafields properties so that the user know they are synced
    schema.featuredProperties.push(propName);
  });

  return schema;
}

function getResourceMetafieldsRestApiUrl(context: coda.ExecutionContext, restResource: RestResource, ownerId: number) {
  return `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${restResource.plural}/${ownerId}/metafields.json`;
}

function getResourceMetafieldsAdminUrl(
  context: coda.ExecutionContext,
  restResource: RestResource,
  hasMetafieldDefinition: boolean,
  ownerId: number,
  parentOwnerId?: number
) {
  let admin_url: string;
  switch (restResource.singular) {
    // TODO
    case restResources.Article.singular:
      break;

    case restResources.Blog.singular:
    case restResources.Collection.singular:
    case restResources.Customer.singular:
    case restResources.Order.singular:
    case restResources.Page.singular:
    case restResources.Product.singular:
      admin_url = `${context.endpoint}/admin/${restResource.plural}/${ownerId}/metafields`;
      break;

    case restResources.Location.singular:
      admin_url = `${context.endpoint}/admin/settings/${restResource.plural}/${ownerId}/metafields`;
      break;

    case restResources.ProductVariant.singular:
      if (parentOwnerId) {
        admin_url = `${context.endpoint}/admin/${restResources.Product.plural}/${parentOwnerId}/${restResource.plural}/${ownerId}/metafields`;
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

export function findMatchingMetafieldDefinition(fullKey: string, metafieldDefinitions: MetafieldDefinitionFragment[]) {
  return metafieldDefinitions.find((f) => f && `${f.namespace}.${f.key}` === fullKey);
}
function requireMatchingMetafieldDefinition(fullKey: string, metafieldDefinitions: MetafieldDefinitionFragment[]) {
  const metafieldDefinition = findMatchingMetafieldDefinition(fullKey, metafieldDefinitions);
  if (!metafieldDefinition) throw new Error('MetafieldDefinition not found');
  return metafieldDefinition;
}

export function filterMetafieldDefinitionWithReference(metafieldDefinition: MetafieldDefinitionFragment) {
  return metafieldDefinition.type.name.indexOf('_reference') !== -1;
}

const deleteMetafieldsByKeysRest = async (
  metafieldsToDelete: CodaMetafieldKeyValueSet[],
  ownerId: number,
  ownerResource: RestResource,
  context: coda.ExecutionContext
) => {
  const response = await fetchMetafieldsRest(ownerId, ownerResource, {}, context, 0);
  if (response && response.body.metafields) {
    const promises = metafieldsToDelete.map(async (metafieldKeyValueSet) => {
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
      const metafield = response.body.metafields.find((m) => m.key === metaKey && m.namespace === metaNamespace);
      if (metafield) {
        try {
          await deleteMetafieldRest(metafield.id, context);
        } catch (error) {
          // If the request failed because the server returned a 300+ status code.
          if (coda.StatusCodeError.isStatusCodeError(error)) {
            const statusError = error as coda.StatusCodeError;
            if (statusError.statusCode === 404) {
              console.error(
                `Metafield ${metafieldKeyValueSet.key} not found for resource ${ownerResource.singular} with id ${ownerId}. Possibly already deleted.`
              );
            }
          }
          // The request failed for some other reason. Re-throw the error so that it bubbles up.
          throw error;
        }
      } else {
        console.error(
          `Metafield ${metafieldKeyValueSet.key} not found for resource ${ownerResource.singular} with id ${ownerId}. Possibly already deleted.`
        );
      }

      // If no errors were thrown, then the metafield was deleted.
      return {
        id: metafield?.id,
        namespace: metaNamespace,
        key: metaKey,
        fullKey: metafieldKeyValueSet.key,
        prefixedFullKey: preprendPrefixToMetaFieldKey(metafieldKeyValueSet.key),
      };
    });

    const results = await Promise.all(promises);
    return results.filter((r) => !!r);
  }
};

export async function handleResourceMetafieldsUpdateGraphQl(
  ownerGid: string,
  metafieldKeyValueSets: CodaMetafieldKeyValueSet[],
  context: coda.ExecutionContext
): Promise<{ [key: string]: any }> {
  let obj = {};

  const graphQlResource = graphQlGidToResourceName(ownerGid);
  const metafieldsToDelete = metafieldKeyValueSets.filter((set) => {
    return set.value === null;
  });
  const metafieldsToUpdate = metafieldKeyValueSets.filter((set) => {
    return set.value && set.value !== null;
  });

  if (metafieldsToDelete.length) {
    const restResource = getRestResourceFromGraphQlResourceType(graphQlResource);
    const deletedMetafields = await deleteMetafieldsByKeysRest(
      metafieldsToDelete,
      graphQlGidToId(ownerGid),
      restResource,
      context
    );
    if (deletedMetafields.length) {
      deletedMetafields.forEach((m) => {
        obj[m.prefixedFullKey] = undefined;
      });
    }
  }

  if (metafieldsToUpdate.length) {
    const metafieldsSetInputs = metafieldsToUpdate
      .map((m) => formatMetafieldGraphQlInputFromMetafieldKeyValueSet(ownerGid, m))
      .filter((m) => m);

    const { response: updateResponse } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
    if (updateResponse) {
      const graphQldata = updateResponse.body.data as SetMetafieldsMutation;
      if (graphQldata?.metafieldsSet?.metafields?.length) {
        graphQldata.metafieldsSet.metafields.forEach((metafield) => {
          const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
          obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
        });
      }
    }
  }

  return obj;
}

// Pour les ressources dont les metafields ne peuvent pas être update
// directement dans la requête de la ressource mais seulement par des requêtes
// spécifiques pour chaque metafield
// TODO: faire la fonction équivalente quand on peut update en un seul appel ? CAD une fonction qui gere l'update de la ressource et de ses metafields et qui gere aussi la suppression des metafields
export async function handleResourceMetafieldsUpdateRest(
  ownerId: number,
  ownerResource: RestResource,
  metafieldKeyValueSets: CodaMetafieldKeyValueSet[],
  context: coda.ExecutionContext
): Promise<{ [key: string]: any }> {
  let obj = {};
  const metafieldsToDelete = metafieldKeyValueSets.filter((set) => {
    return set.value === null;
  });
  const metafieldsToUpdate = metafieldKeyValueSets.filter((set) => {
    return set.value && set.value !== null;
  });

  if (metafieldsToDelete.length) {
    const deletedMetafields = await deleteMetafieldsByKeysRest(metafieldsToDelete, ownerId, ownerResource, context);
    if (deletedMetafields.length) {
      deletedMetafields.forEach((m) => {
        obj[m.prefixedFullKey] = undefined;
      });
    }
  }

  if (metafieldsToUpdate.length) {
    const metafieldRestInputs = metafieldsToUpdate.map(formatMetafieldRestInputFromMetafieldKeyValueSet);
    const completed = await Promise.allSettled(
      metafieldRestInputs.map((input) => {
        const url = getResourceMetafieldsRestApiUrl(context, ownerResource, ownerId);
        const payload = {
          metafield: {
            namespace: input.namespace,
            key: input.key,
            type: input.type,
            value: input.value,
          },
        };
        return makePostRequest({ url, payload }, context);
      })
    );

    const metafieldsResults = [];
    completed.forEach((job) => {
      if (job.status === 'fulfilled') {
        if (job.value.body?.metafield) {
          metafieldsResults.push(job.value.body.metafield);
        }
      } else if (job.status === 'rejected') {
        throw new coda.UserVisibleError(job.reason);
      }
    });
    if (metafieldsResults.length) {
      metafieldsResults.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      });
    }
  }

  return obj;
}
// #endregion

// #region Metafield key functions
/**
 * This function checks if a given metafield key is the 'full' one or not.
 * When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
 */
const hasMetafieldFullKey = (metafield: MetafieldFieldsFragment | MetafieldRest | MetafieldDefinitionFragment) =>
  metafield.key.indexOf(metafield.namespace) === 0;

/**
 * A naive way to check if any of the keys might be a metafield key
 */
export function maybeHasMetaFieldKeys(keys: string[]) {
  return keys.some((key) => key.indexOf('.') !== -1);
}

const getMetafieldDefinitionFullKey = (metafieldDefinition: MetafieldDefinitionFragment) =>
  `${metafieldDefinition.namespace}.${metafieldDefinition.key}`;

export function getMetaFieldFullKey(metafield: MetafieldFieldsFragment | MetafieldRest | MetafieldDefinitionFragment) {
  if (hasMetafieldFullKey(metafield)) return metafield.key;
  return `${metafield.namespace}.${metafield.key}`;
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
  metafield: MetafieldFieldsFragment | MetafieldRest | { value: string; type: string }
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
      return formatCollectionReferenceValueForSchema(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_collection_reference:
      return parsedValue.map((v) => formatCollectionReferenceValueForSchema(graphQlGidToId(v)));

    case METAFIELD_TYPES.file_reference:
      return formatFileReferenceValueForSchema(parsedValue);
    case METAFIELD_TYPES.list_file_reference:
      return parsedValue.map(formatFileReferenceValueForSchema);

    case METAFIELD_TYPES.metaobject_reference:
    case METAFIELD_TYPES.mixed_reference:
      return formatMetaobjectReferenceValueForSchema(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_metaobject_reference:
    case METAFIELD_TYPES.list_mixed_reference:
      return parsedValue.map((v) => formatMetaobjectReferenceValueForSchema(graphQlGidToId(v)));

    case METAFIELD_TYPES.page_reference:
      return formatPageReferenceValueForSchema(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_page_reference:
      return parsedValue.map((v) => formatPageReferenceValueForSchema(graphQlGidToId(v)));

    case METAFIELD_TYPES.product_reference:
      return formatProductReferenceValueForSchema(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_product_reference:
      return parsedValue.map((v) => formatProductReferenceValueForSchema(graphQlGidToId(v)));

    case METAFIELD_TYPES.variant_reference:
      return formatProductVariantReferenceValueForSchema(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_variant_reference:
      return parsedValue.map((v) => formatProductVariantReferenceValueForSchema(graphQlGidToId(v)));

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

/**
 * Format a metafield for Metafield Sync Table Schema
 */
export function formatMetafieldForSchemaFromGraphQlApi(
  metafieldNode: MetafieldFragmentWithDefinition,
  ownerNodeGid: string,
  parentOwnerNodeGid: string,
  resourceMetafieldsSyncTableDefinition: ResourceMetafieldsSyncTableDefinition,
  context: coda.ExecutionContext,
  includeHelperColumns = true
) {
  let key = metafieldNode.key;
  // When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
  if (key.indexOf(metafieldNode.namespace) === 0) {
    key = metafieldNode.key.split('.')[1];
  }

  const restResource = getRestResourceFromGraphQlResourceType(resourceMetafieldsSyncTableDefinition.key);
  const ownerId = graphQlGidToId(ownerNodeGid);
  const hasMetafieldDefinition = !!metafieldNode.definition;

  let obj: coda.SchemaType<typeof MetafieldSchema> = {
    admin_graphql_api_id: metafieldNode.id,
    id: graphQlGidToId(metafieldNode.id),
    key: key,
    namespace: metafieldNode.namespace,
    label: `${metafieldNode.namespace}.${key}`,
    owner_id: ownerId,
    owner_type: resourceMetafieldsSyncTableDefinition.key,
    rawValue: metafieldNode.value,
    type: metafieldNode.type,
    created_at: metafieldNode.createdAt,
    updated_at: metafieldNode.updatedAt,
    hasDefinition: !!metafieldNode.definition,
  };

  /**
   * We don't set it at once because parentOwnerId can be necessary but
   * undefined when formatting from a two way sync update (ex: ProductVariants).
   * Since this value is static, we return nothing to prevent erasing the
   * previous value. We could also retrieve the owner id value directly in the
   * graphQl mutation result but doing it this way reduce the GraphQL query costs.
   */
  const maybeAdminUrl = getResourceMetafieldsAdminUrl(
    context,
    restResource,
    hasMetafieldDefinition,
    ownerId,
    parentOwnerNodeGid ? graphQlGidToId(parentOwnerNodeGid) : undefined
  );
  if (maybeAdminUrl) {
    obj.admin_url = maybeAdminUrl;
  }

  switch (resourceMetafieldsSyncTableDefinition.key) {
    // TODO
    case GraphQlResource.Article:
      break;
    // TODO
    case GraphQlResource.Blog:
      obj.owner = formatBlogReferenceValueForSchema(ownerId);
      break;
    case GraphQlResource.Collection:
      obj.owner = formatCollectionReferenceValueForSchema(ownerId);
      break;
    case GraphQlResource.Customer:
      obj.owner = formatCustomerReferenceValueForSchema(ownerId);
      break;
    case GraphQlResource.Location:
      obj.owner = formatLocationReferenceValueForSchema(ownerId);
      break;
    case GraphQlResource.Order:
      obj.owner = formatOrderReferenceValueForSchema(ownerId);
      break;
    // TODO
    case GraphQlResource.Page:
      obj.owner = formatPageReferenceValueForSchema(ownerId);
      break;
    case GraphQlResource.Product:
      obj.owner = formatProductReferenceValueForSchema(ownerId);
      break;
    case GraphQlResource.ProductVariant:
      obj.owner = formatProductVariantReferenceValueForSchema(ownerId);
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
export function getMetafieldKeyValueSetsFromUpdate(
  prefixedMetafieldFromKeys: string[],
  updateNewValue: any,
  metafieldDefinitions: MetafieldDefinitionFragment[]
) {
  return prefixedMetafieldFromKeys.map((fromKey) => {
    const value = updateNewValue[fromKey] as any;
    const realFromKey = removePrefixFromMetaFieldKey(fromKey);
    const metafieldDefinition = requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
    let formattedValue;
    try {
      formattedValue = formatMetafieldValueForApi(
        value,
        metafieldDefinition.type.name as AllMetafieldTypeValue,
        metafieldDefinition.validations
      );
    } catch (error) {
      throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
    }

    return {
      key: realFromKey,
      value: formattedValue === undefined || formattedValue === '' ? null : formattedValue,
      type: metafieldDefinition.type.name as MetafieldTypeValue,
    } as CodaMetafieldKeyValueSet;
  });
}

/**
 * Formate un objet MetafieldRestInput pour Rest Admin API
 * depuis un paramètre Coda utilisant une formule `MetafieldKeyValueSet(…)`
 */
export function formatMetafieldRestInputFromMetafieldKeyValueSet(metafieldKeyValueSet: CodaMetafieldKeyValueSet) {
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
 */
function formatMoneyFieldForApi(amount: number, currency_code: CurrencyCode): ShopifyMoneyField {
  return {
    amount,
    currency_code,
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
export function formatMetafieldValueForApi(
  value: any,
  type: AllMetafieldTypeValue,
  validations?: MetafieldDefinitionFragment['validations']
): string {
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
      // TODO: dynamic get currency_code from shop
      return JSON.stringify(formatMoneyFieldForApi(value, 'EUR' as CurrencyCode));

    // REFERENCE
    case METAFIELD_TYPES.page_reference:
      return idToGraphQlGid(GraphQlResource.Page, value?.id);
    case METAFIELD_TYPES.list_page_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResource.Page, v?.id)));

    case METAFIELD_TYPES.file_reference:
      return value?.id;
    case METAFIELD_TYPES.list_file_reference:
      return JSON.stringify(value.map((v) => v?.id));

    case METAFIELD_TYPES.metaobject_reference:
      return idToGraphQlGid(GraphQlResource.Metaobject, value?.id);
    case METAFIELD_TYPES.list_metaobject_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResource.Metaobject, v?.id)));

    case METAFIELD_TYPES.collection_reference:
      return idToGraphQlGid(GraphQlResource.Collection, value?.id);
    case METAFIELD_TYPES.list_collection_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResource.Collection, v?.id)));

    case METAFIELD_TYPES.product_reference:
      return idToGraphQlGid(GraphQlResource.Product, value?.id);
    case METAFIELD_TYPES.list_product_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResource.Product, v?.id)));

    case METAFIELD_TYPES.variant_reference:
      return idToGraphQlGid(GraphQlResource.ProductVariant, value?.id);
    case METAFIELD_TYPES.list_variant_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResource.ProductVariant, v?.id)));

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
  ownerResource: RestResource,
  filters: {
    /** Show metafields with given namespace */
    namespace?: string;
    /** Show metafields with given key */
    key?: string;
  } = {},
  context: coda.ExecutionContext,
  cacheTtlSecs?: number
) => {
  const params = {};
  if (filters.namespace) {
    params['namespace'] = filters.namespace;
  }
  if (filters.key) {
    params['key'] = filters.key;
  }

  const fetchApiUrl = getResourceMetafieldsRestApiUrl(context, ownerResource, ownerId);
  const requestParams: GetRequestParams = { url: coda.withQueryParams(fetchApiUrl, params) };
  if (cacheTtlSecs !== undefined) {
    requestParams.cacheTtlSecs = cacheTtlSecs;
  }
  return makeGetRequest(requestParams, context);
};

export const fetchSingleMetafieldRest = async (
  params: {
    metafieldId: number;
    cacheTtlSecs?: number;
  },
  context: coda.ExecutionContext
): Promise<coda.FetchResponse<{ metafield: MetafieldRest }>> => {
  const { metafieldId, cacheTtlSecs } = params;
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;

  const requestParams: GetRequestParams = { url };
  if (cacheTtlSecs !== undefined) {
    requestParams.cacheTtlSecs = cacheTtlSecs;
  }
  return makeGetRequest(requestParams, context);
};

export const createResourceMetafieldRest = async (
  resourceId: number,
  restResource: RestResource,
  fullKey: string,
  value: string,
  type: string,
  context: coda.ExecutionContext
) => {
  if (!restResource.supportMetafields) {
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

  return makePostRequest({ url, payload }, context);
};

export const updateResourceMetafieldRest = async (
  metafieldId: number,
  resourceId: number,
  restResource: RestResource,
  value: string,
  context
) => {
  if (!restResource.supportMetafields) {
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

  return makePutRequest({ url, payload }, context);
};

export const deleteMetafieldRest = async (metafieldId: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields/${metafieldId}.json`;
  return makeDeleteRequest({ url }, context);
};

export async function syncRestResourceMetafields(metafieldKeys: string[], context: coda.SyncExecutionContext) {
  const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
  const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  const restResource = getRestResourceFromGraphQlResourceType(graphQlResource);
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;

  let metafieldDefinitions =
    prevContinuation?.extraContinuationData?.metafieldDefinitions ??
    (await fetchMetafieldDefinitionsGraphQl(
      { ownerType: resourceMetafieldsSyncTableDefinition.metafieldOwnerType },
      context
    ));

  const params = cleanQueryParams({
    fields: ['id'].join(', '),
    // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
    // TODO: calculate best possible value based on effectiveMetafieldKeys.length
    limit: 30,
  });

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(
      `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${restResource.plural}.json`,
      params
    );

  let { response, continuation } = await makeSyncTableGetRequest(
    {
      url,
      extraContinuationData: { metafieldDefinitions },
    },
    context
  );
  if (response && response.body[restResource.plural]) {
    // Add metafields by doing multiple Rest Admin API calls
    const items = [];
    await Promise.all(
      response.body[restResource.plural]
        .map((resource) => ({ id: resource.id }))
        .map(async (resource) => {
          const response = await fetchMetafieldsRest(resource.id, restResource, {}, context);
          const metafields: MetafieldRest[] = response.body.metafields;
          metafields
            .filter((m) => metafieldKeys.includes(`${m.namespace}.${m.key}`))
            .forEach((m) => {
              const fullKey = `${m.namespace}.${m.key}`;

              if (metafieldKeys.includes(fullKey)) {
                const matchDefinition = findMatchingMetafieldDefinition(fullKey, metafieldDefinitions);
                items.push(
                  formatMetafieldForSchemaFromGraphQlApi(
                    {
                      id: idToGraphQlGid(GraphQlResource.Metafield, m.id),
                      key: m.key,
                      namespace: m.namespace,
                      type: m.type,
                      value: m.value as string,
                      // @ts-ignore
                      ownerType: m.owner_resource,
                      definition: matchDefinition,
                    },
                    idToGraphQlGid(graphQlResource, m.owner_id),
                    undefined,
                    resourceMetafieldsSyncTableDefinition,
                    context
                  )
                );
              }
            });
        })
    );

    return { result: items, continuation };
  }
}
// #endregion

// #region GraphQL Requests
export const setMetafieldsGraphQl = async (
  metafieldsSetInputs: MetafieldsSetInput[],
  context: coda.ExecutionContext
) => {
  const payload = {
    query: MutationSetMetafields,
    variables: {
      inputs: metafieldsSetInputs,
    } as SetMetafieldsMutationVariables,
  };
  return makeGraphQlRequest({ payload, getUserErrors: (body) => body.data.metafieldsSet.userErrors }, context);
};

export async function fetchMetafieldDefinitionsGraphQl(
  params: {
    ownerType: MetafieldOwnerType;
    cacheTtlSecs?: number;
  },
  context: coda.ExecutionContext
): Promise<MetafieldDefinitionFragment[]> {
  const { ownerType, cacheTtlSecs } = params;
  const maxMetafieldsPerResource = 200;
  const payload = {
    query: queryMetafieldDefinitions,
    variables: {
      ownerType,
      maxMetafieldsPerResource,
    },
  };

  /* Add 'Fake' metafield definitions for SEO metafields */
  const extraDefinitions: MetafieldDefinitionFragment[] = [];
  if (
    [
      MetafieldOwnerType.Page,
      MetafieldOwnerType.Product,
      MetafieldOwnerType.Collection,
      MetafieldOwnerType.Blog,
      MetafieldOwnerType.Article,
    ].includes(ownerType)
  ) {
    extraDefinitions.push({
      id: 'FAKE_META_FIELD_ID',
      name: 'SEO Description',
      namespace: 'global',
      key: 'description_tag',
      type: {
        name: METAFIELD_TYPES.single_line_text_field,
      },
      description: 'The meta description.',
      validations: [],
    });
    extraDefinitions.push({
      id: 'FAKE_META_FIELD_ID',
      name: 'SEO Title',
      namespace: 'global',
      key: 'title_tag',
      type: {
        name: METAFIELD_TYPES.single_line_text_field,
      },
      description: 'The meta title.',
      validations: [],
    });
  }

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: cacheTtlSecs ?? CACHE_SINGLE_FETCH }, context);
  return response.body.data.metafieldDefinitions.nodes.concat(extraDefinitions);
}

/**
 * Get a single Metafield from a specific resource and return the metafield node
 * along with its owner GID
 */
export async function fetchSingleMetafieldGraphQl(
  params: {
    graphQlResource: SupportedGraphQlResourceWithMetafields;
    fullKey: string;
    ownerGid?: string;
    cacheTtlSecs?: number;
  },
  context: coda.ExecutionContext
): Promise<{
  ownerNodeGid: string;
  parentOwnerNodeGid: string;
  metafieldNode: MetafieldFragmentWithDefinition;
}> {
  const { graphQlResource, fullKey, ownerGid, cacheTtlSecs } = params;
  const isShopQuery = graphQlResource === GraphQlResource.Shop;
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

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: cacheTtlSecs ?? CACHE_SINGLE_FETCH }, context);
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
    cacheTtlSecs?: number;
  },
  context: coda.ExecutionContext
): Promise<{
  ownerNodeGid: string;
  parentOwnerNodeGid: string;
  metafieldNodes: MetafieldFragmentWithDefinition[];
}> {
  const { graphQlResource, ownerGid, cacheTtlSecs } = params;
  const isShopQuery = graphQlResource === GraphQlResource.Shop;
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

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: cacheTtlSecs ?? CACHE_SINGLE_FETCH }, context);
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

export async function syncGraphQlResourceMetafields(metafieldKeys: string[], context: coda.SyncExecutionContext) {
  const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
  const isRestSync = graphQlResource === GraphQlResource.Page || graphQlResource === GraphQlResource.Blog;
  if (isRestSync) {
    return syncRestResourceMetafields(metafieldKeys, context);
  }
  // TODO: separate GraphQL function too

  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  // TODO: get an approximation for first run by using count of relation columns ?
  const defaultMaxEntriesPerRun = 50;
  const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
    defaultMaxEntriesPerRun,
    prevContinuation,
    context
  );
  if (shouldDeferBy > 0) {
    return skipGraphQlSyncTableRun(prevContinuation as unknown as SyncTableGraphQlContinuation, shouldDeferBy);
  }

  const isShopQuery = graphQlResource === GraphQlResource.Shop;
  const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  const { syncTableGraphQlQueryOperation: graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;

  const query = isShopQuery ? QueryShopMetafieldsByKeys : makeQueryResourceMetafieldsByKeys(graphQlQueryOperation);

  const payload = {
    query: query,
    variables: {
      metafieldKeys,
      countMetafields: metafieldKeys.length,
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
    },
  };

  const { response, continuation } = await makeSyncTableGraphQlRequest(
    {
      payload,
      maxEntriesPerRun,
      prevContinuation,
      getPageInfo: isShopQuery ? undefined : (data: any) => data[graphQlQueryOperation]?.pageInfo,
    },
    context
  );

  let items: any[];
  if (isShopQuery) {
    items = response.body.data[graphQlQueryOperation].metafields.nodes
      .map((metafieldNode: MetafieldFragmentWithDefinition) =>
        formatMetafieldForSchemaFromGraphQlApi(
          metafieldNode,
          response.body.data[graphQlQueryOperation].id,
          undefined,
          resourceMetafieldsSyncTableDefinition,
          context
        )
      )
      .filter((m) => m);
  } else {
    items = response.body.data[graphQlQueryOperation].nodes
      .map((ownerNode) =>
        ownerNode.metafields.nodes.map((metafieldNode: MetafieldFragmentWithDefinition) =>
          formatMetafieldForSchemaFromGraphQlApi(
            metafieldNode,
            ownerNode.id,
            ownerNode?.parentOwner?.id,
            resourceMetafieldsSyncTableDefinition,
            context
          )
        )
      )
      .flat()
      .filter((m) => m);
  }

  return {
    result: items,
    continuation: continuation,
  };
}
// #endregion

// #region Unused stuff
/*
export async function getMetafieldSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(context.sync.dynamicUrl);
  const metafieldDefinitions = await fetchMetafieldDefinitions(
    resourceMetafieldsSyncTableDefinition.metafieldOwnerType,
    context
  );

  const schema = MetafieldBaseSyncSchema;

  metafieldDefinitions.forEach((fieldDefinition) => {
    const name = accents.remove(fieldDefinition.name);
    const fullKey = getMetafieldDefinitionFullKey(fieldDefinition);
    schema.properties[name] = {
      ...mapMetaFieldToSchemaProperty(fieldDefinition),
      fromKey: fullKey,
      fixedId: fullKey,
    };
  });

  return schema;
}
*/

/*
export function parseMetafieldAndAugmentDefinition(
  metafield: Metafield,
  metafieldDefinitions: MetafieldDefinitionFragment[]
): ParsedMetafieldWithAugmentedDefinition {
  const fullKey = getMetaFieldFullKey(metafield);
  const matchingSchemaKey = preprendPrefixToMetaFieldKey(fullKey);
  const parsedValue = maybeParseJson(metafield?.value);
  const metafieldDefinition = findMatchingMetafieldDefinition(fullKey, metafieldDefinitions);

  return {
    ...metafield,
    value: parsedValue,
    augmentedDefinition: { ...metafieldDefinition, fullKey, matchingSchemaKey },
  };
}
*/

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
export const deleteMetafieldGraphQl = async (
  metafieldDeleteInput: MetafieldDeleteInput,
  context: coda.ExecutionContext
) => {
  const payload = {
    query: MutationDeleteMetafield,
    variables: {
      input: metafieldDeleteInput,
    },
  };
  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.metafieldDelete.userErrors },
    context
  );
  return response;
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
  if (response && response.body.metafields) {
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

/*
export const formatMetafieldRest = (metafield, context) => {
  let obj: coda.SchemaType<typeof MetafieldSchema> = {
    admin_graphql_api_id: metafield.admin_graphql_api_id,
    id: metafield.id,
    key: metafield.key,
    namespace: metafield.namespace,
    label: `${metafield.namespace}.${metafield.key}`,
    owner_id: metafield.owner_id,
    rawValue: metafield.value,
    type: metafield.type,
    created_at: metafield.created_at,
    updated_at: metafield.updated_at,
    // TODO: Rest API can't retrieve definition, needs a separate call
    hasDefinition: undefined,
    // TODO: ça doit pas balancer la même chose que GraphQL
    owner_type: metafield.owner_resource,
  };

  return obj;
};
*/
// #endregion
