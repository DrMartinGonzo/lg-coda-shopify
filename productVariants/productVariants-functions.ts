import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder } from '../helpers';

export const formatProductVariant = (variant, product) => {
  if (variant.product_id) {
    variant.product = {
      id: variant.product_id,
    };
  }
  if (variant.image_id && product.images.length > 0) {
    const variantImage = product.images.filter((image) => image.id === variant.image_id);
    if (variantImage.length === 1) {
      variant.image = variantImage[0].src;
    }
  }

  return variant;
};

export const fetchProductVariant = async ([productVariantID], context) => {
  const response = await context.fetcher.fetch({
    method: 'GET',
    url: `${context.endpoint}/admin/api/2022-07/variants/${productVariantID}.json`,
    cacheTtlSec: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.variant) {
    return body.variant;
  }
};

export const fetchAllProductVariants = async (
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

  // if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
  //   throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  // }
  // // TODO: check split value
  // if (params.status && !OPTIONS_PRODUCT_STATUS.includes(params.status)) {
  //   throw new coda.UserVisibleError('Unknown status: ' + params.status);
  // }

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
    if (body.products) {
      items = body.products.reduce((previous, current) => {
        return previous.concat(current.variants.map((variant) => formatProductVariant(variant, current)));
      }, []);
    }
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
