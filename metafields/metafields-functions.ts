import * as coda from '@codahq/packs-sdk';

import { METAFIELDS_RESOURCE_TYPES } from '../constants';
import { getTokenPlaceholder, graphQlRequest, maybeDelayNextExecution } from '../helpers';

function resourceEndpointFromResourceType(resourceType) {
  switch (resourceType) {
    case 'article':
      return 'articles';
    case 'blog':
      return 'blogs';
    case 'collection':
      return 'collections';
    case 'customer':
      return 'customers';
    case 'draft_order':
      return 'draft_orders';
    case 'order':
      return 'orders';
    case 'page':
      return 'pages';
    case 'product_image':
      return 'product_images';
    case 'product':
      return 'products';
    case 'shop':
      return 'shop';
    case 'variant':
      return 'variants';
    default:
      return resourceType;
  }
}

function formatMetafield(metafield) {
  if (metafield.namespace && metafield.key) {
    metafield.lookup = `${metafield.namespace}.${metafield.key}`;
  }

  return metafield;
}

export const fetchMetafield = async ([metafieldId], context) => {
  let url = context.sync.continuation ?? `${context.endpoint}/admin/api/2022-01/metafields/${metafieldId}.json`;

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

  if (body.metafield) {
    const { metafield } = body;
    return formatMetafield(metafield);
  }
};

export const fetchResourceMetafields = async ([resourceId, resourceType], context) => {
  if (resourceId.length == 0) return;

  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }

  const endpointType = resourceEndpointFromResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/2023-07/${endpointType}/${resourceId}/metafields.json`;
  // edge case
  if (resourceType === 'Shop') {
    url = `${context.endpoint}/admin/api/2023-07/metafields.json`;
  }

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

  let items = [];
  if (body.metafields) {
    items = body.metafields.map(formatMetafield);
  }

  return items;
};

// TODO: handle metafield missing when trying to update (because of out of sync values in Coda)
export const createResourceMetafield = async ([resourceId, resourceType, namespace, key, value, type], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }

  const endpointType = resourceEndpointFromResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/2023-07/${endpointType}/${resourceId}/metafields.json`;
  // edge case
  if (resourceType === 'Shop') {
    url = `${context.endpoint}/admin/api/2023-07/metafields.json`;
  }

  const value_type = type ?? (value.indexOf('{') === 0 ? 'json_string' : 'string');
  const payload = {
    metafield: {
      namespace,
      key,
      value,
      type: value_type,
    },
  };

  return context.fetcher.fetch({
    method: 'POST',
    url: url,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 0,
  });
};

export const updateResourceMetafield = async ([metafieldId, resourceId, resourceType, value], context) => {
  if (!METAFIELDS_RESOURCE_TYPES.includes(resourceType)) {
    throw new coda.UserVisibleError('Unknown resource type: ' + resourceType);
  }
  const endpointType = resourceEndpointFromResourceType(resourceType);
  let url = `${context.endpoint}/admin/api/2023-07/${endpointType}/${resourceId}/metafields/${metafieldId}.json`;
  // edge case
  if (resourceType === 'Shop') {
    url = `${context.endpoint}/admin/api/2023-07/metafields/${metafieldId}.json`;
  }

  const payload = {
    metafield: { value },
  };

  return context.fetcher.fetch({
    method: 'PUT',
    url: url,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 0,
  });
};

export const deleteResourceMetafield = async ([metafieldId], context) => {
  const url = `${context.endpoint}/admin/api/2022-07/metafields/${metafieldId}.json`;
  return context.fetcher.fetch({
    method: 'DELETE',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 0,
  });
};
