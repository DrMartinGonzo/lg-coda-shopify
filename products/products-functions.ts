import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import type { Product as ProductRest } from '@shopify/shopify-api/rest/admin/2023-10/product';

import {
  CACHE_SINGLE_FETCH,
  CACHE_TEN_MINUTES,
  OPTIONS_PRODUCT_STATUS_GRAPHQL,
  OPTIONS_PRODUCT_STATUS_REST,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { FormatFunction, SyncUpdateNoPreviousValues } from '../types/misc';
import { ProductUpdateRestParams, ProductCreateRestParams } from '../types/Product';
import {
  formatMetafieldsSetsInputFromResourceUpdate,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { MAX_OPTIONS_PER_PRODUCT, MutationUpdateProduct, MutationUpdateProductMetafields } from './products-graphql';
import { queryAvailableProductTypes } from './products-storefront';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import { formatMetafieldsForSchema } from '../metafields/metafields-functions';

import type { Metafield, MetafieldDefinition, ProductInput } from '../types/admin.types';
import type {
  ProductFieldsFragment,
  UpdateProductMetafieldsMutationVariables,
  UpdateProductMutationVariables,
} from '../types/admin.generated';

// #region Autocomplete functions
export async function autocompleteProductTypes(context: coda.ExecutionContext, search: string) {
  const productTypes = await getProductTypes(context);
  return coda.simpleAutocomplete(search, productTypes);
}
// #endregion

// #region helpers
export function validateProductParams(params: any, isRest = false) {
  if (params.status) {
    const validStatuses = (isRest ? OPTIONS_PRODUCT_STATUS_REST : OPTIONS_PRODUCT_STATUS_GRAPHQL).map(
      (status) => status.value
    );
    console.log('validStatuses', validStatuses);
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
// #endregion

// #region Formatting functions
/**
 * Format product for schema from a Rest Admin API response
 */
export const formatProductForSchemaFromRestApi: FormatFunction = (
  product: ProductRest,
  context: coda.ExecutionContext
) => {
  let obj: any = {
    ...product,
    admin_url: `${context.endpoint}/admin/products/${product.id}`,
    body: striptags(product.body_html),
    status: product.status,
    storeUrl: product.status === 'active' ? `${context.endpoint}/products/${product.handle}` : '',
  };

  if (product.options && Array.isArray(product.options)) {
    obj.options = product.options.map((option) => option.name).join(', ');
  }
  if (product.images && Array.isArray(product.images)) {
    obj.featuredImage = product.images.find((image) => image.position === 1)?.src;
    obj.images = product.images.map((image) => image.src);
  }

  return obj;
};

/**
 * Format product for schema from a GraphQL Admin API response
 */
export const formatProductForSchemaFromGraphQlApi = (
  product: ProductFieldsFragment,
  context: coda.ExecutionContext,
  metafieldDefinitions: MetafieldDefinition[]
) => {
  let obj: any = {
    ...product,
    admin_url: `${context.endpoint}/admin/products/${graphQlGidToId(product.id)}`,
    description: striptags(product.descriptionHtml),
    admin_graphql_api_id: product.id,
    id: graphQlGidToId(product.id),
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    published_at: product.publishedAt,
    product_type: product.productType,
  };

  if (product.options) {
    obj.options = product.options.map((option) => option.name).join(', ');
  }
  if (product.featuredImage) {
    obj.featuredImage = product.featuredImage.url;
  }
  if (product?.metafields?.nodes?.length) {
    const metafields = formatMetafieldsForSchema(product.metafields.nodes as Metafield[], metafieldDefinitions);
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
};

/**
 * Format ProductInput for a GraphQL product update mutation
 */
function formatGraphQlProductInput(update: any, productGid: string, fromKeys: string[]): ProductInput {
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

// #region Rest Requests
export function fetchProductRest(productID: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productID}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
}

export function createProductRest(params: ProductCreateRestParams, context: coda.ExecutionContext) {
  const restParams = cleanQueryParams(params);
  validateProductParams(restParams, true);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products.json`;
  const payload = {
    product: {
      ...restParams,
    },
  };

  return makePostRequest({ url, payload }, context);
}

export const updateProductRest = async (
  productId: number,
  params: ProductUpdateRestParams,
  context: coda.ExecutionContext
) => {
  const restParams = cleanQueryParams(params);
  validateProductParams(restParams, true);

  const payload = { product: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productId}.json`;
  return makePutRequest({ url, payload }, context);
};

export function deleteProductRest(productID: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productID}.json`;
  return makeDeleteRequest({ url }, context);
}
// #endregion

// #region GraphQL Requests
export async function getProductTypes(context): Promise<string[]> {
  const payload = { query: queryAvailableProductTypes };
  const { response } = await makeGraphQlRequest(
    { payload, storeFront: true, cacheTtlSecs: CACHE_TEN_MINUTES },
    context
  );
  return response.body.data.productTypes.edges.map((edge) => edge.node);
}

export async function updateProductGraphQl(
  productGid: string,
  effectivePropertyKeys: string[],
  effectiveMetafieldKeys: string[],
  metafieldDefinitions: MetafieldDefinition[],
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

  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const productInput = formatGraphQlProductInput(update, productGid, standardFromKeys);
  const metafieldsSetsInput = formatMetafieldsSetsInputFromResourceUpdate(
    update,
    productGid,
    prefixedMetafieldFromKeys,
    metafieldDefinitions
  );

  const payload = {
    query: MutationUpdateProduct,
    variables: {
      metafieldsSetsInput,
      productInput,
      metafieldKeys: effectiveMetafieldKeys,
      countMetafields: effectiveMetafieldKeys.length,
      maxOptions: MAX_OPTIONS_PER_PRODUCT,
      includeOptions: optionalNestedFields.includes('options'),
      includeFeaturedImage: optionalNestedFields.includes('featuredImage'),
      includeMetafields: optionalNestedFields.includes('metafields'),
    } as UpdateProductMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.productUpdate.userErrors.concat(body.data.metafieldsSet.userErrors) },
    context
  );
  return response;
}

export async function updateProductMetafieldsGraphQl(
  productId: number,
  metafieldDefinitions: MetafieldDefinition[],
  update: SyncUpdateNoPreviousValues,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const metafieldsSetsInput = formatMetafieldsSetsInputFromResourceUpdate(
    update,
    idToGraphQlGid('Product', productId),
    prefixedMetafieldFromKeys,
    metafieldDefinitions
  );

  const payload = {
    query: MutationUpdateProductMetafields,
    variables: {
      metafieldsSetsInput,
    } as UpdateProductMetafieldsMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.metafieldsSet.userErrors },
    context
  );
  return response;
}
// #endregion
