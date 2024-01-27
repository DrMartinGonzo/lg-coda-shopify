import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import {
  NOT_FOUND,
  OPTIONS_PUBLISHED_STATUS,
  RESOURCE_ARTICLE,
  RESOURCE_BLOG,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  cleanQueryParams,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
  makeSyncTableGetRequest,
} from '../helpers-rest';
import { articleFieldDependencies } from './articles-schema';
import { getThumbnailUrlFromFullUrl, handleFieldDependencies } from '../helpers';
import { graphQlGidToId, idToGraphQlGid } from '../helpers-graphql';
import { FormatFunction } from '../types/misc';
import { SyncTableRestContinuation } from '../types/tableSync';

export const formatArticle: FormatFunction = (article, context) => {
  article.body = striptags(article.body_html);
  article.summary = striptags(article.summary_html);
  article.admin_url = `${context.endpoint}/admin/articles/${article.id}`;
  article.published = !!article.published_at;

  if (article.blog_id) {
    article.blog_gid = idToGraphQlGid(RESOURCE_BLOG, article.blog_id);
    article.pseudo_graphql_gid = genArticlePeudoGid(article.blog_id, article.id);
    article.blog = {
      admin_graphql_api_id: idToGraphQlGid(RESOURCE_BLOG, article.blog_id),
      title: NOT_FOUND,
    };
  }

  if (article.image) {
    article.thumbnail = getThumbnailUrlFromFullUrl(article.image.src);
    article.image_alt_text = article.image.alt;
    article.image = article.image.src;
  }

  return article;
};

export function getBlogIdFromArticlePseudoGid(articleGid: string): number {
  return parseInt(articleGid.split('=').pop(), 10);
}
export function genArticlePeudoGid(blogGid: number, articleId: number): string {
  return `gid://shopify/${RESOURCE_ARTICLE}/${articleId}?blog_id=${blogGid}`;
}

function validateArticleParams(params: any) {
  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}

export async function autocompleteBlogGidParameter(context: coda.ExecutionContext, search: string, args: any) {
  const params = cleanQueryParams({
    limit: REST_DEFAULT_LIMIT,
    fields: ['admin_graphql_api_id', 'title'].join(','),
  });
  let url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`, params);

  const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  return coda.autocompleteSearchObjects(search, body.blogs, 'title', 'admin_graphql_api_id');
}

export const fetchArticle = async ([articlePseudoGID], context: coda.ExecutionContext) => {
  const blogId = getBlogIdFromArticlePseudoGid(articlePseudoGID);
  const articleId = graphQlGidToId(articlePseudoGID);

  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}/articles/${articleId}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  if (response.body.article) {
    return formatArticle(response.body.article, context);
  }
};

export const syncArticles = async (
  [
    restrictToBlogGids,
    author,
    createdAtMax,
    createdAtMin,
    handle,
    publishedAtMax,
    publishedAtMin,
    publishedStatus,
    tag,
    updatedAtMax,
    updatedAtMin,
  ],
  context: coda.SyncExecutionContext
) => {
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, articleFieldDependencies);

  const params = cleanQueryParams({
    author,
    tag,
    created_at_max: createdAtMax,
    created_at_min: createdAtMin,
    fields: syncedFields.join(', '),
    handle,
    limit: REST_DEFAULT_LIMIT,
    published_at_max: publishedAtMax,
    published_at_min: publishedAtMin,
    published_status: publishedStatus,
    updated_at_max: updatedAtMax,
    updated_at_min: updatedAtMin,
  });

  validateArticleParams(params);

  let currentBlogId: number;
  let blogIdsLeft = prevContinuation?.extraContinuationData?.blogIdsLeft;

  if (!blogIdsLeft) {
    // User has specified the blogs he wants to sync articles from
    if (restrictToBlogGids && restrictToBlogGids.length) {
      blogIdsLeft = restrictToBlogGids.map(graphQlGidToId);
    }
    // Sync articles from all blogs
    else {
      let url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`, {
        fields: 'id',
        limit: REST_DEFAULT_LIMIT,
      });
      const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
      blogIdsLeft = response.body.blogs.map((blog) => blog.id);
    }
  }

  currentBlogId = blogIdsLeft[0];

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(
      `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${currentBlogId}/articles.json`,
      params
    );

  let restResult = [];
  let { response, continuation } = await makeSyncTableGetRequest({ url }, context);
  if (response && response.body?.articles) {
    restResult = response.body.articles.map((article) => formatArticle(article, context));
  }

  const blogIdsLeftUpdated = blogIdsLeft.filter((id) => id != currentBlogId);
  if (blogIdsLeftUpdated.length && !continuation?.nextUrl) {
    continuation = {
      ...continuation,
      nextUrl: undefined, // reset nextUrl to undefined so that it doesn't get used in the next sync
      extraContinuationData: { blogIdsLeft: blogIdsLeftUpdated },
    };
  }

  return { result: restResult, continuation };
};

export const createArticle = async (
  [
    blogGID,
    title,
    author,
    body_html,
    handle,
    imageAlt,
    imageSrc,
    published_at,
    published,
    summary_html,
    tags,
    template_suffix,
  ],
  context
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${graphQlGidToId(
    blogGID
  )}/articles.json`;
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
    },
  };

  if (imageSrc || imageAlt) {
    payload.article['image'] = {
      src: imageSrc,
      alt: imageAlt,
    };
  }

  return makePostRequest({ url, payload }, context);
};

export const updateArticle = async (
  [
    articlePseudoGID,
    author,
    body_html,
    handle,
    imageAlt,
    imageSrc,
    published_at,
    published,
    summary_html,
    tags,
    template_suffix,
    title,
  ],
  context
) => {
  const blogId = getBlogIdFromArticlePseudoGid(articlePseudoGID);
  const articleId = graphQlGidToId(articlePseudoGID);

  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}/articles/${articleId}.json`;
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
    },
  };

  if (imageSrc || imageAlt) {
    payload.article['image'] = {
      src: imageSrc,
      alt: imageAlt,
    };
  }

  const response = await makePutRequest({ url, payload }, context);
  if (response.body.article) {
    return formatArticle(response.body.article, context);
  }
};

export const deleteArticle = async ([articlePseudoGID], context) => {
  const blogId = getBlogIdFromArticlePseudoGid(articlePseudoGID);
  const articleId = graphQlGidToId(articlePseudoGID);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}/articles/${articleId}.json`;
  return makeDeleteRequest({ url }, context);
};
