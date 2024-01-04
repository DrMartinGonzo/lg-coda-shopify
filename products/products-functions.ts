import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PRODUCT_STATUS, OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, extractNextUrlPagination, makeGetRequest } from '../helpers-rest';
import { FormatFunction } from '../types/misc';

export const formatProduct: FormatFunction = (product) => {
  product.body = product.body_html;
  if (product.images) {
    const primaryImage = product.images.filter((image) => image.position === 1);
    if (primaryImage.length === 1) {
      product.primary_image = primaryImage[0].src;
    }
  }
  if (product.variants) {
    product.variants = product.variants.map((variant) => {
      return { product_variant_id: variant.id };
    });
  }

  return product;
};

export const fetchProduct = async ([productID], context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products/${productID}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.product) {
    return body.product;
  }
};

export const syncProducts = async (
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
    items = body.products.map(formatProduct);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
