import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_VERSION } from '../constants';
import { cleanQueryParams, extractNextUrlPagination, restGetRequest } from '../helpers-rest';

// const API_VERSION = '2023-01';
const API_VERSION = REST_DEFAULT_VERSION;

export const formatBlog = (article) => {
  // if (article.images) {
  //   const primaryImage = article.images.filter((image) => image.position === 1);
  //   if (primaryImage.length === 1) {
  //     article.primary_image = primaryImage[0].src;
  //   }
  // }
  // if (article.variants) {
  //   article.variants = article.variants.map((variant) => {
  //     return { product_variant_id: variant.id };
  //   });
  // }

  return article;
};

export const fetchBlog = async ([blogID], context) => {
  const url = `${context.endpoint}/admin/api/${API_VERSION}/blogs/${blogID}.json`;
  const response = await restGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.blog) {
    return formatBlog(body.blog);
  }
};

export const fetchAllBlogs = async ([handle, maxEntriesPerRun, since_id], context) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    limit: maxEntriesPerRun,
    since_id,
  });

  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${API_VERSION}/blogs.json`, params);

  const response = await restGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.blogs) {
    items = body.blogs.map(formatBlog);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
