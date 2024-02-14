// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import {
  CACHE_SINGLE_FETCH,
  FIELD_TYPES,
  METAFIELDS_RESOURCE_TYPES,
  METAFIELD_PREFIX_KEY,
  NOT_FOUND,
  RESOURCE_COLLECTION,
  RESOURCE_METAOBJECT,
  RESOURCE_PAGE,
  RESOURCE_PRODUCT,
  RESOURCE_PRODUCT_VARIANT,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import {
  capitalizeFirstChar,
  extractValueAndUnitFromMeasurementString,
  getUnitMap,
  maybeParseJson,
  unitToShortName,
} from '../helpers';
import { makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import { CollectionReference } from '../schemas/syncTable/CollectionSchema';
import { FileReference } from '../schemas/syncTable/FileSchema';
import { PageReference } from '../schemas/syncTable/PageSchema';
import { ProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { ProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';
import { MutationSetMetafields, queryMetafieldDefinitions } from './metafields-graphql';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields-constants';
import { getMetaobjectReferenceSchema } from '../metaobjects/metaobjects-functions';

import { SyncUpdateNoPreviousValues } from '../types/misc';
import {
  MetafieldOwnerType,
  MetafieldRestInput,
  ResourceMetafieldsSyncTableDefinition,
  ShopifyMeasurementField,
  ShopifyMoneyField,
  ShopifyRatingField,
} from '../types/Metafields';
import { MoneyInput, CurrencyCode, MetafieldsSetInput, MetafieldDefinition } from '../types/admin.types';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import {
  MetafieldDefinitionFragment,
  MetafieldFieldsFragment,
  MetaobjectFieldDefinitionFragment,
  SetMetafieldsMutation,
  SetMetafieldsMutationVariables,
} from '../types/admin.generated';
import { MetafieldSchema } from '../schemas/syncTable/MetafieldSchema';

// #endregion

// #region Autocomplete functions
export function makeAutocompleteMetafieldWithDefinitionsKeys(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(ownerType, context);
    const searchObjects = metafieldDefinitions.map((metafield) => {
      return {
        name: metafield.name,
        fullKey: `${metafield.namespace}.${metafield.key}`,
      };
    });
    return coda.autocompleteSearchObjects(search, searchObjects, 'name', 'fullKey');
  };
}
// #endregion

// #region Helpers
export function mapMetaFieldToSchemaProperty(
  fieldDefinition: MetafieldDefinitionFragment | MetaobjectFieldDefinitionFragment
): coda.Schema & coda.ObjectSchemaProperty {
  const typeName = fieldDefinition.type.name;
  // Check if typeName begins with 'list.' which means it's an array
  // If it is, remove 'list.' from typeName to get 'raw' field type
  const isArray = typeName.startsWith('list.');
  const typeNameNoList = isArray ? typeName.replace('list.', '') : typeName;

  let description = fieldDefinition.description;
  // Add full key to description for metafields, not metaobject fields
  if (fieldDefinition.hasOwnProperty('namespace')) {
    description +=
      (description ? '\n' : '') +
      `field key: [${getMetafieldDefinitionFullKey(fieldDefinition as MetafieldDefinition)}]`;
  }
  const baseProperty = {
    description,
    // TODO: not sure we need to set the key yet as its also set later in augmentSchemaWithMetafields
    fromKey: fieldDefinition.key,
    fixedId: fieldDefinition.key,
  };

  // NON ARRAY PROPERTIES
  if (!isArray) {
    switch (typeName) {
      // TEXT
      case FIELD_TYPES.single_line_text_field:
      case FIELD_TYPES.multi_line_text_field:
      case FIELD_TYPES.json:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          mutable: true,
        };

      case FIELD_TYPES.rich_text_field:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Html,
        };

      // MEASUREMENT
      case FIELD_TYPES.weight:
      case FIELD_TYPES.dimension:
      case FIELD_TYPES.volume:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          mutable: true,
          description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
            getUnitMap(typeNameNoList)
          ).join(', ')}.`,
        };

      // URL
      case FIELD_TYPES.url:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Url,
          mutable: true,
        };

      // COLOR
      case FIELD_TYPES.color:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          mutable: true,
        };

      // RATING
      case FIELD_TYPES.rating:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          // codaType: coda.ValueHintType.Scale,
          // maximum: maximumStr ? parseFloat(maximumStr) : undefined,
          mutable: true,
        };

      // NUMBER
      case FIELD_TYPES.number_integer:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          precision: 0,
          mutable: true,
        };
      case FIELD_TYPES.number_decimal:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          mutable: true,
        };

      // MONEY
      case FIELD_TYPES.money:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          codaType: coda.ValueHintType.Currency,
          mutable: true,
        };

      // TRUE_FALSE
      case FIELD_TYPES.boolean:
        return {
          ...baseProperty,
          type: coda.ValueType.Boolean,
          mutable: true,
        };

      // DATE_TIME
      case FIELD_TYPES.date:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Date,
          mutable: true,
        };

      case FIELD_TYPES.date_time:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.DateTime,
          mutable: true,
        };

      // REFERENCE
      case FIELD_TYPES.collection_reference:
        return {
          ...baseProperty,
          ...CollectionReference,
          mutable: true,
        };
      case FIELD_TYPES.metaobject_reference:
        return {
          ...baseProperty,
          ...getMetaobjectReferenceSchema(fieldDefinition),
          mutable: true,
        };
      case FIELD_TYPES.page_reference:
        return {
          ...baseProperty,
          ...PageReference,
          mutable: true,
        };
      case FIELD_TYPES.product_reference:
        return {
          ...baseProperty,
          ...ProductReference,
          mutable: true,
        };
      case FIELD_TYPES.variant_reference:
        return {
          ...baseProperty,
          ...ProductVariantReference,
          mutable: true,
        };
      case FIELD_TYPES.file_reference:
        return {
          ...baseProperty,
          ...FileReference,
          mutable: true,
        };

      default:
        return { ...baseProperty, type: coda.ValueType.String };
    }
  }

  // ARRAY PROPERTIES
  else {
    switch (typeName) {
      case FIELD_TYPES.list_single_line_text_field:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
        } as coda.Schema & coda.ObjectSchemaProperty;
      case FIELD_TYPES.list_weight:
      case FIELD_TYPES.list_dimension:
      case FIELD_TYPES.list_volume:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
          description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
            getUnitMap(typeNameNoList)
          ).join(', ')}.`,
        };
      case FIELD_TYPES.list_url:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
        };
      case FIELD_TYPES.list_color:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
        };
      case FIELD_TYPES.list_rating:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.Number },
        };
      case FIELD_TYPES.list_number_integer:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.Number, precision: 0 },
        };
      case FIELD_TYPES.list_number_decimal:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.Number },
        };
      case FIELD_TYPES.list_collection_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: CollectionReference,
          mutable: true,
        };
      case FIELD_TYPES.list_metaobject_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: getMetaobjectReferenceSchema(fieldDefinition),
          mutable: true,
        };
      case FIELD_TYPES.list_page_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: PageReference,
          mutable: true,
        };
      case FIELD_TYPES.list_product_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: ProductReference,
          mutable: true,
        };
      case FIELD_TYPES.list_variant_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: ProductVariantReference,
          mutable: true,
        };
      case FIELD_TYPES.list_file_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: FileReference,
          mutable: true,
        };

      // DATE_TIME
      case FIELD_TYPES.list_date:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Date },
        };

      case FIELD_TYPES.list_date_time:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
        };

      default:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
        };
    }
  }
}

export async function augmentSchemaWithMetafields(
  baseSchema: coda.ObjectSchema<any, any>,
  ownerType: MetafieldOwnerType,
  context: coda.ExecutionContext
) {
  const schema: coda.ObjectSchema<any, any> = { ...baseSchema };

  const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(ownerType, context);
  metafieldDefinitions.forEach((metafieldDefinition) => {
    const name = accents.remove(metafieldDefinition.name);
    const fullKey = getMetafieldDefinitionFullKey(metafieldDefinition);
    const matchingSchemaKey = METAFIELD_PREFIX_KEY + fullKey;
    const propName = `Meta ${capitalizeFirstChar(name)}`;

    /* We prefix fromKey to be able to determine later wich columns are metafield values */
    schema.properties[propName] = {
      ...mapMetaFieldToSchemaProperty(metafieldDefinition),
      fromKey: matchingSchemaKey,
      fixedId: matchingSchemaKey,
      // displayName: fullKey,
    };
    // Add eventual choices
    const choicesValidation = metafieldDefinition.validations.find((v) => v.name === 'choices');
    if (choicesValidation && choicesValidation.value) {
      schema.properties[propName]['codaType'] = coda.ValueHintType.SelectList;
      schema.properties[propName]['options'] = JSON.parse(choicesValidation.value);
    }

    // always feature metafields properties so that the user know they are synced
    schema.featuredProperties.push(propName);
  });

  return schema;
}

export function getResourceMetafieldsRestUrl(resourceType: string, resourceId: number, context: coda.ExecutionContext) {
  return `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${resourceType}/${resourceId}/metafields.json`;
}

export function getMetafieldRestEndpointFromRestResourceType(resourceType) {
  switch (resourceType) {
    case 'article':
      return 'articles';
    case 'blog':
      return 'blogs';
    case 'collection':
      return 'collections';
    case 'customer':
      return 'customers';
    case 'draft_order':
      return 'draft_orders';
    case 'location':
      return 'locations';
    case 'order':
      return 'orders';
    case 'page':
      return 'pages';
    case 'product_image':
      return 'product_images';
    case 'product':
      return 'products';
    case 'shop':
      return 'shop';
    case 'variant':
      return 'variants';
    default:
      return resourceType;
  }
}

export const getResourceMetafieldsSyncTableDefinition = (key: string) => {
  const definition = RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.find((v) => v.key === key);
  if (!definition) {
    throw new coda.UserVisibleError('Unknown resource type: ' + key);
  }
  return definition;
};

export function findMatchingMetafieldDefinition(fullKey: string, metafieldDefinitions: MetafieldDefinitionFragment[]) {
  const metafieldDefinition = metafieldDefinitions.find((f) => f && `${f.namespace}.${f.key}` === fullKey);
  if (!metafieldDefinition) throw new Error('MetafieldDefinition not found');
  return metafieldDefinition;
}

export function filterMetafieldDefinitionWithReference(metafieldDefinition: MetafieldDefinitionFragment) {
  return metafieldDefinition.type.name.indexOf('_reference') !== -1;
}

export const deleteMetafieldsByKeysRest = async (
  resourceMetafieldsUrl: string,
  metafieldFromKeys: string[],
  context: coda.ExecutionContext
) => {
  const response = await fetchResourceMetafields(resourceMetafieldsUrl, {}, context, 0);
  if (response && response.body.metafields) {
    const promises = metafieldFromKeys.map(async (fromKey) => {
      const realFromKey = removePrefixFromMetaFieldKey(fromKey);
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
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
                `Metafield ${realFromKey} not found at url ${resourceMetafieldsUrl}. Possibly already deleted.`
              );
            }
          }
          // The request failed for some other reason. Re-throw the error so that it bubbles up.
          throw error;
        }
      } else {
        console.error(`Metafield ${realFromKey} not found at url ${resourceMetafieldsUrl}. Possibly already deleted.`);
      }

      // If no errors were thrown, then the metafield was deleted.
      return {
        id: metafield?.id,
        namespace: metaNamespace,
        key: metaKey,
        fullKey: realFromKey,
        prefixedFullKey: fromKey,
      };
    });

    const results = await Promise.all(promises);
    return results.filter((r) => !!r);
  }
};

export async function handleResourceMetafieldsUpdateGraphQl(
  resourceGid: string,
  // TODO: remove dependency on this variable resourceType
  resourceType: string,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  update: SyncUpdateNoPreviousValues,
  context: coda.ExecutionContext
): Promise<{ [key: string]: any }> {
  let obj = {};
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const prefixedMetafieldsToDelete = prefixedMetafieldFromKeys.filter((fromKey) => {
    const value = update.newValue[fromKey] as any;
    return !value || value === '';
  });
  const prefixedMetafieldsToUpdate = prefixedMetafieldFromKeys.filter(
    (fromKey) => prefixedMetafieldsToDelete.includes(fromKey) === false
  );

  if (prefixedMetafieldsToDelete.length) {
    const deletedMetafields = await deleteMetafieldsByKeysRest(
      getResourceMetafieldsRestUrl(
        getMetafieldRestEndpointFromRestResourceType(resourceType),
        graphQlGidToId(resourceGid),
        context
      ),
      prefixedMetafieldsToDelete,
      context
    );
    if (deletedMetafields.length) {
      deletedMetafields.forEach((m) => {
        obj[m.prefixedFullKey] = undefined;
      });
    }
  }

  if (prefixedMetafieldsToUpdate.length) {
    const metafieldsSetInputs = formatMetafieldInputsFromResourceUpdate(
      update,
      prefixedMetafieldFromKeys,
      metafieldDefinitions,
      'forGraphql',
      resourceGid
    );

    const { response: updateResponse } = await updateMetafieldsGraphQl(metafieldsSetInputs, context);
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
// TODO: Il faudrait renommer la fonction poiur quelque chose de plus descriptif
// TODO: faire la fonction équivalente quand on peut update en un seul appel ? CAD une fonction qui gere l'update de la ressource et de ses metafields et quio gere aussi la suppression des metafields
export async function handleResourceMetafieldsUpdateRest(
  resourceMetafieldsUrl: string,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  update: SyncUpdateNoPreviousValues,
  context: coda.ExecutionContext
): Promise<{ [key: string]: any }> {
  let obj = {};
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const prefixedMetafieldsToDelete = prefixedMetafieldFromKeys.filter((fromKey) => {
    const value = update.newValue[fromKey] as any;
    return !value || value === '';
  });
  const prefixedMetafieldsToUpdate = prefixedMetafieldFromKeys.filter(
    (fromKey) => prefixedMetafieldsToDelete.includes(fromKey) === false
  );

  if (prefixedMetafieldsToDelete.length) {
    const deletedMetafields = await deleteMetafieldsByKeysRest(
      resourceMetafieldsUrl,
      prefixedMetafieldsToDelete,
      context
    );
    if (deletedMetafields.length) {
      deletedMetafields.forEach((m) => {
        obj[m.prefixedFullKey] = undefined;
      });
    }
  }

  if (prefixedMetafieldsToUpdate.length) {
    const metafieldsSetInputs = formatMetafieldInputsFromResourceUpdate(
      update,
      prefixedMetafieldFromKeys,
      metafieldDefinitions,
      'forRest'
    );

    const completed = await Promise.allSettled(
      metafieldsSetInputs.map((input) => {
        const payload = {
          metafield: { namespace: input.namespace, key: input.key, type: input.type, value: input.value },
        };
        return makePostRequest({ url: resourceMetafieldsUrl, payload }, context);
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
export const hasMetafieldFullKey = (metafield: MetafieldFieldsFragment | MetafieldRest | MetafieldDefinitionFragment) =>
  metafield.key.indexOf(metafield.namespace) === 0;

/**
 * A naive way to check if any of the keys might be a metafield key
 */
export function maybeHasMetaFieldKeys(keys: string[]) {
  return keys.some((key) => key.indexOf('.') !== -1);
}

export const getMetafieldDefinitionFullKey = (metafieldDefinition: MetafieldDefinitionFragment) =>
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
    case FIELD_TYPES.single_line_text_field:
    case FIELD_TYPES.multi_line_text_field:
    case FIELD_TYPES.url:
    case FIELD_TYPES.color:
    case FIELD_TYPES.number_integer:
    case FIELD_TYPES.number_decimal:
    case FIELD_TYPES.date:
    case FIELD_TYPES.date_time:
    case FIELD_TYPES.boolean:
    case 'string': // Deprecated metafield type
    case 'integer': // Deprecated metafield type
    case FIELD_TYPES.list_single_line_text_field:
    case FIELD_TYPES.list_url:
    case FIELD_TYPES.list_color:
    case FIELD_TYPES.list_number_integer:
    case FIELD_TYPES.list_number_decimal:
    case FIELD_TYPES.list_date:
    case FIELD_TYPES.list_date_time:
      return parsedValue;

    case FIELD_TYPES.rich_text_field:
      return convertSchemaToHtml(parsedValue);

    case FIELD_TYPES.json:
    case 'json_string': // Deprecated metafield type
      return JSON.stringify(parsedValue);

    // RATING
    case FIELD_TYPES.rating:
      return parsedValue.value;
    case FIELD_TYPES.list_rating:
      return parsedValue.map((v) => v.value);

    // MONEY
    case FIELD_TYPES.money:
      return parsedValue.amount;

    // REFERENCE
    case FIELD_TYPES.file_reference:
      return { id: parsedValue, name: NOT_FOUND };
    case FIELD_TYPES.list_file_reference:
      return parsedValue.map((v) => ({ id: v, name: NOT_FOUND }));

    case FIELD_TYPES.metaobject_reference:
      return { id: graphQlGidToId(parsedValue), name: NOT_FOUND };
    case FIELD_TYPES.list_metaobject_reference:
      return parsedValue.map((v) => ({ id: graphQlGidToId(v), name: NOT_FOUND }));

    case FIELD_TYPES.page_reference:
    case FIELD_TYPES.collection_reference:
    case FIELD_TYPES.product_reference:
    case FIELD_TYPES.variant_reference:
      return { id: graphQlGidToId(parsedValue), title: NOT_FOUND };
    case FIELD_TYPES.list_page_reference:
    case FIELD_TYPES.list_collection_reference:
    case FIELD_TYPES.list_product_reference:
    case FIELD_TYPES.list_variant_reference:
      return parsedValue.map((v) => ({ id: graphQlGidToId(v), title: NOT_FOUND }));

    // MEASUREMENT
    case FIELD_TYPES.weight:
    case FIELD_TYPES.dimension:
    case FIELD_TYPES.volume:
      return `${parsedValue.value}${unitToShortName(parsedValue.unit)}`;
    case FIELD_TYPES.list_weight:
    case FIELD_TYPES.list_dimension:
    case FIELD_TYPES.list_volume:
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
  metafieldNode,
  ownerNodeGid: string,
  resourceMetafieldsSyncTableDefinition: ResourceMetafieldsSyncTableDefinition,
  context: coda.ExecutionContext,
  includeHelperColumns = true
) {
  let key = metafieldNode.key;
  // When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
  if (key.indexOf(metafieldNode.namespace) === 0) {
    key = metafieldNode.key.split('.')[1];
  }

  const ownerId = graphQlGidToId(ownerNodeGid);

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

  const { editMetafieldUrlPart } = resourceMetafieldsSyncTableDefinition;
  switch (resourceMetafieldsSyncTableDefinition.metafieldOwnerType) {
    case MetafieldOwnerType.Article:
      break;
    case MetafieldOwnerType.Blog:
      // obj['owner'] = {
      //   id: ownerId,
      //   title: NOT_FOUND,
      // };
      obj.admin_url = `${context.endpoint}/admin/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Collection:
      obj['owner'] = {
        id: ownerId,
        title: NOT_FOUND,
      };
      obj.admin_url = `${context.endpoint}/admin/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Customer:
      obj['owner'] = {
        id: ownerId,
        title: NOT_FOUND,
      };
      obj.admin_url = `${context.endpoint}/admin/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Location:
      obj['owner'] = {
        id: ownerId,
        name: NOT_FOUND,
      };
      obj.admin_url = `${context.endpoint}/admin/settings/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Order:
      obj['owner'] = {
        id: ownerId,
        name: NOT_FOUND,
      };
      obj.admin_url = `${context.endpoint}/admin/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Page:
      // obj['owner'] = {
      //   id: ownerId,
      //   title: NOT_FOUND,
      // };
      obj.admin_url = `${context.endpoint}/admin/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Product:
      obj['owner'] = {
        id: ownerId,
        title: NOT_FOUND,
      };
      obj.admin_url = `${context.endpoint}/admin/${editMetafieldUrlPart}/${ownerId}/metafields`;
      break;
    case MetafieldOwnerType.Productvariant:
      break;

    default:
      break;
  }
  if (obj.admin_url && !metafieldNode.definition) {
    obj.admin_url += `/unstructured`;
  }

  if (includeHelperColumns) {
    switch (metafieldNode.type) {
      case FIELD_TYPES.collection_reference:
        obj.editCollectionReference = {
          id: graphQlGidToId(metafieldNode.value),
          title: NOT_FOUND,
        };
        break;
      case FIELD_TYPES.list_collection_reference:
        const collectionValues = maybeParseJson(metafieldNode.value);
        if (Array.isArray(collectionValues)) {
          obj.editCollectionReferenceList = collectionValues.map((v) => {
            return {
              id: graphQlGidToId(v),
              title: NOT_FOUND,
            };
          });
        }
        break;

      case FIELD_TYPES.file_reference:
        obj.editFileReference = {
          id: metafieldNode.value,
          name: NOT_FOUND,
        };
        break;
      case FIELD_TYPES.list_file_reference:
        const fileValues = maybeParseJson(metafieldNode.value);
        if (Array.isArray(fileValues)) {
          obj.editFileReferenceList = fileValues.map((v) => {
            return {
              id: v,
              name: NOT_FOUND,
            };
          });
        }
        break;

      case FIELD_TYPES.page_reference:
        obj.editPageReference = {
          id: graphQlGidToId(metafieldNode.value),
          title: NOT_FOUND,
        };
        break;
      case FIELD_TYPES.list_page_reference:
        const pageValues = maybeParseJson(metafieldNode.value);
        if (Array.isArray(pageValues)) {
          obj.editPageReferenceList = pageValues.map((v) => {
            return {
              id: graphQlGidToId(v),
              title: NOT_FOUND,
            };
          });
        }
        break;

      case FIELD_TYPES.product_reference:
        obj.editProductReference = {
          id: graphQlGidToId(metafieldNode.value),
          title: NOT_FOUND,
        };
        break;
      case FIELD_TYPES.list_product_reference:
        const productValues = maybeParseJson(metafieldNode.value);
        if (Array.isArray(productValues)) {
          obj.editProductReferenceList = productValues.map((v) => {
            return {
              id: graphQlGidToId(v),
              title: NOT_FOUND,
            };
          });
        }
        break;

      case FIELD_TYPES.variant_reference:
        obj.editProductVariantReference = {
          id: graphQlGidToId(metafieldNode.value),
          title: NOT_FOUND,
        };
        break;
      case FIELD_TYPES.list_variant_reference:
        const productVariantValues = maybeParseJson(metafieldNode.value);
        if (Array.isArray(productVariantValues)) {
          obj.editProductVariantReferenceList = productVariantValues.map((v) => {
            return {
              id: graphQlGidToId(v),
              title: NOT_FOUND,
            };
          });
        }
        break;

      default:
        break;
    }
  }

  return obj;
}
// #endregion

// #region Format for API

/**
 * Format a Rating cell value for GraphQL Api
 */
export function formatRatingFieldForApi(value: number, scale_min: number, scale_max: number): ShopifyRatingField {
  return {
    scale_min: scale_min,
    scale_max: scale_max,
    value: value,
  };
}

/**
 * Format a Money cell value for GraphQL Api
 */
export function formatMoneyFieldForApi(amount: number, currency_code: CurrencyCode): ShopifyMoneyField {
  return {
    amount,
    currency_code,
  };
}
/**
 * Format a Measurement cell value for GraphQL Api
 * @param string the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param measurementType the measurement field type, can be 'weight', 'dimension' or 'volume'
 */
export function formatMeasurementFieldForApi(string: string, measurementType: string): ShopifyMeasurementField {
  const { value, unit, unitFull } = extractValueAndUnitFromMeasurementString(string, measurementType);
  return {
    value,
    unit: unitFull,
  };
}

/**
 * This function is the same for a metaobject field and a metafield
 * @param propKey the Coda column prop key
 * @param value the Coda column cell value
 * @param fieldDefinition the field definition fetched from Shopify
 * @param codaSchema
 */
export function formatMetafieldValueForApi(
  propKey: string,
  value: any,
  fieldDefinition: MetafieldDefinitionFragment | MetaobjectFieldDefinitionFragment
): string {
  const isArrayApi = fieldDefinition.type.name.startsWith('list.');
  const fieldType = isArrayApi ? fieldDefinition.type.name.replace('list.', '') : fieldDefinition.type.name;

  switch (fieldType) {
    // TEXT
    // URL
    // COLOR
    // NUMBER
    // DATE_TIME
    // TRUE_FALSE
    case FIELD_TYPES.single_line_text_field:
    case FIELD_TYPES.multi_line_text_field:
    case FIELD_TYPES.url:
    case FIELD_TYPES.color:
    case FIELD_TYPES.number_integer:
    case FIELD_TYPES.number_decimal:
    case FIELD_TYPES.date:
    case FIELD_TYPES.date_time:
    case FIELD_TYPES.boolean:
    case FIELD_TYPES.json:
      return isArrayApi ? JSON.stringify(value) : value;

    case FIELD_TYPES.rich_text_field:
      break;

    // RATING
    case FIELD_TYPES.rating:
      const scale_min = parseFloat(fieldDefinition.validations.find((v) => v.name === 'scale_min').value);
      const scale_max = parseFloat(fieldDefinition.validations.find((v) => v.name === 'scale_max').value);
      return JSON.stringify(
        isArrayApi
          ? value.map((v) => formatRatingFieldForApi(v, scale_min, scale_max))
          : formatRatingFieldForApi(value, scale_min, scale_max)
      );

    // MONEY
    case FIELD_TYPES.money:
      // TODO: dynamic get currency_code from shop
      const currencyCode = 'EUR' as CurrencyCode;
      return JSON.stringify(
        isArrayApi
          ? value.map((v) => formatMoneyFieldForApi(v, currencyCode))
          : formatMoneyFieldForApi(value, currencyCode)
      );

    // REFERENCE
    case FIELD_TYPES.page_reference:
      return isArrayApi
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_PAGE, v?.id)))
        : idToGraphQlGid(RESOURCE_PAGE, value?.id);

    case FIELD_TYPES.file_reference:
      return isArrayApi ? JSON.stringify(value.map((v) => v?.id)) : value?.id;

    case FIELD_TYPES.metaobject_reference:
      return isArrayApi
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_METAOBJECT, v?.id)))
        : idToGraphQlGid(RESOURCE_METAOBJECT, value?.id);

    case FIELD_TYPES.collection_reference:
      return isArrayApi
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_COLLECTION, v?.id)))
        : idToGraphQlGid(RESOURCE_COLLECTION, value?.id);

    case FIELD_TYPES.product_reference:
      return isArrayApi
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_PRODUCT, v?.id)))
        : idToGraphQlGid(RESOURCE_PRODUCT, value?.id);

    case FIELD_TYPES.variant_reference:
      return isArrayApi
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_PRODUCT_VARIANT, v?.id)))
        : idToGraphQlGid(RESOURCE_PRODUCT_VARIANT, value?.id);

    // MEASUREMENT
    case FIELD_TYPES.weight:
    case FIELD_TYPES.dimension:
    case FIELD_TYPES.volume:
      return JSON.stringify(
        isArrayApi
          ? value.map((v) => JSON.stringify(formatMeasurementFieldForApi(v, fieldType)))
          : formatMeasurementFieldForApi(value, fieldType)
      );
      break;

    default:
      break;
  }

  throw new coda.UserVisibleError(`Unable to format field for key ${propKey}.`);
}

// TODO: better typing, ça devrait renvoyer MetafieldsSetInput quand l'argument ownerId est fourni et MetafieldRestInput sinon
export function formatMetafieldInputsFromResourceUpdate<T extends 'forGraphql' | 'forRest'>(
  update: SyncUpdateNoPreviousValues,
  metafieldFromKeys: string[],
  metafieldDefinitions: MetafieldDefinitionFragment[],
  type: T,
  ownerGid?: string
): (T extends 'forGraphql' ? MetafieldsSetInput : MetafieldRestInput)[] {
  if (!metafieldFromKeys.length) return [];

  // TODO: il nous faudrait une fonction qui normalise les metafields en rajoutant les prefixes, la definition etc
  return metafieldFromKeys.map((fromKey) => {
    const value = update.newValue[fromKey] as any;
    const realFromKey = removePrefixFromMetaFieldKey(fromKey);
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
    const metafieldDefinition = findMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);

    const obj = {
      key: metaKey,
      namespace: metaNamespace,
      type: metafieldDefinition.type.name,
      value: formatMetafieldValueForApi(fromKey, value, metafieldDefinition),
    };

    if (type === 'forGraphql') {
      (obj as MetafieldsSetInput).ownerId = ownerGid;
    }

    return obj as T extends 'forGraphql' ? MetafieldsSetInput : MetafieldRestInput;
  });
}
// #endregion

// #region Rest requests
export const fetchResourceMetafields = async (
  resourceMetafieldsUrl: string,
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

  const requestOptions: any = { url: coda.withQueryParams(resourceMetafieldsUrl, params) };
  if (cacheTtlSecs !== undefined) {
    requestOptions.cacheTtlSecs = cacheTtlSecs;
  }
  return makeGetRequest(requestOptions, context);
};

// TODO: handle metafield missing when trying to update (because of out of sync values in Coda)
export const createResourceMetafieldRest = async ([resourceId, resourceType, namespace, key, value, type], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }

  const endpointType = getMetafieldRestEndpointFromRestResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${endpointType}/${resourceId}/metafields.json`;
  // edge case
  if (resourceType === 'Shop') {
    url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;
  }

  const value_type = type ?? (value.indexOf('{') === 0 ? 'json_string' : 'string');
  const payload = {
    metafield: {
      namespace,
      key,
      value,
      type: value_type,
    },
  };

  return makePostRequest({ url, payload }, context);
};

export const updateResourceMetafieldRest = async ([metafieldId, resourceId, resourceType, value], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }
  const endpointType = getMetafieldRestEndpointFromRestResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${endpointType}/${resourceId}/metafields/${metafieldId}.json`;
  // edge case
  if (resourceType === 'Shop') {
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

// TODO: handle metafield missing when trying to update (because of out of sync values in Coda)
export const createResourceMetafieldNew = async ([resourceId, resourceType, namespace, key, value, type], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }

  const endpointType = getMetafieldRestEndpointFromRestResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${endpointType}/${resourceId}/metafields.json`;
  // edge case
  if (resourceType === 'Shop') {
    url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;
  }

  // const value_type = type ?? (value.indexOf('{') === 0 ? 'json_string' : 'string');
  const payload = {
    metafield: {
      namespace,
      key,
      value,
      type,
    },
  };

  return makePostRequest({ url, payload }, context);
};

// #endregion

// #region GraphQL Requests
export const updateMetafieldsGraphQl = async (
  metafieldsSetInputs: MetafieldsSetInput[],
  context: coda.ExecutionContext
) => {
  const payload = {
    query: MutationSetMetafields,
    variables: {
      metafieldsSetInputs: metafieldsSetInputs,
    } as SetMetafieldsMutationVariables,
  };
  return makeGraphQlRequest({ payload, getUserErrors: (body) => body.data.metafieldsSet.userErrors }, context);
};

export async function fetchMetafieldDefinitionsGraphQl(
  ownerType: MetafieldOwnerType,
  context: coda.ExecutionContext,
  cacheTtlSecs?: number
): Promise<MetafieldDefinitionFragment[]> {
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
        name: FIELD_TYPES.single_line_text_field,
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
        name: FIELD_TYPES.single_line_text_field,
      },
      description: 'The meta title.',
      validations: [],
    });
  }

  const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: cacheTtlSecs ?? CACHE_SINGLE_FETCH }, context);
  return response.body.data.metafieldDefinitions.nodes.concat(extraDefinitions);
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
