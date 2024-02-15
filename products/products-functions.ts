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
  formatMetafieldInputsFromResourceUpdate,
  handleResourceMetafieldsUpdateGraphQl,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { MAX_OPTIONS_PER_PRODUCT, MutationUpdateProduct } from './products-graphql';
import { queryAvailableProductTypes } from './products-storefront';
import { idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';

import type { ProductInput } from '../types/admin.types';
import type {
  MetafieldDefinitionFragment,
  SetMetafieldsMutationVariables,
  UpdateProductMutationVariables,
} from '../types/admin.generated';
import { MutationSetMetafields } from '../metafields/metafields-graphql';
import { ProductSchemaRest } from '../schemas/syncTable/ProductSchemaRest';

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
    (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
      if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown product status: ' + status);
    });
  }
  if (params.title !== undefined && params.title === '') {
    throw new coda.UserVisibleError("Product title can't be blank");
  }
  if (params.published_status) {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    (Array.isArray(params.published_status) ? params.published_status : [params.published_status]).forEach(
      (published_status) => {
        if (!validPublishedStatuses.includes(published_status))
          throw new coda.UserVisibleError('Unknown published_status: ' + published_status);
      }
    );
  }
}

export async function handleProductUpdateJob(
  update: coda.SyncUpdate<string, string, typeof ProductSchemaRest>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);
  let obj = { ...update.previousValue };
  const subJobs: Promise<any>[] = [];
  const productId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: ProductUpdateRestParams = {};
    standardFromKeys.forEach((fromKey) => {
      const value = update.newValue[fromKey];
      let inputKey = fromKey;
      restParams[inputKey] = value;
    });

    subJobs.push(updateProductRest(productId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateGraphQl(
        idToGraphQlGid('Product', productId),
        'product',
        metafieldDefinitions,
        update,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  const [restResponse, metafields] = await Promise.all(subJobs);
  if (restResponse) {
    if (restResponse.body?.product) {
      obj = {
        ...obj,
        ...formatProductForSchemaFromRestApi(restResponse.body.product, context),
      };
    }
  }
  if (metafields) {
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
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
  const payload = { product: { ...restParams } };
  return makePostRequest({ url, payload }, context);
}

export const updateProductRest = async (
  productId: number,
  params: ProductUpdateRestParams,
  context: coda.ExecutionContext
) => {
  const restParams = cleanQueryParams(params);
  validateProductParams(restParams, true);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productId}.json`;
  const payload = { product: restParams };
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
  metafieldDefinitions: MetafieldDefinitionFragment[],
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
  const metafieldsSetsInput = formatMetafieldInputsFromResourceUpdate(
    update,
    prefixedMetafieldFromKeys,
    metafieldDefinitions,
    'forGraphql',
    productGid
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
  metafieldDefinitions: MetafieldDefinitionFragment[],
  update: SyncUpdateNoPreviousValues,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const metafieldsSetInputs = formatMetafieldInputsFromResourceUpdate(
    update,
    prefixedMetafieldFromKeys,
    metafieldDefinitions,
    'forGraphql',
    idToGraphQlGid('Product', productId)
  );

  const payload = {
    query: MutationSetMetafields,
    variables: {
      inputs: metafieldsSetInputs,
    } as SetMetafieldsMutationVariables,
  };

  const { response } = await makeGraphQlRequest(
    { payload, getUserErrors: (body) => body.data.metafieldsSet.userErrors },
    context
  );
  return response;
}
// #endregion

// #region Unused stuff
/**
 * Format product for schema from a GraphQL Admin API response
 */
/*
export const formatProductForSchemaFromGraphQlApi = (
  product: ProductFieldsFragment,
  context: coda.ExecutionContext
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
    const metafields = formatMetafieldsForSchema(product.metafields.nodes);
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
};
*/

/**
 * Check if a product is present in a collection
 */
/*
export const checkProductInCollection = async ([productGid, collectionGid], context: coda.ExecutionContext) => {
  const payload = {
    query: queryProductInCollection,
    variables: {
      collectionId: collectionGid,
      productId: productGid,
    },
  };

  const response = await graphQlRequest({ payload }, context);

  const { body } = response;
  return body.data.collection.hasProduct;
};
*/

/**
 * Sync products using Storefront API
 */
/*
export const syncProductsGraphQlStorefront = async (
  [
    search,
    product_types,
    created_at,
    updated_at,
    syncMetafields,
    // published_at,
    status,
    published_status,
    vendors,
    gift_card,
    ids,
  ],
  context
) => {
  const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const effectiveMetafieldKeys = effectivePropertyKeys
    .filter((key) => key.startsWith(METAFIELD_PREFIX_KEY))
    .map(getMetaFieldRealFromKey);
  const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

  let metafieldDefinitions: MetafieldDefinition[] = [];
  if (shouldSyncMetafields) {
    metafieldDefinitions =
      prevContinuation?.extraContinuationData?.metafieldDefinitions ??
      (await fetchMetafieldDefinitions(MetafieldOwnerType.Product, context));
  }

  const payload = {
    query: makeQueryProductsStorefront,
    variables: {
      cursor: prevContinuation?.cursor ?? null,
      includeMetafields: shouldSyncMetafields,
      metafieldsIdentifiers: effectiveMetafieldKeys.map((key) => {
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(key);
        return {
          key: metaKey,
          namespace: metaNamespace,
        };
      }),
    },
  };

  const { response, continuation } = await makeSyncTableGraphQlRequest(
    {
      payload,
      maxEntriesPerRun: 200,
      prevContinuation,
      extraContinuationData: { metafieldDefinitions },
      getPageInfo: (data: any) => data.products?.pageInfo,
      storeFront: true,
    },
    context
  );
  if (response && response.body.data?.products) {
    const data = response.body.data as GetProductsWithMetafieldsQuery;
    return {
      result: data.products.nodes.map((product) =>
        // TODO: need to normalize metafields result before calling formatting function
        formatProductForSchemaFromGraphQlApi(product, context)
      ),
      continuation,
    };
  } else {
    return {
      result: [],
      continuation,
    };
  }
};
*/
// #endregion
