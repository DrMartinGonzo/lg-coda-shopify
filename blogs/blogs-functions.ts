import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, RESOURCE_BLOG, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';

import { idToGraphQlGid } from '../helpers-graphql';
import { FormatFunction } from '../types/misc';
import { BlogSchema } from '../schemas/syncTable/BlogSchema';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getResourceMetafieldsRestUrl,
  handleResourceMetafieldsUpdateRest,
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
      // BUG hack: convert id to string as we use StringArray ParameterType (@see comment
      // @see topic: https://community.coda.io/t/ui-and-typescript-bug-with-with-coda-parametertype-numberarray/46455
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

/**
 * On peut créer des metafields directement en un call mais apparemment ça ne
 * fonctionne que pour les créations, pas les updates, du coup on applique la
 * même stratégie que pour handleArticleUpdateJob, CAD il va falloir faire un
 * appel séparé pour chaque metafield
 */
export async function handleBlogUpdateJob(
  update: coda.SyncUpdate<string, string, typeof BlogSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const blogId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: BlogUpdateRestParams = formatBlogStandardFieldsRestParams(standardFromKeys, update.newValue);
    subJobs.push(updateBlogRest(blogId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateRest(
        getResourceMetafieldsRestUrl('blogs', blogId, context),
        metafieldDefinitions,
        update,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.allSettled(subJobs);
  if (updateJob) {
    if (updateJob.status === 'fulfilled' && updateJob.value) {
      if (updateJob.value.body?.blog) {
        obj = {
          ...obj,
          ...formatBlogForSchemaFromRestApi(updateJob.value.body.blog, context),
        };
      }
    } else if (updateJob.status === 'rejected') {
      throw new coda.UserVisibleError(updateJob.reason);
    }
  }
  if (metafieldsJob) {
    if (metafieldsJob.status === 'fulfilled' && metafieldsJob.value) {
      obj = {
        ...obj,
        ...metafieldsJob.value,
      };
    } else if (metafieldsJob.status === 'rejected') {
      throw new coda.UserVisibleError(metafieldsJob.reason);
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
