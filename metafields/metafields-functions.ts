import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';

import {
  METAFIELDS_RESOURCE_TYPES,
  METAFIELD_GID_PREFIX_KEY,
  METAFIELD_PREFIX_KEY,
  RESOURCE_PRODUCT_VARIANT,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { capitalizeFirstChar, getObjectSchemaItemProp, transformToArraySchema } from '../helpers';
import { makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import {
  calcSyncTableMaxEntriesPerRun,
  graphQlGidToId,
  handleGraphQlError,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
} from '../helpers-graphql';
import { FormatFunction } from '../types/misc';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { formatMetaFieldForSchema, formatMetafieldForApi } from '../metaobjects/metaobjects-functions';
import { mapMetaobjectFieldToSchemaProperty } from '../metaobjects/metaobjects-schema';
import { getResourceMetafieldsSyncTableElements } from './metafields-setup';

import {
  makeQueryMetafieldsAdmin,
  makeQueryMetafieldsStorefront,
  makeQueryVariantMetafieldsStorefront,
  queryMetafieldDefinitions,
} from './metafields-graphql';
import { MetafieldBaseSyncSchema } from './metafields-schema';
import { ShopifyMetafieldDefinition } from '../types/Shopify';

/**====================================================================================================================
 *    Metafield key functions
 *===================================================================================================================== */
export function separatePrefixedMetafieldsKeysFromKeys(fromKeys: string[]) {
  const prefixedMetafieldFromKeys = fromKeys.filter(
    (fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY) || fromKey.startsWith(METAFIELD_GID_PREFIX_KEY)
  );
  const nonMetafieldFromKeys = fromKeys.filter((fromKey) => prefixedMetafieldFromKeys.indexOf(fromKey) === -1);

  return { prefixedMetafieldFromKeys, nonMetafieldFromKeys };
}

/**
 * Remove our custom prefix from the metafield keys
 * @param prefixedMetafieldFromKeys array of prefixed metafield keys
 * @returns array of keys without the prefix, i.e. the actual metafield keys
 */
export function getMetaFieldRealFromKeys(prefixedMetafieldFromKeys: string[]) {
  return prefixedMetafieldFromKeys.map((fromKey) =>
    fromKey.replace(METAFIELD_PREFIX_KEY, '').replace(METAFIELD_GID_PREFIX_KEY, '')
  );
}

export function splitMetaFieldKeyAndNamespace(fullKey: string) {
  return {
    metaKey: fullKey.split('.')[1],
    metaNamespace: fullKey.split('.')[0],
  };
}

export const getMetaFieldFullKey = (fieldDefinition: ShopifyMetafieldDefinition) =>
  `${fieldDefinition.namespace}.${fieldDefinition.key}`;

export function formatMetafieldsSetsInputFromResourceUpdate(
  update: any,
  ownerGid: string,
  metafieldFromKeys: string[],
  fieldDefinitions: ShopifyMetafieldDefinition[],
  codaSchema: coda.ArraySchema<coda.Schema>
) {
  if (!metafieldFromKeys.length) return [];

  return metafieldFromKeys.map((fromKey) => {
    const value = update.newValue[fromKey] as string;
    const realFromKey = fromKey.replace(METAFIELD_PREFIX_KEY, '').replace(METAFIELD_GID_PREFIX_KEY, '');
    const { metaKey, metaNamespace } = splitMetaFieldKeyAndNamespace(realFromKey);

    const fieldDefinition = fieldDefinitions.find((f) => f && f.namespace === metaNamespace && f.key === metaKey);
    if (!fieldDefinition) throw new Error('fieldDefinition not found');

    return {
      key: metaKey,
      namespace: metaNamespace,
      ownerId: ownerGid,
      type: fieldDefinition.type.name,
      value: formatMetafieldForApi(fromKey, value, fieldDefinition, codaSchema),
    };
  });
}

function resourceEndpointFromResourceType(resourceType) {
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

/**====================================================================================================================
 *    Formatting functions
 *===================================================================================================================== */
const formatMetafield: FormatFunction = (metafield, context) => {
  if (metafield.namespace && metafield.key) {
    metafield.lookup = `${metafield.namespace}.${metafield.key}`;
  }

  return metafield;
};

interface MetafieldData {
  id: string;
  value: any;
  type: string;
  key: string;
  namespace: string;
  __typename: string;
}
interface NormalizedGraphQLMetafieldsData {
  id: string;
  metafields: MetafieldData[];
}
interface PreprocessDataFunction {
  (data: any): NormalizedGraphQLMetafieldsData[];
}

function preprocessData(
  resourceKey: string,
  graphQlResourceQuery: string,
  storeFront: boolean
): PreprocessDataFunction {
  switch (resourceKey) {
    case RESOURCE_PRODUCT_VARIANT:
      return (data) => data.products.nodes.flatMap((product) => product.variants.nodes);

    default:
      if (storeFront) {
        return (data) => data[graphQlResourceQuery].nodes;
      } else {
        return (data) => {
          const { nodes } = data[graphQlResourceQuery];
          const res = [];
          nodes.forEach((entry) => {
            const ownerId = entry.id;
            const metafields = [];
            Object.keys(entry).forEach((key) => {
              const value = entry[key];
              if (value && value.__typename && value.__typename === 'Metafield') {
                metafields.push(value);
              }
            });
            res.push({ id: ownerId, metafields });
          });
          // console.log('res', res);

          return res;
        };
      }
  }
}

function makeFormatMetaFieldForSchemaFunction(optionalFieldsKeys: string[], fieldDefinitions): FormatFunction {
  return function (node: any, context) {
    // console.log('node', JSON.stringify(node));
    const resourceMetafieldsSyncTableElements = getResourceMetafieldsSyncTableElements(context.sync.dynamicUrl);
    const { adminEntryUrlPart } = resourceMetafieldsSyncTableElements;

    const data = {
      ...node,
      admin_url: `${context.endpoint}/admin/${adminEntryUrlPart}/${graphQlGidToId(node.id)}/metafields`,
    };

    optionalFieldsKeys.forEach(async (key) => {
      const { metaKey, metaNamespace } = splitMetaFieldKeyAndNamespace(key);

      const rawValue = node.metafields.find((f) => f && f.namespace === metaNamespace && f.key === metaKey);
      if (!rawValue) return;

      // check if node[key] has 'value' property
      const value = rawValue.hasOwnProperty('value') ? rawValue.value : rawValue;

      const schemaItemProp = getObjectSchemaItemProp(context.sync.schema, key);
      const fieldDefinition = fieldDefinitions.find((f) => f && f.namespace === metaNamespace && f.key === metaKey);
      if (!fieldDefinition) throw new Error('fieldDefinition not found');

      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        // console.log('not a parsable json string');
      }

      data[key] =
        schemaItemProp.type === coda.ValueType.Array && Array.isArray(parsedValue)
          ? parsedValue.map((v) => formatMetaFieldForSchema(v, schemaItemProp.items, fieldDefinition))
          : formatMetaFieldForSchema(parsedValue, schemaItemProp, fieldDefinition);
    });

    return data;
  };
}

/**====================================================================================================================
 *    Metafield definitions
 *===================================================================================================================== */
export async function fetchMetafieldDefinitions(
  ownerType: string,
  context: coda.SyncExecutionContext
): Promise<ShopifyMetafieldDefinition[]> {
  const maxMetafieldsPerResource = 200;
  const payload = {
    query: queryMetafieldDefinitions,
    variables: {
      ownerType,
      maxMetafieldsPerResource,
    },
  };

  const response = await makeGraphQlRequest({ payload }, context);
  handleGraphQlError(response.body.errors);

  return response.body.data.metafieldDefinitions.nodes;
}

/**====================================================================================================================
 *    Dynamic SyncTable definition functions
 *===================================================================================================================== */
export async function getMetafieldSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const resourceMetafieldsSyncTableElements = getResourceMetafieldsSyncTableElements(context.sync.dynamicUrl);
  const fieldDefinitions = await fetchMetafieldDefinitions(
    resourceMetafieldsSyncTableElements.metafieldOwnerType,
    context
  );
  let displayProperty = 'owner_gid';

  const properties: coda.ObjectSchemaProperties = {
    owner_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the resource owning the metafield.',
      fromKey: 'id',
      fixedId: 'owner_gid',
      required: true,
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metafields in the Shopify admin.',
    },
  };
  const featuredProperties = ['owner_gid', 'admin_url'];

  fieldDefinitions.forEach((fieldDefinition) => {
    const name = accents.remove(fieldDefinition.name);
    const fullKey = `${fieldDefinition.namespace}.${fieldDefinition.key}`;
    properties[name] = {
      ...mapMetaobjectFieldToSchemaProperty(fieldDefinition),
      fromKey: fullKey,
      fixedId: fullKey,
    };
  });

  return coda.makeObjectSchema({
    properties,
    displayProperty,
    idProperty: 'owner_gid',
    featuredProperties,
  });
}

/**====================================================================================================================
 *    Pack functions
 *===================================================================================================================== */
export const syncMetafieldsNew = async ([], context) => {
  const resourceMetafieldsSyncTableElements = getResourceMetafieldsSyncTableElements(context.sync.dynamicUrl);
  const {
    graphQlResourceQuery,
    metafieldOwnerType,
    storeFront,
    key: resourceKey,
  } = resourceMetafieldsSyncTableElements;

  // If executing from CLI, schema is undefined,
  // we retrieve it first and transform it to an array schema
  const schema =
    context.sync.schema ?? transformToArraySchema(await getMetafieldSyncTableSchema(context, undefined, {}));

  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);

  const constantFieldsKeys = ['id']; // will always be fetched
  const calculatedKeys = ['admin_url']; // will never be fetched
  const optionalFieldsKeys = effectivePropertyKeys
    .filter((key) => !constantFieldsKeys.includes(key))
    .filter((key) => !calculatedKeys.includes(key));
  if (!optionalFieldsKeys.length) {
    return {
      result: [],
      continuation: null,
    };
  }

  const fieldDefinitions =
    prevContinuation?.extraContinuationData?.fieldDefinitions ??
    (await fetchMetafieldDefinitions(metafieldOwnerType, context));

  // TODO: get an approximation for first run by using count of relation columns ?
  const initialEntriesPerRun = 50;
  let maxEntriesPerRun = initialEntriesPerRun;
  if (!storeFront) {
    maxEntriesPerRun =
      prevContinuation?.reducedMaxEntriesPerRun ??
      (prevContinuation?.lastThrottleStatus ? calcSyncTableMaxEntriesPerRun(prevContinuation) : initialEntriesPerRun);
  }

  let payload = {};
  if (!storeFront) {
    payload = {
      ...payload,
      query: makeQueryMetafieldsAdmin(graphQlResourceQuery, optionalFieldsKeys),
      variables: {
        batchSize: maxEntriesPerRun,
        cursor: prevContinuation?.cursor ?? null,
      },
    };
  } else {
    payload = {
      ...payload,
      query:
        resourceKey === RESOURCE_PRODUCT_VARIANT
          ? makeQueryVariantMetafieldsStorefront()
          : makeQueryMetafieldsStorefront(graphQlResourceQuery),
      variables: {
        cursor: prevContinuation?.cursor ?? null,
        metafieldsIdentifiers: optionalFieldsKeys.map((key) => {
          const { metaKey, metaNamespace } = getMetaFieldKeyAndNamespaceFromFromKey(key);
          return {
            key: metaKey,
            namespace: metaNamespace,
          };
        }),
      },
    };
  }

  // console.log('payload', payload);

  return makeSyncTableGraphQlRequest(
    {
      payload,
      formatFunction: makeFormatMetaFieldForSchemaFunction(optionalFieldsKeys, fieldDefinitions),
      maxEntriesPerRun,
      prevContinuation,
      mainDataKey: resourceKey === RESOURCE_PRODUCT_VARIANT ? 'products' : graphQlResourceQuery,
      preProcess: preprocessData(resourceKey, graphQlResourceQuery, storeFront),
      extraContinuationData: { fieldDefinitions },
      storeFront: storeFront,
    },
    context
  );
};


  return response.body.data.metafieldDefinitions.nodes;
}
  const { body } = response;

  if (body.metafield) {
    const { metafield } = body;
    return formatMetafield(metafield, context);
  }
};

export const fetchResourceMetafields = async ([resourceId, resourceType], context) => {
  if (resourceId.length == 0) return;

  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }

  const endpointType = resourceEndpointFromResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${endpointType}/${resourceId}/metafields.json`;
  // edge case
  if (resourceType === 'Shop') {
    url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;
  }

  const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  let items = [];
  if (body.metafields) {
    items = body.metafields.map((m) => formatMetafield(m, context));
  }

  return items;
};

// TODO: handle metafield missing when trying to update (because of out of sync values in Coda)
export const createResourceMetafield = async ([resourceId, resourceType, namespace, key, value, type], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }

  const endpointType = resourceEndpointFromResourceType(resourceType);
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

export const updateResourceMetafield = async ([metafieldId, resourceId, resourceType, value], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }
  const endpointType = resourceEndpointFromResourceType(resourceType);
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

export const deleteResourceMetafield = async ([metafieldId], context) => {
  const url = `${context.endpoint}/admin/api/2022-07/metafields/${metafieldId}.json`;
  return makeDeleteRequest({ url }, context);
};
