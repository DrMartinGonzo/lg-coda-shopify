// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FetchRequestOptions } from '../Fetchers/Fetcher.types';
import { GraphQlClient } from '../Clients/GraphQlClient';
import { CACHE_DEFAULT } from '../constants';
import { getProductTypesQuery } from '../graphql/products-graphql';

// #region GraphQL Requests
export async function fetchProductTypesGraphQl(
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<string[]> {
  const documentNode = getProductTypesQuery;

  const graphQlClient = new GraphQlClient({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables: {},
    retries: this.prevContinuation?.retries ?? 0,
    options: { cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
  });

  if (response?.body?.data?.shop?.productTypes?.edges) {
    return response.body.data.shop.productTypes.edges.map((edge) => edge.node);
  }
  return [];
}
// #endregion

// #region Unused stuff
/**
 * Format ProductInput for a GraphQL product update mutation
 */
/*
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
*/

/*
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
  const metafieldKeyValueSets = getMetafieldKeyValueSetsFromUpdate(
    prefixedMetafieldFromKeys,
    update.newValue,
    metafieldDefinitions
  );
  const metafieldsSetsInput = metafieldKeyValueSets.map((m) =>
    formatMetafieldGraphQlInputFromMetafieldKeyValueSet(productGid, m)
  ).filter(Boolean);

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
*/

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
    obj.options = product.options.map((option) => option.name).join(',');
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
// #endregion
