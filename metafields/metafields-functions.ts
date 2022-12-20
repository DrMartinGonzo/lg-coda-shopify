import { getTokenPlaceholder } from '../helpers';

export const fetchProductMetafields = async ([productId], context) => {
  if (productId.length == 0) return;

  let url = context.sync.continuation ?? `${context.endpoint}/admin/api/2022-01/products/${productId}/metafields.json`;

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    cacheTtlSecs: 10,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  let items = [];
  if (body.metafields) {
    items = body.metafields.map((metafield) => {
      return {
        metafield_id: metafield.id,
        unique_id: `${metafield.namespace}.${metafield.key}`,
        namespace: metafield.namespace,
        key: metafield.key,
        value: metafield.value,
        description: metafield.description,
        owner_id: metafield.owner_id,
        created_at: metafield.created_at,
        updated_at: metafield.updated_at,
        owner_resource: metafield.owner_resource,
        type: metafield.type,
        admin_graphql_api_id: metafield.admin_graphql_api_id,
      };
    });
  }

  return items;
};

export const fetchMetafield = async ([metafieldId], context) => {
  let url = context.sync.continuation ?? `${context.endpoint}/admin/api/2022-01/metafields/${metafieldId}.json`;

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    cacheTtlSecs: 10,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.metafield) {
    const { metafield } = body;
    return {
      metafield_id: metafield.id,
      unique_id: `${metafield.namespace}.${metafield.key}`,
      namespace: metafield.namespace,
      key: metafield.key,
      value: metafield.value,
      description: metafield.description,
      owner_id: metafield.owner_id,
      created_at: metafield.created_at,
      updated_at: metafield.updated_at,
      owner_resource: metafield.owner_resource,
      type: metafield.type,
      admin_graphql_api_id: metafield.admin_graphql_api_id,
    };
  }
};

// TODO: handle metafield missing when trying to update (because of out of sync values in Coda)
export const createProductMetafield = async ([productId, namespace, key, value], context) => {
  const url = `${context.endpoint}/admin/api/2022-07/products/${productId}/metafields.json`;
  const value_type = value.indexOf('{') === 0 ? 'json_string' : 'string';
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

export const updateProductMetafield = async ([productId, metafieldId, value], context) => {
  const url = `${context.endpoint}/admin/api/2022-07/products/${productId}/metafields/${metafieldId}.json`;
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

export const deleteMetafield = async ([metafieldId], context) => {
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
