import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import {
  CACHE_SINGLE_FETCH,
  CACHE_TEN_MINUTES,
  METAFIELD_GID_PREFIX_KEY,
  METAFIELD_PREFIX_KEY,
  OPTIONS_PRODUCT_STATUS,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import {
  cleanQueryParams,
  extractNextUrlPagination,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
} from '../helpers-rest';
import { FormatFunction, SyncUpdateNoPreviousValues } from '../types/misc';
import { SyncTableGraphQlContinuation, SyncTableStorefrontContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  formatMetafieldsSetsInputFromResourceUpdate,
  getMetaFieldRealFromKeys,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldKeyAndNamespace,
} from '../metafields/metafields-functions';
import {
  makeMutationUpdateProduct,
  makeQueryProductsAdmin,
  makeQueryProductsStorefront,
  queryAvailableProductTypes,
} from './products-graphql';
import {
  calcSyncTableMaxEntriesPerRun,
  graphQlGidToId,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
} from '../helpers-graphql';
import { getObjectSchemaItemProp } from '../helpers';
import { formatMetaFieldForSchema } from '../metaobjects/metaobjects-functions';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import { ProductSchema } from './products-schema';
import { ShopifyMetafieldDefinition } from '../types/Shopify';

const DEFAULT_PRODUCT_OPTION_NAME = 'Coda Default';

// #region Autocomplete functions
export async function autocompleteProductTypes(context: coda.ExecutionContext, search: string) {
  const productTypes = await getProductTypes(context);
  return coda.simpleAutocomplete(search, productTypes);
}
// #endregion

// #region Formatting functions
function validateProductParams(params: any) {
  if (params.status) {
    const validStatuses = OPTIONS_PRODUCT_STATUS.map((status) => status.value);
    if (params.status && Array.isArray(params.status)) {
      params.status.forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown product status: ' + status);
      });
    }
    if (params.status && typeof params.status === 'string') {
      if (!validStatuses.includes(params.status))
        throw new coda.UserVisibleError('Unknown product status: ' + params.status);
    }
  }
  if (params.title !== undefined && params.title === '') {
    throw new coda.UserVisibleError("Product title can't be blank");
  }
  if (params.published_status) {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (!validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
  }
}

/**
 * Format product for schema from a Rest Admin API response
 */
const formatProductForSchemaFromRestApi: FormatFunction = (product, context) => {
  product.admin_url = `${context.endpoint}/admin/products/${product.id}`;
  product.descriptionHtml = product.body_html;
  product.description = striptags(product.body_html);
  product.featuredImage = product.image?.src;

  if (product.status) {
    product.status = OPTIONS_PRODUCT_STATUS.find(
      (status) => status.value.toLowerCase() === product.status.toLowerCase()
    )?.value;
  }
  if (product.options) {
    product.options = product.options.map((option) => option.name).join(', ');
  }

  return product;
};

/**
 * Format product for schema from a GraphQL Admin API response
 * Must be wrapped with makeFormatProductForSchemaFunction
 */
const formatProductForSchemaFromGraphQlApi = (
  product,
  context: coda.ExecutionContext,
  metaFieldsKeys,
  fieldDefinitions: ShopifyMetafieldDefinition[],
  storeFront?: boolean
) => {
  product.admin_url = `${context.endpoint}/admin/products/${graphQlGidToId(product.id)}`;
  product.description = striptags(product.descriptionHtml);
  product.admin_graphql_api_id = product.id;
  product.id = graphQlGidToId(product.id);
  product.created_at = product.createdAt;
  product.updated_at = product.updatedAt;
  product.published_at = product.publishedAt;
  product.product_type = product.productType;
  if (product.options) {
    product.options = product.options.map((option) => option.name).join(', ');
  }
  if (product.featuredImage) {
    product.featuredImage = product.featuredImage.url;
  }

  if (product.metafields && product.metafields.length) {
    metaFieldsKeys.forEach(async (key) => {
      const { metaKey, metaNamespace } = splitMetaFieldKeyAndNamespace(key);

      // const rawValue = product.metafields.find((f) => f && f.namespace === metaNamespace && f.key === metaKey);
      const rawValue = storeFront
        ? product.metafields.find((f) => f && f.namespace === metaNamespace && f.key === metaKey)
        : product.metafields.find((f) => f && f.key === `${metaNamespace}.${metaKey}`);
      if (!rawValue) return;

      // check if node[key] has 'value' property
      const value = rawValue.hasOwnProperty('value') ? rawValue.value : rawValue;

      const schemaItemProp = getObjectSchemaItemProp(context.sync.schema, METAFIELD_PREFIX_KEY + key);
      const fieldDefinition = fieldDefinitions.find((f) => f && f.namespace === metaNamespace && f.key === metaKey);
      if (!fieldDefinition) throw new Error('fieldDefinition not found');

      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        // console.log('not a parsable json string');
      }

      product[METAFIELD_GID_PREFIX_KEY + key] = rawValue.id;
      product[METAFIELD_PREFIX_KEY + key] =
        schemaItemProp.type === coda.ValueType.Array && Array.isArray(parsedValue)
          ? parsedValue.map((v) => formatMetaFieldForSchema(v, schemaItemProp.items, fieldDefinition))
          : formatMetaFieldForSchema(parsedValue, schemaItemProp, fieldDefinition);
    });
  }

  return product;
};

/**
 * Create actual product formatting function for schema from a GraphQL Admin API response
 */
function makeFormatProductForSchemaFunction(metaFieldsKeys: string[], fieldDefinitions, storeFront?: boolean) {
  return (node: any, context: coda.ExecutionContext) => {
    const data = storeFront
      ? node
      : {
          ...node,
          metafields: node.metafields?.nodes ?? [],
        };

    return formatProductForSchemaFromGraphQlApi(data, context, metaFieldsKeys, fieldDefinitions, storeFront);
  };
}

/**
 * Format ProductInput for a GraphQL product update mutation
 */
function formatGraphQlProductInput(update: any, productGid: string, fromKeys: string[]) {
  const ret = {
    id: productGid,
  };
  if (!fromKeys.length) return ret;

  fromKeys.forEach((fromKey) => {
    const value = update.newValue[fromKey];
    let inputKey = fromKey;
    switch (fromKey) {
      // case 'published_at':
      //   updatedFromKey = 'publishedAt';
      //   break;
      case 'product_type':
        inputKey = 'productType';
        break;
      case 'template_suffix':
        inputKey = 'templateSuffix';
        break;
      default:
        break;
    }
    ret[inputKey] = value;
  });

  return ret;
}
// #endregion

// #region Dynamic SyncTable definition functions
async function getProductSyncTableSchema(context: coda.SyncExecutionContext, _, parameters) {
  const augmentedSchema = await augmentSchemaWithMetafields(ProductSchema, context);
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}
async function getProductSyncTablePropertyOptions(context: coda.PropertyOptionsExecutionContext) {
  if (context.propertyName === 'product_type') {
    return getProductTypes(context);
  }
}
export const getProductSyncTableDynamicOptions: coda.DynamicOptions = {
  getSchema: getProductSyncTableSchema,
  propertyOptions: getProductSyncTablePropertyOptions,
};
// #endregion

// #region Requests
async function getProductTypes(context): Promise<string[]> {
  const payload = { query: queryAvailableProductTypes };
  const response = await makeGraphQlRequest({ payload, storeFront: true, cacheTtlSecs: CACHE_TEN_MINUTES }, context);
  return response.body.data.productTypes.edges.map((edge) => edge.node);
}

async function fetchProduct(productID: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productID}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
}

async function updateProduct(
  productGid: string,
  effectivePropertyKeys: string[],
  effectiveMetafieldKeys: string[],
  metafieldDefinitions: ShopifyMetafieldDefinition[],
  update: SyncUpdateNoPreviousValues,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;

  // Include optional nested fields in the update response. We only request these when necessary as they increase the query cost
  const optionalNestedFields = [];
  if (effectivePropertyKeys.includes('featuredImage')) optionalNestedFields.push('featuredImage');
  if (effectivePropertyKeys.includes('options')) optionalNestedFields.push('options');
  if (metafieldDefinitions.length) {
    optionalNestedFields.push('metafields');
  }

  const { prefixedMetafieldFromKeys, nonMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const productInput = formatGraphQlProductInput(update, productGid, nonMetafieldFromKeys);
  const metafieldsSetsInput = formatMetafieldsSetsInputFromResourceUpdate(
    update,
    productGid,
    prefixedMetafieldFromKeys,
    metafieldDefinitions,
    context.sync.schema
  );

  const payload = {
    query: makeMutationUpdateProduct(optionalNestedFields),
    variables: {
      metafieldsSetsInput,
      productInput,
      metafieldKeys: effectiveMetafieldKeys,
      countMetafields: effectiveMetafieldKeys.length,
    },
  };
  // try {
  const response = await makeGraphQlRequest({ payload }, context);
  // } catch (error) {
  // throw error;
  // }
  const { product } = response.body.data.productUpdate;
  return makeFormatProductForSchemaFunction(effectiveMetafieldKeys, metafieldDefinitions, false)(product, context);
}

async function createProduct(params: any, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products.json`;
  const payload = {
    product: {
      ...params,
    },
  };

  return makePostRequest({ url, payload }, context);
}

async function deleteProduct(productID: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productID}.json`;
  return makeDeleteRequest({ url }, context);
}
// #endregion

// #region Pack functions
export const formulaProduct = async ([productID], context) => {
  const response = await fetchProduct(productID, context);
  if (response.body.product) {
    return formatProductForSchemaFromRestApi(response.body.product, context);
  }
};

export async function actionCreateProduct(
  [
    title,
    descriptionHtml,
    productType,
    options,
    tags,
    vendor,
    status = 'DRAFT',
    handle,
    images,
    imagesUrls,
    templateSuffix,
  ],
  context: coda.ExecutionContext
) {
  if (imagesUrls !== undefined && images !== undefined)
    throw new coda.UserVisibleError("Provide either 'imagesFromCoda' or 'imagesUrls', not both");

  const imagesToUse = imagesUrls ? imagesUrls : images;
  const params = cleanQueryParams({
    title,
    body_html: descriptionHtml,
    productType,
    options: options ? options.map((name) => ({ name, values: [DEFAULT_PRODUCT_OPTION_NAME] })) : undefined,
    tags,
    vendor,
    status,
    handle,
    images: imagesToUse ? imagesToUse.map((url) => ({ src: url })) : undefined,
    imagesUrls,
    templateSuffix,
  });

  validateProductParams(params);

  // TODO: make a function to convert from rest admin api values to graphql api values and vice versa
  // GraphQL status is uppercase, convert it for Rest Admin API
  if (params.status) {
    params.status = status.toLowerCase();
  }

  // We need to add a default variant to the product if some options are defined
  if (params.options) {
    params['variants'] = [
      {
        option1: DEFAULT_PRODUCT_OPTION_NAME,
        option2: DEFAULT_PRODUCT_OPTION_NAME,
        option3: DEFAULT_PRODUCT_OPTION_NAME,
      },
    ];
  }

  const response = await createProduct(params, context);
  return response.body.product.admin_graphql_api_id;
}

export async function actionUpdateProduct(
  [productGid, title, descriptionHtml, product_type, tags, vendor, status, handle, template_suffix],
  context: coda.ExecutionContext
) {
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(ProductSchema);
  const newValue = {
    title,
    descriptionHtml,
    product_type,
    tags,
    vendor,
    status,
    handle,
    template_suffix,
  };
  const updatedFields = Object.keys(newValue).filter((key) => newValue[key] !== undefined);
  const update: SyncUpdateNoPreviousValues = { newValue, updatedFields };
  return updateProduct(productGid, effectivePropertyKeys, [], [], update, context);
}

export async function actionDeleteProduct([productGid], context: coda.ExecutionContext) {
  await deleteProduct(graphQlGidToId(productGid), context);
  return true;
}

/**
 * Sync products using Rest Admin API
 */
export const syncProductsRest = async (
  [
    collection_id,
    created_at_max,
    created_at_min,
    handle,
    ids,
    maxEntriesPerRun,
    presentment_currencies,
    product_type,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    status,
    title,
    updated_at_max,
    updated_at_min,
    vendor,
  ],
  context
) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    collection_id,
    created_at_max,
    created_at_min,
    fields: syncedFields.join(', '),
    handle,
    ids,
    limit: maxEntriesPerRun,
    presentment_currencies,
    product_type,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    status,
    title,
    updated_at_max,
    updated_at_min,
    vendor,
  });

  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
  // TODO: check split value
  if (params.status && !OPTIONS_PRODUCT_STATUS.includes(params.status)) {
    throw new coda.UserVisibleError('Unknown status: ' + params.status);
  }

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products.json`, params);

  const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.products) {
    items = body.products.map((p) => formatProductForSchemaFromRestApi(p, context));
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

/**
 * Sync products using GraphQL Admin API
 */
export const syncProductsGraphQlAdmin = async (
  [
    search,
    product_types,
    created_at,
    updated_at,
    // published_at,
    status,
    published_status,
    vendors,
    gift_card,
    ids,
  ],
  context
) => {
  validateProductParams({ status, published_status });

  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
  const effectiveMetafieldKeys = getMetaFieldRealFromKeys(prefixedMetafieldFromKeys);
  const shouldSyncMetafields = effectiveMetafieldKeys.length;

  // Include optional nested fields. We only request these when necessary as they increase the query cost
  const optionalNestedFields = [];
  if (effectivePropertyKeys.includes('featuredImage')) optionalNestedFields.push('featuredImage');
  if (effectivePropertyKeys.includes('options')) optionalNestedFields.push('options');
  // Metafield optional nested fields
  let fieldDefinitions = [];
  if (shouldSyncMetafields) {
    fieldDefinitions =
      prevContinuation?.extraContinuationData?.fieldDefinitions ??
      (await fetchMetafieldDefinitions('PRODUCT', context));
    optionalNestedFields.push('metafields');
  }

  // TODO: get an approximation for first run by using count of relation columns ?
  const initialEntriesPerRun = 50;
  let maxEntriesPerRun =
    prevContinuation?.reducedMaxEntriesPerRun ??
    (prevContinuation?.lastThrottleStatus ? calcSyncTableMaxEntriesPerRun(prevContinuation) : initialEntriesPerRun);

  const queryFilters = {
    created_at_min: created_at ? created_at[0] : undefined,
    created_at_max: created_at ? created_at[1] : undefined,
    updated_at_min: updated_at ? updated_at[0] : undefined,
    updated_at_max: updated_at ? updated_at[1] : undefined,
    // published_at_min: published_at ? published_at[1] : undefined,
    // published_at_max: published_at ? published_at[1] : undefined,
    gift_card,
    ids,
    status,
    vendors,
    search,
    product_types,
    published_status,
  };

  const payload = {
    query: makeQueryProductsAdmin(optionalNestedFields, queryFilters),
    variables: {
      maxEntriesPerRun,
      cursor: prevContinuation?.cursor ?? null,
      metafieldKeys: effectiveMetafieldKeys,
      countMetafields: effectiveMetafieldKeys.length,
    },
  };

  return makeSyncTableGraphQlRequest(
    {
      payload,
      formatFunction: makeFormatProductForSchemaFunction(effectiveMetafieldKeys, fieldDefinitions, false),
      maxEntriesPerRun: maxEntriesPerRun,
      prevContinuation,
      mainDataKey: 'products',
      extraContinuationData: { fieldDefinitions },
    },
    context
  );
};

/**
 * Execute product updates from Sync table
 */
export async function executeProductsSyncTableUpdate(
  []: coda.ParamValues<coda.ParamDefs>,
  updates: Array<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>>,
  context: coda.UpdateSyncExecutionContext
) {
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const { prefixedMetafieldFromKeys: schemaPrefixedMetafieldFromKeys } =
    separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
  const effectiveMetafieldKeys = getMetaFieldRealFromKeys(schemaPrefixedMetafieldFromKeys);
  const hasMetafieldsInSchema = effectiveMetafieldKeys.length;
  // TODO: fetch metafield definitions only if a metafield update is detected, and not only if metafields are present in the schema
  const metafieldDefinitions = hasMetafieldsInSchema ? await fetchMetafieldDefinitions('PRODUCT', context) : [];

  const jobs = updates.map(async (update) => {
    const productGid = update.previousValue.admin_graphql_api_id as string;
    return updateProduct(
      productGid,
      effectivePropertyKeys,
      effectiveMetafieldKeys,
      metafieldDefinitions,
      update,
      context
    );
  });

  const completed = await Promise.allSettled(jobs);
  return {
    result: completed.map((job) => {
      if (job.status === 'fulfilled') return job.value;
      else return job.reason;
    }),
  };
}
