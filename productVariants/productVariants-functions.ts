import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import {
  CACHE_SINGLE_FETCH,
  OPTIONS_PRODUCT_STATUS_REST,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { ProductVariantCreateRestParams, ProductVariantUpdateRestParams } from '../types/ProductVariant';
import { ProductVariantSchema } from '../schemas/syncTable/ProductVariantSchema';
import { MetafieldDefinition } from '../types/admin.types';
import {
  handleResourceMetafieldsUpdateGraphQl,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { idToGraphQlGid } from '../helpers-graphql';
import { MetafieldDefinitionFragment } from '../types/admin.generated';

// #region Validate functions
export function validateProductVariantParams(params: any) {
  if (params.status) {
    const validStatuses = OPTIONS_PRODUCT_STATUS_REST.map((status) => status.value);
    (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
      if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown product status: ' + status);
    });
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
// #endregion

// #region helpers
export async function handleProductVariantUpdateJob(
  update: coda.SyncUpdate<string, string, typeof ProductVariantSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);
  let obj = { ...update.previousValue };
  const subJobs: Promise<any>[] = [];
  const productVariantId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: ProductVariantUpdateRestParams = {};
    standardFromKeys.forEach((fromKey) => {
      const value = update.newValue[fromKey];
      let inputKey = fromKey;
      restParams[inputKey] = value;
    });

    subJobs.push(updateProductVariantRest(productVariantId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateGraphQl(
        idToGraphQlGid('ProductVariant', productVariantId),
        'variant',
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
    if (restResponse.body?.variant) {
      obj = {
        ...obj,
        ...formatProductVariantForSchemaFromRestApi(restResponse.body.variant, {}, context),
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
export const formatProductVariantForSchemaFromRestApi = (variant, parentProduct, context) => {
  let obj: any = {
    ...variant,
    admin_url: `${context.endpoint}/admin/products/${variant.product_id}/variants/${variant.id}`,
    product: {
      id: variant.product_id,
      title: parentProduct?.title,
    },
    displayTitle: parentProduct?.title ? `${parentProduct.title} - ${variant.title}` : variant.title,
  };

  if (parentProduct?.status === 'active' && parentProduct?.handle) {
    obj.storeUrl = `${context.endpoint}/products/${parentProduct.handle}?variant=${variant.id}`;
  }
  if (variant.image_id && parentProduct?.images && parentProduct?.images.length > 0) {
    obj.image = parentProduct.images.find((image) => image.id === variant.image_id)?.src;
  }

  return obj;
};
// #endregion

// #region Rest requests
export function fetchProductVariantRest(productVariantID: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/variants/${productVariantID}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
}

export function createProductVariantRest(params: ProductVariantCreateRestParams, context: coda.ExecutionContext) {
  const restParams = cleanQueryParams(params);
  validateProductVariantParams(restParams);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${params.product_id}/variants.json`;
  const payload = { variant: { ...restParams } };
  return makePostRequest({ url, payload }, context);
}

export const updateProductVariantRest = async (
  productVariantId: number,
  params: ProductVariantUpdateRestParams,
  context: coda.ExecutionContext
) => {
  const restParams = cleanQueryParams(params);
  validateProductVariantParams(restParams);

  const payload = { variant: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/variants/${productVariantId}.json`;
  return makePutRequest({ url, payload }, context);
};

export function deleteProductVariantRest(productVariantID: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/variants/${productVariantID}.json`;
  return makeDeleteRequest({ url }, context);
}
// #endregion
