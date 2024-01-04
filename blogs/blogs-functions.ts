import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, RESOURCE_BLOG, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, makeGetRequest, makeSyncTableGetRequest } from '../helpers-rest';
import { blogFieldDependencies } from './blogs-schema';
import { handleFieldDependencies } from '../helpers';
import { graphQlGidToId, idToGraphQlGid } from '../helpers-graphql';
import { FormatFunction } from '../types/misc';
import { SyncTableRestContinuation } from '../types/tableSync';

export const formatBlog: FormatFunction = (blog, context) => {
  blog.admin_url = `${context.endpoint}/admin/blogs/${blog.id}`;
  blog.graphql_gid = idToGraphQlGid(RESOURCE_BLOG, blog.blog_id);

  return blog;
};

function validateBlogParams(params: any) {
  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}

export const fetchBlog = async ([blogGid], context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${graphQlGidToId(blogGid)}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.blog) {
    return formatBlog(body.blog, context);
  }
};

export const syncBlogs = async ([handle], context: coda.SyncExecutionContext) => {
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, blogFieldDependencies);

  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    handle,
    limit: REST_DEFAULT_LIMIT,
  });

  validateBlogParams(params);

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`, params);

  return await makeSyncTableGetRequest(
    {
      url,
      formatFunction: formatBlog,
      mainDataKey: 'blogs',
    },
    context
  );
};
