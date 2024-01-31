import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, RESOURCE_BLOG, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';

import { idToGraphQlGid } from '../helpers-graphql';
import { FormatFunction } from '../types/misc';
import { BlogSchema } from './blogs-schema';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  handleResourceMetafieldsUpdateRest,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { BlogCreateRestParams, BlogUpdateRestParams } from '../types/Blog';

// #region Helpers
export async function handleBlogUpdateJob(
  update: coda.SyncUpdate<string, string, typeof BlogSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);
  let obj = { ...update.previousValue };
  const subJobs: Promise<any>[] = [];
  const blogId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: BlogUpdateRestParams = {};
    standardFromKeys.forEach((fromKey) => {
      const value = update.newValue[fromKey];
      restParams[fromKey] = value;
    });

    subJobs.push(updateBlogRest(blogId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    // TODO: handle results
    subJobs.push(
      handleResourceMetafieldsUpdateRest(
        `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}`,
        blogId,
        'blog',
        metafieldDefinitions,
        update,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  const [restResponse, metafields] = await Promise.all(subJobs);
  if (restResponse) {
    if (restResponse.body?.blog) {
      obj = {
        ...obj,
        ...formatBlogForSchemaFromRestApi(restResponse.body.blog, context),
      };
    }
  }
  if (metafields) {
    obj = {
      ...obj,
      ...metafields,
    };
  }

  return obj;
}
// #endregion

// #region Formatting functions
export const formatBlogForSchemaFromRestApi: FormatFunction = (blog, context) => {
  blog.admin_url = `${context.endpoint}/admin/blogs/${blog.id}`;
  blog.graphql_gid = idToGraphQlGid(RESOURCE_BLOG, blog.blog_id);

  return blog;
};

export function validateBlogParams(params: any) {
  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}
// #endregion

// #region Rest requests
export const fetchBlogRest = (blogId: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}.json`;
  return makeGetRequest({ url, cacheTtlSecs: 10 }, context);
};

export const createBlogRest = (params: BlogCreateRestParams, context: coda.ExecutionContext) => {
  // validateBlogParams(params);
  const payload = { blog: cleanQueryParams(params) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`;
  return makePostRequest({ url, payload }, context);
};

export const updateBlogRest = (blogId: number, params: BlogUpdateRestParams, context: coda.ExecutionContext) => {
  const restParams = cleanQueryParams(params);
  // validateBlogParams(params);
  const payload = { blog: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}.json`;
  return makePutRequest({ url, payload }, context);
};

export const deleteBlogRest = (blogId: number, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion
