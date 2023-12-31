import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';

import {
  capitalizeFirstChar,
  getObjectSchemaItemProp,
  graphQlIdToId,
  graphQlRequest,
  handleGraphQlError,
  handleGraphQlUserError,
  maybeDelayNextExecution,
  unitToShortName,
} from '../helpers';
import {
  IDENTITY_CUSTOM_COLLECTION,
  IDENTITY_FILE,
  IDENTITY_METAOBJECT_NEW,
  IDENTITY_PAGE,
  IDENTITY_PRODUCT,
  IDENTITY_PRODUCT_VARIANT,
  NOT_FOUND,
} from '../constants';
import {
  buildQueryAllMetaObjectsWithFields,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  queryMetaobjectDefinitionByType,
  queryMetaobjectDynamicUrls,
  querySyncTableDetails,
  updateMetaobjectMutation,
} from './metaobjects-graphql';
import { mapMetaobjectFieldToSchemaProperty } from './metaobjects-schema';

export async function autocompleteMetaobjectFieldkey(id: string, context: coda.ExecutionContext, search: string) {
  if (!id || id === '') {
    throw new coda.UserVisibleError(
      'You need to define the GraphQl ID of the metaobject first for autocomplete to work.'
    );
  }
  const results = await fetchMetaObjectFieldDefinition(id, context);
  return coda.autocompleteSearchObjects(search, results, 'name', 'key');
}

function formatMetaobjectField(value: any, schemaItemProp) {
  const { type, codaType } = schemaItemProp;
  let formattedValue = value;

  // REFERENCE
  // console.log('schemaItemProp', JSON.stringify(schemaItemProp));

  if (codaType === coda.ValueHintType.Reference && schemaItemProp.identity?.name) {
    switch (schemaItemProp.identity.name) {
      case IDENTITY_CUSTOM_COLLECTION:
        formattedValue = {
          id: graphQlIdToId(value),
          title: NOT_FOUND,
        };
        break;
      case IDENTITY_FILE:
        formattedValue = {
          id: value,
          name: NOT_FOUND,
        };
        break;
      case IDENTITY_METAOBJECT_NEW:
        formattedValue = {
          graphql_id: value,
          name: NOT_FOUND,
        };
        break;
      case IDENTITY_PAGE:
        formattedValue = {
          id: graphQlIdToId(value),
          title: NOT_FOUND,
        };
        break;
      case IDENTITY_PRODUCT:
        formattedValue = {
          id: graphQlIdToId(value),
          title: NOT_FOUND,
        };
        break;
      case IDENTITY_PRODUCT_VARIANT:
        formattedValue = {
          id: graphQlIdToId(value),
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
  }

  return formattedValue;
}

// TODO: fetch all and not only first 20
export async function listMetaobjectDynamicUrls(context: coda.SyncExecutionContext) {
  const payload = {
    query: queryMetaobjectDynamicUrls,
    variables: {
      cursor: context.sync.continuation,
    },
  };

  const response = await graphQlRequest(context, payload);

  handleGraphQlError(response.body.errors);

  const { myshopifyDomain } = response.body.data.shop;
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
  const { type } = await getSyncTableDetails(context.sync.dynamicUrl, context);
  return `Metaobject_${capitalizeFirstChar(type)}`;
}

export async function getMetaobjectSyncTableDisplayUrl(context) {
  const { myshopifyDomain, type } = await getSyncTableDetails(context.sync.dynamicUrl, context);
  return `https://${myshopifyDomain}/admin/content/entries/${type}`;
}

export async function getMetaobjectSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const { type } = await getSyncTableDetails(context.sync.dynamicUrl, context);

  const metaobjectDefinition = await fetchMetaObjectDefinitionByType(type, context);
  const { displayNameKey, fieldDefinitions } = metaobjectDefinition;
  let displayProperty = 'graphql_id';

  const properties: coda.ObjectSchemaProperties = {
    graphql_id: { type: coda.ValueType.String, fromKey: 'id', required: true },
    handle: { type: coda.ValueType.String, required: true },
  };
  const featuredProperties = ['graphql_id', 'handle'];

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
    idProperty: 'graphql_id',
    featuredProperties,
  });
}

export async function getSyncTableDetails(metaobjectDefinitionId: string, context: coda.SyncExecutionContext) {
  const payload = { query: querySyncTableDetails, variables: { id: metaobjectDefinitionId } };
  const response = await graphQlRequest(context, payload);

  const { data } = response.body;
  return {
    myshopifyDomain: data.shop.myshopifyDomain,
    id: metaobjectDefinitionId,
    type: data.metaobjectDefinition.type,
  };
}

export async function fetchMetaObjectFieldDefinition(metaObjectGid: string, context: coda.ExecutionContext) {
  const query = `
    query metaobject($id: ID!) {
      metaobject(id: $id) {
        definition {
          fieldDefinitions {
            description
            key
            name
            required
            type {
              category
              name
              supportedValidations {
                name
                type
              }
              supportsDefinitionMigrations
            }
            validations {
              name
              type
              value
            }
          }
        }
      }
    }`;

  const payload = {
    query,
    variables: {
      id: metaObjectGid,
    },
  };

  const response = await graphQlRequest(context, payload);

  return response.body.data.metaobject.definition.fieldDefinitions;
}

export async function fetchMetaObjectDefinitionByType(type: string, context: coda.ExecutionContext) {
  const payload = {
    query: queryMetaobjectDefinitionByType,
    variables: {
      type,
    },
  };

  const response = await graphQlRequest(context, payload);

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

  const response = await graphQlRequest(context, payload);
  return response.body.data.metaobjectDefinitions.nodes;
}
*/

export const fetchAllMetaObjects = async ([maxEntriesPerRun = 100], context: coda.SyncExecutionContext) => {
  const { type } = context.sync.continuation ?? (await getSyncTableDetails(context.sync.dynamicUrl, context));
  const cursor = context.sync.continuation?.cursor;

  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const constantFieldsKeys = ['id']; // will always be fetched
  const optionalFieldsKeys = effectivePropertyKeys.filter((key) => !constantFieldsKeys.includes(key));

  const payload = {
    query: buildQueryAllMetaObjectsWithFields(optionalFieldsKeys),
    variables: {
      type: type,
      maxEntriesPerRun,
      cursor,
    },
  };

  const response = await graphQlRequest(context, payload);

  const { body } = response;
  const { data, errors, extensions } = body;

  handleGraphQlError(errors);
  maybeDelayNextExecution(extensions.cost, errors);

  const { nodes, pageInfo } = data.metaobjects;

  const result = nodes.map((node) => {
    const data = {
      ...node,
    };
    optionalFieldsKeys.forEach((key) => {
      // special case for handle key
      const value = key === 'handle' ? node[key] : node[key].value;
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
  });

  return {
    result,
    continuation: pageInfo.hasNextPage
      ? {
          cursor: pageInfo.endCursor,
          type,
        }
      : null,
  };
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

  const response = await graphQlRequest(context, payload);

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

  const response = await graphQlRequest(context, payload);
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

  const response = await graphQlRequest(context, payload);
  const { body } = response;

  return body.data.metaobjectDelete.deletedId;
};
