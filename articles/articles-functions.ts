import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';
import {
  cleanQueryParams,
  extractNextUrlPagination,
  restDeleteRequest,
  restGetRequest,
  restPostRequest,
  restPutRequest,
} from '../helpers-rest';

export const formatArticle = (article) => {
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

export const fetchArticle = async ([blogID, articleID], context) => {
  const url = `${context.endpoint}/admin/api/2023-01/blogs/${blogID}/articles/${articleID}.json`;
  const response = await restGetRequest({ url, cacheTtlSecs: 100 }, context);
  const { body } = response;

  if (body.article) {
    return formatArticle(body.article);
  }
};

export const fetchAllArticles = async (
  [
    blogID,
    author,
    created_at_max,
    created_at_min,
    handle,
    maxEntriesPerRun,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    tag,
    updated_at_max,
    updated_at_min,
  ],
  context
) => {
  // Only fetch the selected columns.
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    author,
    tag,
    created_at_max,
    created_at_min,
    fields: syncedFields.join(', '),
    handle,
    limit: maxEntriesPerRun,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    updated_at_max,
    updated_at_min,
  });

  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }

  let url =
    context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/2023-01/blogs/${blogID}/articles.json`, params);

  const response = await restGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.articles) {
    items = body.articles.map(formatArticle);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

export const createArticle = async (
  [
    blogID,
    title,
    author,
    body_html,
    handle,
    imageSrc,
    imageAlt,
    summary_html,
    template_suffix,
    tags,
    published,
    published_at,
  ],
  context
) => {
  const url = `${context.endpoint}/admin/api/2023-01/blogs/${blogID}/articles.json`;
  const payload = {
    article: {
      title,
      author,
      body_html,
      handle,
      summary_html,
      template_suffix,
      tags,
      published,
      published_at,
      image: {
        src: imageSrc,
        alt: imageAlt,
      },
    },
  };

  return restPostRequest({ url, payload }, context);
};

export const updateArticle = async (
  [
    blogID,
    articleId,
    title,
    author,
    body_html,
    handle,
    imageSrc,
    imageAlt,
    summary_html,
    template_suffix,
    tags,
    published,
    published_at,
  ],
  context
) => {
  const url = `${context.endpoint}/admin/api/2023-04/blogs/${blogID}/articles/${articleId}.json`;
  const payload = {
    article: {
      title,
      author,
      body_html,
      handle,
      summary_html,
      template_suffix,
      tags,
      published,
      published_at,
      image: {
        src: imageSrc,
        alt: imageAlt,
      },
    },
  };

  return restPutRequest({ url, payload }, context);
};

export const deleteArticle = async ([blogID, articleId], context) => {
  const url = `${context.endpoint}/admin/api/2023-04/blogs/${blogID}/articles/${articleId}.json`;
  return restDeleteRequest({ url }, context);
};
