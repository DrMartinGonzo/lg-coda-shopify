import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PRODUCT_STATUS, OPTIONS_PUBLISHED_STATUS } from '../constants';
import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder } from '../helpers';

export const formatProduct = (product) => {
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
  const response = await context.fetcher.fetch({
    method: 'GET',
    url: `${context.endpoint}/admin/api/2022-07/products/${productID}.json`,
    cacheTtlSec: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.product) {
    return body.product;
  }
};

export const fetchAllProducts = async (
  [
    collection_id,
    created_at_max,
    created_at_min,
    fields,
    handle,
    ids,
    limit,
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
  const params = cleanQueryParams({
    collection_id,
    created_at_max,
    created_at_min,
    fields,
    handle,
    ids,
    limit,
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
    context.sync.continuation ?? coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/products.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

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
