import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder } from '../helpers';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';
import { formatProduct } from '../products/products-functions';

function formatCustomCollection(collection) {
  if (collection.image) {
    collection.image = collection.image.src;
  }
  return collection;
}

function formatSmartCollection(collection) {
  if (collection.image) {
    collection.image = collection.image.src;
  }
  return collection;
}

export const fetchProductIdsInCollections = async ([id, limit], context) => {
  const params = cleanQueryParams({
    limit,
  });

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/collections/${id}/products.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    cacheTtlSecs: 0,
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
    items = body.products.map((product) => {
      return {
        product_id: product.id,
        collection_id: id,
        unique_id: `${id}_${product.id}`,
      };
    });
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

export const fetchProductsInCollection = async ([id, limit], context) => {
  const params = cleanQueryParams({
    limit,
  });

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/collections/${id}/products.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    cacheTtlSecs: 0,
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
      items = body.products.map((product) => {
        return {
          collection_id: id,
          product: { id: product.id },
          unique_id: `${id}_${product.id}`,
        };
      });
    }
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

export const fetchCollection = async ([id, fields], context) => {
  const params = cleanQueryParams({
    fields,
  });

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/collections/${id}.json`, params),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 10,
  });

  const { body } = response;
  if (body.collection) {
    return body.collection;
  }
};

export const fetchAllCollects = async ([limit, since_id], context) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);

  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    limit,
    since_id,
  });

  let url =
    context.sync.continuation ?? coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/collects.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    cacheTtlSecs: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.collects) {
    if (body.products) {
      items = body.products.map(formatProduct);
    }
    items = body.collects.map((collect) => {
      return {
        ...collect,
        ...{
          product: { id: collect.product_id },
        },
      };
    });
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

export const fetchCollect = async ([id, fields], context) => {
  const params = cleanQueryParams({ fields });

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/collects/${id}.json`, params),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 10,
  });

  const { body } = response;
  if (body.collect) {
    return body.collect;
  }
};

export const fetchCustomCollection = async ([id, fields], context) => {
  const params = cleanQueryParams({
    fields,
  });

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/custom_collections/${id}.json`, params),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 10,
  });

  const { body } = response;
  if (body.custom_collection) {
    return body.custom_collection;
  }
};

export const fetchAllCustomCollections = async (
  [
    handle,
    ids,
    limit,
    product_id,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  ],
  context
) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    ids,
    limit,
    product_id,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  });

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/custom_collections.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 0,
  });

  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.custom_collections) {
    items = body.custom_collections.map(formatCustomCollection);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

export const fetchSmartCollection = async ([id, fields], context) => {
  const params = cleanQueryParams({
    fields,
  });

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/smart_collections/${id}.json`, params),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 10,
  });

  const { body } = response;
  if (body.smart_collection) {
    return body.smart_collection;
  }
};

export const fetchAllSmartCollections = async (
  [
    handle,
    ids,
    limit,
    product_id,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  ],
  context
) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    ids,
    limit,
    product_id,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  });

  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown status: ' + params.published_status);
  }

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/smart_collections.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    cacheTtlSecs: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.smart_collections) {
    items = body.smart_collections.map(formatSmartCollection);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
