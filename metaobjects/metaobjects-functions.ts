import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import {
  capitalizeFirstChar,
  extractValueAndUnitFromMeasurementString,
  getObjectSchemaItemProp,
  unitToShortName,
} from '../helpers';
import {
  calcSyncTableMaxEntriesPerRun,
  makeGraphQlRequest,
  handleGraphQlError,
  handleGraphQlUserError,
  makeSyncTableGraphQlRequest,
  graphQlGidToId,
  idToGraphQlGid,
} from '../helpers-graphql';
import {
  CACHE_DAY,
  CACHE_SINGLE_FETCH,
  FIELD_TYPES,
  IDENTITY_COLLECTION,
  IDENTITY_FILE,
  IDENTITY_METAOBJECT,
  IDENTITY_PAGE,
  IDENTITY_PRODUCT,
  IDENTITY_PRODUCT_VARIANT,
  NOT_FOUND,
  RESOURCE_PRODUCT,
  RESOURCE_PRODUCT_VARIANT,
} from '../constants';
import {
  buildQueryAllMetaObjectsWithFields,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  queryMetaObjectFieldDefinitions,
  queryMetaObjectFieldDefinitionsFromMetaobjectDefinition,
  queryMetaobjectDefinitionsByType,
  queryMetaobjectDynamicUrls,
  queryMetaobjectTypes,
  querySyncTableDetails,
  updateMetaobjectMutation,
} from './metaobjects-graphql';
import { mapMetaobjectFieldToSchemaProperty } from './metaobjects-schema';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { FormatFunction } from '../types/misc';

/**====================================================================================================================
 *    Autocomplete functions
 *===================================================================================================================== */
export async function autocompleteMetaobjectFieldkeyFromMetaobjectGid(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.metaobjectGid || args.metaobjectGid === '') {
    throw new coda.UserVisibleError(
      'You need to define the GraphQl GID of the metaobject first for autocomplete to work.'
    );
  }
  const results = await getMetaObjectFieldDefinitionsByMetaobject(args.metaobjectGid, context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'key');
}
export async function autocompleteMetaobjectFieldkeyFromMetaobjectType(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.type || args.type === '') {
    throw new coda.UserVisibleError('You need to define the type of the metaobject first for autocomplete to work.');
  }
  const results = await getMetaObjectFieldDefinitionsByType(args.type, context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'key');
}
export async function autocompleteMetaobjectType(context: coda.ExecutionContext, search: string, args: any) {
  const results = await getMetaObjectTypes(context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'type');
}

/**====================================================================================================================
 *    Formatting functions
 *===================================================================================================================== */
function formatMetaobjectFieldForSchema(value: any, schemaItemProp, fieldDefinition) {
  if (!value) return;

  const { type, codaType } = schemaItemProp;
  const isArrayCoda = schemaItemProp.type === coda.ValueType.Array && Array.isArray(value);
  const isArrayApi = fieldDefinition.type.name.startsWith('list.');
  const fieldType = isArrayApi ? fieldDefinition.type.name.replace('list.', '') : fieldDefinition.type.name;
  // let formattedValue: any;

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
      return value;

    case FIELD_TYPES.rich_text_field:
      return convertSchemaToHtml(value);

    case FIELD_TYPES.json:
      return JSON.stringify(value);

    // RATING
    case FIELD_TYPES.rating:
      return value.value;

    // MONEY
    case FIELD_TYPES.money:
      return value.amount;

    // REFERENCE
    case FIELD_TYPES.collection_reference:
    case FIELD_TYPES.page_reference:
      return {
        admin_graphql_api_id: value,
        title: NOT_FOUND,
      };
    case FIELD_TYPES.file_reference:
      return {
        id: value,
        name: NOT_FOUND,
      };
    case FIELD_TYPES.metaobject_reference:
      return {
        graphql_gid: value,
        name: NOT_FOUND,
      };
    case FIELD_TYPES.product_reference:
    case FIELD_TYPES.variant_reference:
      return {
        id: graphQlGidToId(value),
        title: NOT_FOUND,
      };

    // MEASUREMENT
    case FIELD_TYPES.weight:
    case FIELD_TYPES.dimension:
    case FIELD_TYPES.volume:
      return `${value.value}${unitToShortName(value.unit)}`;
  }
}

function makeFormatMetaobjectForSchemaFunction(
  type: string,
  optionalFieldsKeys: string[],
  fieldDefinitions,
  context: coda.SyncExecutionContext
): FormatFunction {
  return function (node: any) {
    const data = {
      ...node,
      admin_url: `${context.endpoint}/admin/content/entries/${type}/${graphQlGidToId(node.id)}`,
    };
    optionalFieldsKeys.forEach((key) => {
      // edge case for handle field
      if (key === 'handle') {
        data[key] = node[key].value;
        return;
      }

      // check if node[key] has 'value' property
      const value = node[key].hasOwnProperty('value') ? node[key].value : node[key];

      const schemaItemProp = getObjectSchemaItemProp(context.sync.schema, key);
      const fieldDefinition = fieldDefinitions.find((f) => f.key === key);
      if (!fieldDefinition) throw new Error('fieldDefinition not found');

      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        // console.log('not a parsable json string');
      }

      data[key] =
        schemaItemProp.type === coda.ValueType.Array && Array.isArray(parsedValue)
          ? parsedValue.map((v) => formatMetaobjectFieldForSchema(v, schemaItemProp.items, fieldDefinition))
          : formatMetaobjectFieldForSchema(parsedValue, schemaItemProp, fieldDefinition);
    });

    return data;
  };
}

interface ShopifyRatingField {
  scale_min: number;
  scale_max: number;
  value: number;
}
function formatRatingForApi(value: number, scale_min: number, scale_max: number): ShopifyRatingField {
  return {
    scale_min: scale_min,
    scale_max: scale_max,
    value: value,
  };
}
interface ShopifyMoneyField {
  currency_code: string;
  amount: number;
}
function formatMoneyForApi(amount: number, currency_code: string): ShopifyMoneyField {
  return {
    amount,
    currency_code,
  };
}
interface ShopifyMeasurementField {
  unit: string;
  value: number;
}

/**
 * Format a Measurement cell value for GraphQL Api
 * @param string the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param measurementType the measurement field type, can be 'weight', 'dimension' or 'volume'
 */
function formatMeasurementForApi(
  string: string,
  measurementType: 'weight' | 'dimension' | 'volume'
): ShopifyMeasurementField {
  const { value, unit, unitFull } = extractValueAndUnitFromMeasurementString(string, measurementType);
  return {
    value,
    unit: unitFull,
  };
}

export function formatMetaobjectFieldForApi(
  key: string,
  value: any,
  fieldDefinition,
  codaSchema: coda.ArraySchema<coda.Schema>
) {
  const codaSchemaItemProp = getObjectSchemaItemProp(codaSchema, key);
  const isArrayCoda = codaSchemaItemProp.type === coda.ValueType.Array && Array.isArray(value);
  const isArrayApi = fieldDefinition.type.name.startsWith('list.');
  const isArrayBoth = isArrayCoda && isArrayApi;
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
      return isArrayBoth ? JSON.stringify(value) : value;

    case FIELD_TYPES.rich_text_field:
      break;

    // RATING
    case FIELD_TYPES.rating:
      const scale_min = parseFloat(fieldDefinition.validations.find((v) => v.name === 'scale_min').value);
      const scale_max = parseFloat(fieldDefinition.validations.find((v) => v.name === 'scale_max').value);
      return JSON.stringify(
        isArrayBoth
          ? value.map((v) => formatRatingForApi(v, scale_min, scale_max))
          : formatRatingForApi(value, scale_min, scale_max)
      );

    // MONEY
    case FIELD_TYPES.money:
      // TODO: dynamic get currency_code from shop
      const currencyCode = 'EUR';
      return JSON.stringify(
        isArrayBoth ? value.map((v) => formatMoneyForApi(v, currencyCode)) : formatMoneyForApi(value, currencyCode)
      );

    // REFERENCE
    case FIELD_TYPES.collection_reference:
    case FIELD_TYPES.page_reference:
      return isArrayBoth ? JSON.stringify(value.map((v) => v?.admin_graphql_api_id)) : value?.admin_graphql_api_id;

    case FIELD_TYPES.file_reference:
      return isArrayBoth ? JSON.stringify(value.map((v) => v?.id)) : value?.id;

    case FIELD_TYPES.metaobject_reference:
      return isArrayBoth ? JSON.stringify(value.map((v) => v?.graphql_gid)) : value?.graphql_gid;

    case FIELD_TYPES.product_reference:
      return isArrayBoth
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_PRODUCT, v?.id)))
        : idToGraphQlGid(RESOURCE_PRODUCT, value?.id);

    case FIELD_TYPES.variant_reference:
      return isArrayBoth
        ? JSON.stringify(value.map((v) => idToGraphQlGid(RESOURCE_PRODUCT_VARIANT, v?.id)))
        : idToGraphQlGid(RESOURCE_PRODUCT_VARIANT, value?.id);

    // MEASUREMENT
    case FIELD_TYPES.weight:
    case FIELD_TYPES.dimension:
    case FIELD_TYPES.volume:
      return JSON.stringify(
        isArrayBoth
          ? value.map((v) => JSON.stringify(formatMeasurementForApi(v, fieldType)))
          : formatMeasurementForApi(value, fieldType)
      );
      break;

    default:
      break;
  }

  throw new coda.UserVisibleError(`Unable to format field for key ${key}.`);
}

/**====================================================================================================================
 *    Dynamic SyncTable definition functions
 *===================================================================================================================== */
// TODO: fetch all and not only first 20
export async function getMetaobjectSyncTableDynamicUrls(context: coda.SyncExecutionContext) {
  const payload = {
    query: queryMetaobjectDynamicUrls,
    variables: {
      cursor: context.sync.continuation,
    },
  };

  const response = await makeGraphQlRequest({ payload }, context);

  handleGraphQlError(response.body.errors);

  const metaobjectDefinitions = response.body.data.metaobjectDefinitions.nodes;
  if (metaobjectDefinitions) {
    return (
      metaobjectDefinitions
        // .sort(sortUpdatedAt)
        .map((definition) => ({
          display: definition.name,
          value: definition.id,
        }))
    );
  }
}

export async function getMetaobjectSyncTableName(context: coda.SyncExecutionContext) {
  const { type } = await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context);
  return `Metaobject_${capitalizeFirstChar(type)}`;
}

export async function getMetaobjectSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
  const { type } = await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context);
  return `${context.endpoint}/admin/content/entries/${type}`;
}

export async function getMetaobjectSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const { type } = await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context);

  const metaobjectDefinition = await getMetaObjectDefinitionByType(type, context);
  const { displayNameKey, fieldDefinitions } = metaobjectDefinition;
  let displayProperty = 'graphql_gid';

  const properties: coda.ObjectSchemaProperties = {
    graphql_gid: { type: coda.ValueType.String, fromKey: 'id', required: true },
    handle: { type: coda.ValueType.String, required: true, mutable: true },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metaobject in the Shopify admin.',
    },
  };
  const featuredProperties = ['graphql_gid', 'handle'];

  fieldDefinitions.forEach((fieldDefinition) => {
    const name = accents.remove(fieldDefinition.name);
    properties[name] = mapMetaobjectFieldToSchemaProperty(fieldDefinition);

    if (displayNameKey === fieldDefinition.key) {
      displayProperty = name;
      properties[name].required = true;
      featuredProperties.unshift(displayProperty);
    }
  });

  return coda.makeObjectSchema({
    properties,
    displayProperty,
    idProperty: 'graphql_gid',
    featuredProperties,
  });
}

/**====================================================================================================================
 *    Metaobject types
 *===================================================================================================================== */
// TODO: fetch all and not only first 20
export async function getMetaObjectTypes(context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaobjectTypes,
    variables: {
      cursor: undefined,
    },
  };
  const response = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinitions.nodes.map((node) => {
    return {
      name: node.name,
      type: node.type,
    };
  });
}

// TODO: maybe return type directly and rename to getMetaObjectTypeFromMetaobjectDefinition
export async function getMetaobjectSyncTableDetails(
  metaobjectDefinitionId: string,
  context: coda.SyncExecutionContext
) {
  const payload = { query: querySyncTableDetails, variables: { id: metaobjectDefinitionId } };
  const response = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_DAY }, context);

  const { data } = response.body;
  return {
    type: data.metaobjectDefinition.type,
  };
}

/**====================================================================================================================
 *    Metaobject definitions
 *===================================================================================================================== */
export async function getMetaObjectDefinitionByType(type: string, context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaobjectDefinitionsByType,
    variables: {
      type,
    },
  };

  const response = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinitionByType;
}

/**====================================================================================================================
 *    Field definitions
 *===================================================================================================================== */
export async function getMetaObjectFieldDefinitionsByMetaobjectDefinition(
  metaObjectDefinitionGid: string,
  context: coda.ExecutionContext
) {
  const payload = {
    query: queryMetaObjectFieldDefinitionsFromMetaobjectDefinition,
    variables: {
      id: metaObjectDefinitionGid,
    },
  };
  const response = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobjectDefinition.fieldDefinitions;
}

export async function getMetaObjectFieldDefinitionsByMetaobject(metaObjectGid: string, context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaObjectFieldDefinitions,
    variables: {
      id: metaObjectGid,
    },
  };
  const response = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
  return response.body.data.metaobject.definition.fieldDefinitions;
}

export async function getMetaObjectFieldDefinitionsByType(type: string, context: coda.ExecutionContext) {
  const metaobjectDefinitionByType = await getMetaObjectDefinitionByType(type, context);
  return metaobjectDefinitionByType.fieldDefinitions;
}

/*
async function fetchAllMetaObjectDefinitions(batchSize = 20, context: coda.ExecutionContext) {
  const payload = {
    query: queryAllMetaobjectDefinitions,
    variables: {
      batchSize,
      cursor: context.sync.continuation,
    },
  };

  const response = await graphQlRequest({payload}, context);
  return response.body.data.metaobjectDefinitions.nodes;
}
*/

/**====================================================================================================================
 *    Pack functions
 *===================================================================================================================== */
export const syncMetaObjects = async ([], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const { type } =
    prevContinuation?.extraContinuationData ?? (await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context));
  const fieldDefinitions =
    prevContinuation?.extraContinuationData?.fieldDefinitions ??
    (await getMetaObjectFieldDefinitionsByMetaobjectDefinition(context.sync.dynamicUrl, context));

  // TODO: get an approximation for first run by using count of relation columns ?
  const initialEntriesPerRun = 50;
  let maxEntriesPerRun =
    prevContinuation?.reducedMaxEntriesPerRun ??
    (prevContinuation?.lastThrottleStatus ? calcSyncTableMaxEntriesPerRun(prevContinuation) : initialEntriesPerRun);

  const constantFieldsKeys = ['id']; // will always be fetched
  // TODO, like with field dependencies, we should have an array below each schema defining the things that can be queried via graphql, with maybe a translation of keys between rest and graphql …
  const calculatedKeys = ['admin_url']; // will never be fetched
  const optionalFieldsKeys = effectivePropertyKeys
    .filter((key) => !constantFieldsKeys.includes(key))
    .filter((key) => !calculatedKeys.includes(key));

  const payload = {
    query: buildQueryAllMetaObjectsWithFields(optionalFieldsKeys),
    variables: {
      type: type,
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
    },
  };

  return makeSyncTableGraphQlRequest(
    {
      payload,
      formatFunction: makeFormatMetaobjectForSchemaFunction(type, optionalFieldsKeys, fieldDefinitions, context),
      maxEntriesPerRun,
      prevContinuation,
      mainDataKey: 'metaobjects',
      extraContinuationData: { type, fieldDefinitions },
    },
    context
  );
};

export const createMetaObject = async ([type, handle, ...varargs], context: coda.ExecutionContext) => {
  const fields = [];
  while (varargs.length > 0) {
    let key: string, value: string;
    // Pull the first set of varargs off the list, and leave the rest.
    [key, value, ...varargs] = varargs;
    fields.push({ key, value });
  }

  const payload = {
    query: createMetaobjectMutation,
    variables: {
      metaobject: {
        type,
        capabilities: {
          publishable: {
            status: 'ACTIVE',
          },
        },
        fields,
      },
    },
  };
  if (handle && handle !== '') {
    payload.variables.metaobject['handle'] = handle;
  }

  const response = await makeGraphQlRequest({ payload }, context);

  const { body } = response;
  return body.data.metaobjectCreate.metaobject.id;
};

export const updateMetaObject = async (
  metaobjectGid: string,
  handle: string,
  fields: { key: string; value: string }[],
  context: coda.ExecutionContext
) => {
  const payload = {
    query: updateMetaobjectMutation,
    variables: {
      id: metaobjectGid,
      metaobject: {
        capabilities: {
          publishable: {
            status: 'ACTIVE',
          },
        },
        fields,
      },
    },
  };

  if (handle && handle !== '') {
    payload.variables.metaobject['handle'] = handle;
  }

  const response = await makeGraphQlRequest({ payload }, context);
  const { body } = response;

  handleGraphQlUserError(body.data.metaobjectUpdate.userErrors);

  return body.data.metaobjectUpdate.metaobject.id;
};

export const deleteMetaObject = async ([id], context: coda.ExecutionContext) => {
  const payload = {
    query: deleteMetaobjectMutation,
    variables: {
      id,
    },
  };

  const response = await makeGraphQlRequest({ payload }, context);
  const { body } = response;

  return body.data.metaobjectDelete.deletedId;
};
