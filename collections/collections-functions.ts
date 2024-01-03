import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { getThumbnailUrlFromFullUrl, graphQlGidToId, idToGraphQlGid } from '../helpers';
import { cleanQueryParams, extractNextUrlPagination, restGetRequest, restPutRequest } from '../helpers-rest';
import { graphQlRequest, handleGraphQlError } from '../helpers-graphql';

import {
  COLLECTION_TYPE__CUSTOM,
  COLLECTION_TYPE__SMART,
  NOT_FOUND,
  OPTIONS_PUBLISHED_STATUS,
  RESOURCE_COLLECTION,
  RESOURCE_PRODUCT,
  REST_DEFAULT_VERSION,
} from '../constants';
import { formatProduct } from '../products/products-functions';
import { buildUpdateCollection, isSmartCollection } from './collections-graphql';

// const API_VERSION = '2022-07';
const API_VERSION = REST_DEFAULT_VERSION;

export function formatCollection(collection) {
  collection.body = striptags(collection.body_html);
  if (collection.image) {
    collection.thumbnail = getThumbnailUrlFromFullUrl(collection.image.src);
    collection.image = collection.image.src;
  }
  return collection;
}

export const getCollectionType = async (gid: string, context: coda.ExecutionContext) => {
  const payload = {
    query: isSmartCollection,
    variables: {
      gid,
    },
  };

  const response = await graphQlRequest({ payload }, context);
  const { body } = response;
  handleGraphQlError(body.errors);

  return body.data.collection.isSmartCollection ? COLLECTION_TYPE__SMART : COLLECTION_TYPE__CUSTOM;
};

export const fetchAllCollects = async ([maxEntriesPerRun, collection_gid], context) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  // replace product with product_id if present
  const productFieldindex = syncedFields.indexOf('product');
  if (productFieldindex !== -1) {
    syncedFields[productFieldindex] = 'product_id';
  }

  if (
    (syncedFields.includes('product') || syncedFields.includes('product_graphql_gid')) &&
    !syncedFields.includes('product_id')
  ) {
    syncedFields.push('product_id');
  }
  if (
    (syncedFields.includes('collection') || syncedFields.includes('collection_graphql_gid')) &&
    !syncedFields.includes('collection_id')
  ) {
    syncedFields.push('collection_id');
  }

  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    limit: maxEntriesPerRun,
    collection_id: collection_gid ? graphQlGidToId(collection_gid) : undefined,
  });

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/collects.json`, params);

  const response = await restGetRequest({ url, cacheTtlSecs: 0 }, context);
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
        collection_graphql_gid: idToGraphQlGid(RESOURCE_COLLECTION, collect.collection_id),
        product_graphql_gid: idToGraphQlGid(RESOURCE_PRODUCT, collect.product_id),
        ...{
          product: {
            id: collect.product_id,
            title: NOT_FOUND,
          },
          collection: {
            admin_graphql_api_id: idToGraphQlGid(RESOURCE_COLLECTION, collect.collection_id),
            title: NOT_FOUND,
          },
        },
      };
    });
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

  const url = coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/collections/${id}.json`, params);
  const response = await restGetRequest({ url, cacheTtlSecs: 10 }, context);

  const { body } = response;
  if (body.collection) {
    return body.collection;
  }
};

export const fetchAllCollections = async (
  [
    handle,
    ids,
    maxEntriesPerRun,
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
  let type = context.sync.continuation?.type ?? 'custom_collections';

  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  // we need to fetch image field if image thumbnail is requested
  if (syncedFields.includes('thumbnail') && !syncedFields.includes('image')) {
    syncedFields.push('image');
  }
  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    ids,
    limit: maxEntriesPerRun,
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
    throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
  }

  let url = context.sync.continuation?.nextUrl
    ? context.sync.continuation.nextUrl
    : coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/${type}.json`, params);

  const response = await restGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  // Check if we have paginated results
  let nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body[type]) {
    items = body[type].map(formatCollection);
  }

  if (type === 'custom_collections' && !nextUrl) {
    type = 'smart_collections';
    nextUrl = coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/${type}.json`, params);
  }

  return {
    result: items,
    continuation: nextUrl
      ? {
          type,
          nextUrl,
        }
      : null,
  };
};

export const updateCollection = async (collectionGid: string, fields, context) => {
  let newValues = {};
  const restAdminOnlyKeys = ['published'];

  const keysToUpdateGraphQl = Object.keys(fields).filter(
    (key) => !restAdminOnlyKeys.includes(key) && fields[key] !== undefined
  );
  const keysToUpdateRest = Object.keys(fields).filter(
    (key) => restAdminOnlyKeys.includes(key) && fields[key] !== undefined
  );

  if (keysToUpdateGraphQl.length) {
    const mutationInput = {
      id: collectionGid,
    };

    keysToUpdateGraphQl.forEach((key) => {
      let graphQlKey = key;
      switch (key) {
        case 'body_html':
          graphQlKey = 'descriptionHtml';
          break;
        case 'template_suffix':
          graphQlKey = 'templateSuffix';
          break;

        default:
          break;
      }

      mutationInput[graphQlKey] = fields[key];
    });

    const payload = {
      query: buildUpdateCollection(),
      variables: {
        input: mutationInput,
      },
    };

    const response = await graphQlRequest({ payload, apiVersion: '2023-07' }, context);

    const { body } = response;
    const { errors, extensions } = body;
    handleGraphQlError(errors);

    // TODO: need a formatCollection function for graphQL responses
    newValues = formatCollection({
      admin_graphql_api_id: collectionGid,
      ...body.data.collectionUpdate.collection,
    });
  }

  if (keysToUpdateRest.length) {
    const fieldsPayload = {};
    keysToUpdateRest.forEach((key) => {
      const updatedValue = fields[key];
      fieldsPayload[key] = updatedValue;
    });

    const collectionId = graphQlGidToId(collectionGid);
    const collectionType = await getCollectionType(collectionGid, context);

    let url = `${context.endpoint}/admin/api/${API_VERSION}/custom_collections/${collectionId}.json`;
    let payload = {
      custom_collection: {
        ...fieldsPayload,
      },
    };
    if (collectionType === COLLECTION_TYPE__SMART) {
      url = `${context.endpoint}/admin/api/${API_VERSION}/smart_collections/${collectionId}.json`;
      payload = {
        // @ts-ignore
        smart_collection: {
          ...fieldsPayload,
        },
      };
    }

    const response = await restPutRequest({ url, payload }, context);
    const { body } = response;
    newValues = formatCollection(
      collectionType === COLLECTION_TYPE__SMART ? body.smart_collection : body.custom_collection
    );
  }

  return newValues;
};
