import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, RESOURCE_BLOG, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';

import { idToGraphQlGid } from '../helpers-graphql';
import { FormatFunction } from '../types/misc';
import { BlogSchema } from './blogs-schema';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  deleteMetafieldsByKeysRest,
  formatMetafieldsRestInputFromResourceUpdate,
  getResourceMetafieldsRestUrl,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { BlogCreateRestParams, BlogUpdateRestParams } from '../types/Blog';

// #region Helpers
export async function autocompleteBlogIdParameter(context: coda.ExecutionContext, search: string, args: any) {
  const params = cleanQueryParams({
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  });
  let url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`, params);
  const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
  const searchObjects = response.body.blogs.map((blog) => {
    return {
      ...blog,
      // convert id to string as we use StringArray ParameterType (@see comment
      // in restrict_to_blogs parameter in articles-setup.ts)
      string_id: blog.id.toString(),
    };
  });
  return coda.autocompleteSearchObjects(search, searchObjects, 'title', 'string_id');
}

export function formatBlogStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof BlogSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    restParams[fromKey] = values[fromKey];
  });
  return restParams;
}

export async function handleBlogUpdateJob(
  update: coda.SyncUpdate<string, string, typeof BlogSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);
  const prefixedMetafieldsToDelete = prefixedMetafieldFromKeys.filter((fromKey) => {
    const value = update.newValue[fromKey] as any;
    return !value || value === '';
  });
  const prefixedMetafieldsToUpdate = prefixedMetafieldFromKeys.filter(
    (fromKey) => prefixedMetafieldsToDelete.includes(fromKey) === false
  );

  const subJobs: Promise<any>[] = [];
  const blogId = update.previousValue.id as number;

  if (standardFromKeys.length || prefixedMetafieldsToUpdate.length) {
    const restParams: BlogUpdateRestParams = formatBlogStandardFieldsRestParams(standardFromKeys, update.newValue);

    if (prefixedMetafieldsToUpdate.length) {
      restParams.metafields = formatMetafieldsRestInputFromResourceUpdate(
        update,
        prefixedMetafieldsToUpdate,
        metafieldDefinitions
      );
    }

    subJobs.push(updateBlogRest(blogId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldsToDelete.length) {
    subJobs.push(
      deleteMetafieldsByKeysRest(
        getResourceMetafieldsRestUrl('blogs', blogId, context),
        prefixedMetafieldsToDelete,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, deletedMetafieldsJob] = await Promise.allSettled(subJobs);
  if (updateJob && updateJob.status === 'fulfilled' && updateJob.value) {
    if (updateJob.value.body?.blog) {
      obj = {
        ...obj,
        ...formatBlogForSchemaFromRestApi(updateJob.value.body.blog, context),
      };
      // Keep value from Coda for each successfully updated metafield, there should be no side effect when they are in Shopify
      prefixedMetafieldsToUpdate.forEach((fromKey) => {
        obj[fromKey] = update.newValue[fromKey];
      });
    }
  }
  if (deletedMetafieldsJob && deletedMetafieldsJob.status === 'fulfilled' && deletedMetafieldsJob.value) {
    if (deletedMetafieldsJob.value && deletedMetafieldsJob.value.length) {
      deletedMetafieldsJob.value.forEach((m) => {
        obj[m.prefixedFullKey] = undefined;
      });
    }
  }

  return obj;
}
// #endregion

// #region Formatting functions
export const formatBlogForSchemaFromRestApi: FormatFunction = (blog, context) => {
  let obj: any = {
    ...blog,
    admin_url: `${context.endpoint}/admin/blogs/${blog.id}`,
    graphql_gid: idToGraphQlGid(RESOURCE_BLOG, blog.blog_id),
  };

  return obj;
};

export function validateBlogParams(params: any) {
  const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
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
