import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import { capitalizeFirstChar, getObjectSchemaItemProp, unitToShortName } from '../helpers';
import {
  calcSyncTableMaxEntriesPerRun,
  makeGraphQlRequest,
  handleGraphQlError,
  handleGraphQlUserError,
  makeSyncTableGraphQlRequest,
  graphQlGidToId,
} from '../helpers-graphql';
import {
  CACHE_DAY,
  IDENTITY_COLLECTION,
  IDENTITY_FILE,
  IDENTITY_METAOBJECT,
  IDENTITY_PAGE,
  IDENTITY_PRODUCT,
  IDENTITY_PRODUCT_VARIANT,
  NOT_FOUND,
} from '../constants';
import {
  buildQueryAllMetaObjectsWithFields,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  queryMetaObjectFieldDefinition,
  queryMetaobjectDefinitionByType,
  queryMetaobjectDynamicUrls,
  querySyncTableDetails,
  updateMetaobjectMutation,
} from './metaobjects-graphql';
import { mapMetaobjectFieldToSchemaProperty } from './metaobjects-schema';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { FormatFunction } from '../types/misc';

/**====================================================================================================================
 *    Autocomplete functions
 *===================================================================================================================== */
export async function autocompleteMetaobjectFieldkey(context: coda.ExecutionContext, search: string, args: any) {
  if (!args.id || args.id === '') {
    throw new coda.UserVisibleError(
      'You need to define the GraphQl GID of the metaobject first for autocomplete to work.'
    );
  }
  const results = await getMetaObjectFieldDefinition(args.id, context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'key');
}

/**====================================================================================================================
 *    Formatting functions
 *===================================================================================================================== */
function formatMetaobjectField(value: any, schemaItemProp) {
  const { type, codaType } = schemaItemProp;
  let formattedValue: any;

  // REFERENCE
  if (codaType === coda.ValueHintType.Reference && schemaItemProp.identity?.name) {
    if (!value) return;

    switch (schemaItemProp.identity.name) {
      case IDENTITY_COLLECTION:
        formattedValue = {
          admin_graphql_api_id: value,
          title: NOT_FOUND,
        };
        break;
      case IDENTITY_FILE:
        formattedValue = {
          id: value,
          name: NOT_FOUND,
        };
        break;
      case IDENTITY_METAOBJECT:
        formattedValue = {
          graphql_gid: value,
          name: NOT_FOUND,
        };
        break;
      case IDENTITY_PAGE:
        formattedValue = {
          admin_graphql_api_id: value,
          title: NOT_FOUND,
        };
        break;
      case IDENTITY_PRODUCT:
        formattedValue = {
          id: graphQlGidToId(value),
          title: NOT_FOUND,
        };
        break;
      case IDENTITY_PRODUCT_VARIANT:
        formattedValue = {
          id: graphQlGidToId(value),
          title: NOT_FOUND,
        };
        break;

      default:
        break;
    }
  }
  // MONEY
  else if (codaType === coda.ValueHintType.Currency) {
    formattedValue = value.amount;
  }
  // MEASUREMENT
  else if (type === coda.ValueType.Object && value.value !== undefined && value.unit !== undefined) {
    formattedValue = {
      ...value,
      display: `${value.value}${unitToShortName(value.unit)}`,
    };
  }
  // RATING
  else if (type === coda.ValueType.Number && value.scale_min !== undefined && value.scale_max !== undefined) {
    formattedValue = value.value;
  }
  // TEXT: rich_text_field
  else if (type === coda.ValueType.String && codaType === coda.ValueHintType.Html) {
    formattedValue = convertSchemaToHtml(value);
  } else {
    formattedValue = value;
  }

  return formattedValue;
}

function makeFormatMetaobjectFunction(
  type: string,
  optionalFieldsKeys: string[],
  context: coda.SyncExecutionContext
): FormatFunction {
  return function (node: any) {
    const data = {
      ...node,
      admin_url: `${context.endpoint}/admin/content/entries/${type}/${graphQlGidToId(node.id)}`,
    };
    optionalFieldsKeys.forEach((key) => {
      // check if node[key] has 'value' property
      const value = node[key].hasOwnProperty('value') ? node[key].value : node[key];

      const schemaItemProp = getObjectSchemaItemProp(context.sync.schema, key);

      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        // console.log('not a parsable json string');
      }

      data[key] =
        schemaItemProp.type === coda.ValueType.Array && Array.isArray(parsedValue)
          ? parsedValue.map((v) => formatMetaobjectField(v, schemaItemProp.items))
          : formatMetaobjectField(parsedValue, schemaItemProp);
    });

    return data;
  };
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

  const metaobjectDefinition = await fetchMetaObjectDefinitionByType(type, context);
  const { displayNameKey, fieldDefinitions } = metaobjectDefinition;
  let displayProperty = 'graphql_gid';

  const properties: coda.ObjectSchemaProperties = {
    graphql_gid: { type: coda.ValueType.String, fromKey: 'id', required: true },
    handle: { type: coda.ValueType.String, required: true },
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

export async function getMetaobjectSyncTableDetails(
  metaobjectDefinitionId: string,
  context: coda.SyncExecutionContext
) {
  const payload = { query: querySyncTableDetails, variables: { id: metaobjectDefinitionId } };
  const response = await makeGraphQlRequest({ payload, cacheTtlSecs: CACHE_DAY }, context);

  const { data } = response.body;
  return {
    id: metaobjectDefinitionId,
    type: data.metaobjectDefinition.type,
  };
}

export async function getMetaObjectFieldDefinition(metaObjectGid: string, context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaObjectFieldDefinition,
    variables: {
      id: metaObjectGid,
    },
  };

  const response = await makeGraphQlRequest({ payload }, context);
  return response.body.data.metaobject.definition.fieldDefinitions;
}

export async function fetchMetaObjectDefinitionByType(type: string, context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaobjectDefinitionByType,
    variables: {
      type,
    },
  };

  const response = await makeGraphQlRequest({ payload }, context);
  return response.body.data.metaobjectDefinitionByType;
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
export const syncMetaObjects = async ([defaultMaxEntriesPerRun = 100], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const { type } =
    prevContinuation?.extraContinuationData ?? (await getMetaobjectSyncTableDetails(context.sync.dynamicUrl, context));

  const initialEntriesPerRun = 50;
  let maxEntriesPerRun =
    prevContinuation?.reducedMaxEntriesPerRun ??
    (prevContinuation?.lastThrottleStatus ? calcSyncTableMaxEntriesPerRun(prevContinuation) : initialEntriesPerRun);

  const constantFieldsKeys = ['id']; // will always be fetched
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
      formatFunction: makeFormatMetaobjectFunction(type, optionalFieldsKeys, context),
      maxEntriesPerRun,
      prevContinuation,
      mainDataKey: 'metaobjects',
      extraContinuationData: { type },
    },
    context
  );
};

export const createMetaObject = async ([type, ...varargs], context: coda.ExecutionContext) => {
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

  const response = await makeGraphQlRequest({ payload }, context);

  const { body } = response;
  return body.data.metaobjectCreate.metaobject.id;
};

export const updateMetaObject = async ([id, handle, ...varargs], context: coda.ExecutionContext) => {
  const fields = [];
  while (varargs.length > 0) {
    let key: string, value: string;
    // Pull the first set of varargs off the list, and leave the rest.
    [key, value, ...varargs] = varargs;
    fields.push({ key, value });
  }

  const payload = {
    query: updateMetaobjectMutation,
    variables: {
      id,
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
