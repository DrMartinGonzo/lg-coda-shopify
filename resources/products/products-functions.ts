// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import {
  CACHE_DEFAULT,
  DEFAULT_PRODUCT_OPTION_NAME,
  OPTIONS_PRODUCT_STATUS_REST,
  OPTIONS_PUBLISHED_STATUS,
} from '../../constants';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { makeGraphQlRequest } from '../../helpers-graphql';
import { queryProductTypes } from './products-graphql';
import { SimpleRestNew } from '../../Fetchers/SimpleRest';
import { SyncTableRestNew } from '../../Fetchers/SyncTableRest';
import { productFieldDependencies } from '../../schemas/syncTable/ProductSchemaRest';
import { handleFieldDependencies } from '../../helpers';
import { cleanQueryParams } from '../../helpers-rest';

import type { Product } from '../../types/Resources/Product';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import type { FetchRequestOptions } from '../../types/Fetcher';
import type { QueryProductTypesQuery } from '../../types/generated/admin.generated';
import type { Sync_Products } from './products-setup';
import type { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import type { SyncTableType } from '../../types/SyncTable';
import { productResource } from '../allResources';

// #region Class
export type ProductSyncTableType = SyncTableType<
  typeof productResource,
  Product.Row,
  Product.Params.Sync,
  Product.Params.Create,
  Product.Params.Update
>;

export class ProductSyncTable extends SyncTableRestNew<ProductSyncTableType> {
  constructor(fetcher: ProductRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(productResource, fetcher, params);
  }

  setSyncParams() {
    const [
      product_type,
      syncMetafields,
      created_at,
      updated_at,
      published_at,
      status,
      published_status,
      vendor,
      handles,
      ids,
    ] = this.codaParams as SyncTableParamValues<typeof Sync_Products>;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, productFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      handle: handles && handles.length ? handles.join(',') : undefined,
      ids: ids && ids.length ? ids.join(',') : undefined,
      product_type,
      published_status,
      status: status && status.length ? status.join(',') : undefined,
      vendor,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      published_at_min: published_at ? published_at[0] : undefined,
      published_at_max: published_at ? published_at[1] : undefined,
    });
  }
}

export class ProductRestFetcher extends SimpleRestNew<ProductSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(productResource, context);
  }

  validateParams = (params: Product.Params.Sync | Product.Params.Create | Product.Params.Update) => {
    if (params.status) {
      const validStatuses = OPTIONS_PRODUCT_STATUS_REST.map((status) => status.value);
      (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown product status: ' + status);
      });
    }
    if ('title' in params && params.title === '') {
      throw new coda.UserVisibleError("Product title can't be blank");
    }
    if ('published_status' in params) {
      const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
      (Array.isArray(params.published_status) ? params.published_status : [params.published_status]).forEach(
        (published_status) => {
          if (!validPublishedStatuses.includes(published_status))
            throw new coda.UserVisibleError('Unknown published_status: ' + published_status);
        }
      );
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Product.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Product.Params.Update | Product.Params.Create | undefined => {
    let restParams: Product.Params.Update | Product.Params.Create = {};
    let restCreateParams: Product.Params.Create = {};

    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.product_type !== undefined) restParams.product_type = row.product_type;
    if (row.tags !== undefined) restParams.tags = row.tags;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;
    if (row.title !== undefined) restParams.title = row.title;
    if (row.vendor !== undefined) restParams.vendor = row.vendor;
    if (row.status !== undefined) restParams.status = row.status;

    // Create only paramters
    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restCreateParams.metafields = metafieldRestInputs;
    }
    if (row.options !== undefined) {
      restCreateParams.options = row.options
        .split(',')
        .map((str) => str.trim())
        .map((option) => ({ name: option, values: [DEFAULT_PRODUCT_OPTION_NAME] }));

      // We need to add a default variant to the product if some options are defined
      if (restCreateParams.options.length) {
        restCreateParams.variants = [
          {
            option1: DEFAULT_PRODUCT_OPTION_NAME,
            option2: DEFAULT_PRODUCT_OPTION_NAME,
            option3: DEFAULT_PRODUCT_OPTION_NAME,
          },
        ];
      }
    }
    if (row.images !== undefined) {
      restCreateParams.images = row.images.map((url) => ({ src: url }));
    }

    const mergedParams = { ...restParams, ...restCreateParams };

    // Means we have nothing to update/create
    if (Object.keys(mergedParams).length === 0) return undefined;
    return mergedParams;
  };

  formatApiToRow = (product): Product.Row => {
    let obj: Product.Row = {
      ...product,
      admin_url: `${this.context.endpoint}/admin/products/${product.id}`,
      body: striptags(product.body_html),
      status: product.status,
      storeUrl: product.status === 'active' ? `${this.context.endpoint}/products/${product.handle}` : '',
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

  updateWithMetafields = async (
    row: { original?: Product.Row; updated: Product.Row },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<Product.Row> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}
// #endregion

// #region Autocomplete functions
export async function autocompleteProductTypes(context: coda.ExecutionContext, search: string) {
  const productTypes = await fetchProductTypesGraphQl(context);
  return coda.simpleAutocomplete(search, productTypes);
}
// #endregion

// #region GraphQL Requests
export async function fetchProductTypesGraphQl(
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<string[]> {
  const payload = { query: queryProductTypes };
  const { response } = await makeGraphQlRequest<QueryProductTypesQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
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
// #endregion
