import { getTokenPlaceholder, maybeDelayNextExecution } from '../helpers';

export const createMetaObject = async ([type, ...varargs], context) => {
  const fields = [];
  while (varargs.length > 0) {
    let key: string, value: string;
    // Pull the first set of varargs off the list, and leave the rest.
    [key, value, ...varargs] = varargs;
    fields.push({ key, value });
  }

  const mutationQuery = `
    mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          id
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const payload = {
    query: mutationQuery,
    variables: {
      metaobject: {
        type,
        capabilities: {
          publishable: {
            status: 'ACTIVE',
          },
        },
        fields,
      },
    },
  };
  const response = await context.fetcher.fetch({
    method: 'POST',
    url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
    cacheTtlSecs: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    body: JSON.stringify(payload),
  });

  const { body } = response;
  return body.data.metaobjectCreate.metaobject.id;
};

export const updateMetaObject = async ([id, ...varargs], context) => {
  const fields = [];
  while (varargs.length > 0) {
    let key: string, value: string;
    // Pull the first set of varargs off the list, and leave the rest.
    [key, value, ...varargs] = varargs;
    fields.push({ key, value });
  }

  const mutationQuery = `
    mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject {
          id
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const payload = {
    query: mutationQuery,
    variables: {
      id,
      metaobject: {
        capabilities: {
          publishable: {
            status: 'ACTIVE',
          },
        },
        fields,
      },
    },
  };
  const response = await context.fetcher.fetch({
    method: 'POST',
    url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
    cacheTtlSecs: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    body: JSON.stringify(payload),
  });

  const { body } = response;
  return body.data.metaobjectUpdate.metaobject.id;
};

export const deleteMetaObject = async ([id], context) => {
  const mutationQuery = `
    mutation metaobjectDelete($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }
  `;

  const payload = {
    query: mutationQuery,
    variables: {
      id,
    },
  };
  const response = await context.fetcher.fetch({
    method: 'POST',
    url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
    cacheTtlSecs: 0,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    body: JSON.stringify(payload),
  });

  const { body } = response;
  return body.data.metaobjectDelete.deletedId;
};

export const fetchAllMetaObjects = async ([type, objectFieldName, additionalFields = [], limit = 100], context) => {
  const query = `
    query ($numObjects: Int!, $cursor: String) {
      metaobjects(type: "${type}", first: $numObjects, after: $cursor) {
        nodes {
          id
          name: field(key: "${objectFieldName}") { value }
          ${additionalFields.map((key) => `${key}: field(key: "${key}") { value }`).join('\n')}
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const payload = {
    query,
    variables: {
      numObjects: limit,
      cursor: context.sync.continuation,
    },
  };

  const response = await context.fetcher.fetch({
    method: 'POST',
    url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    body: JSON.stringify(payload),
  });

  const { body } = response;
  const { data, errors, extensions } = body;
  const { actualQueryCost, requestedQueryCost } = extensions.cost;
  const { maximumAvailable, currentlyAvailable, restoreRate } = extensions.cost.throttleStatus;
  maybeDelayNextExecution(requestedQueryCost, currentlyAvailable, restoreRate, errors);

  const { nodes, pageInfo } = data.metaobjects;

  return {
    result: nodes.map((node) => {
      const data = {};
      additionalFields.forEach((key) => {
        data[key] = node[key].value;
      });

      return {
        gid: node.id,
        name: node.name.value,
        type: type,

        data: JSON.stringify(data),
      };
    }),
    continuation: pageInfo.hasNextPage ? pageInfo.endCursor : null,
  };
};
