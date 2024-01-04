import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, extractNextUrlPagination, makeGetRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';
import { FormatFunction } from '../types/misc';

export const formatProductVariant: FormatFunction = (variant, context) => {
  if (variant.product_id) {
    variant.product = {
      id: variant.product_id,
    };
  }
  if (variant.image_id && variant.parentProduct.images && variant.parentProduct.images.length > 0) {
    const variantImage = variant.parentProduct.images.filter((image) => image.id === variant.image_id);
    if (variantImage.length === 1) {
      variant.image = variantImage[0].src;
    }
  }

  return variant;
};

export const fetchProductVariant = async ([productVariantID], context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/variants/${productVariantID}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.variant) {
    return body.variant;
  }
};

export const syncProductVariants = async (
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
  // always add variants field
  syncedFields.push('variants');
  // replace product with product_id if present
  const productFieldindex = syncedFields.indexOf('product');
  if (productFieldindex !== -1) {
    syncedFields[productFieldindex] = 'product_id';
  }
  // replace image with images if present
  const ImageFieldindex = syncedFields.indexOf('image');
  if (ImageFieldindex !== -1) {
    syncedFields[ImageFieldindex] = 'images';
  }

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

  // if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
  //   throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  // }
  // // TODO: check split value
  // if (params.status && !OPTIONS_PRODUCT_STATUS.includes(params.status)) {
  //   throw new coda.UserVisibleError('Unknown status: ' + params.status);
  // }

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products.json`, params);
  const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.products) {
    if (body.products) {
      items = body.products.reduce((previous, currProduct) => {
        return previous.concat(
          currProduct.variants.map((variant) =>
            formatProductVariant({ ...variant, parentProduct: currProduct }, context)
          )
        );
      }, []);
    }
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
