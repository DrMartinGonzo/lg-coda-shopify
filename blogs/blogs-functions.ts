import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';
import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder } from '../helpers';

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
  const response = await context.fetcher.fetch({
    method: 'GET',
    url: `${context.endpoint}/admin/api/2023-01/blogs/${blogID}.json`,
    cacheTtlSecs: 10,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.blog) {
    return formatBlog(body.blog);
  }
};

export const fetchAllBlogs = async ([handle, limit, since_id], context) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    limit,
    since_id,
  });

  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }

  let url =
    context.sync.continuation ?? coda.withQueryParams(`${context.endpoint}/admin/api/2023-01/blogs.json`, params);

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
  if (body.blogs) {
    items = body.blogs.map(formatBlog);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};
