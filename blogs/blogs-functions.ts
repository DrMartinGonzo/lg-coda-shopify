// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';

import { idToGraphQlGid } from '../helpers-graphql';
import { FetchRequestOptions } from '../types/Requests';
import { BlogSyncTableSchema } from '../schemas/syncTable/BlogSchema';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getMetafieldKeyValueSetsFromUpdate,
  separatePrefixedMetafieldsKeysFromKeys,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';
import { BlogCreateRestParams, BlogSyncTableRestParams, BlogUpdateRestParams } from '../types/Blog';
import { formatOptionNameId } from '../helpers';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { restResources } from '../types/RequestsRest';

// #endregion

// #region Helpers
export async function autocompleteBlogIdParameter(context: coda.ExecutionContext, search: string, args: any) {
  const params = {
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  };
  const response = await fetchBlogsRest(params, context);
  return coda.autocompleteSearchObjects(search, response.body.blogs, 'title', 'id');
}

export async function autocompleteBlogParameterWithName(context: coda.ExecutionContext, search: string, args: any) {
  const params = {
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  };
  const response = await fetchBlogsRest(params, context);
  return response.body.blogs.map((blog) => formatOptionNameId(blog.title, blog.id));
}

function formatBlogStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof BlogSyncTableSchema>['newValue']
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
  update: coda.SyncUpdate<string, string, typeof BlogSyncTableSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: (Promise<any> | undefined)[] = [];
  const blogId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: BlogUpdateRestParams = formatBlogStandardFieldsRestParams(standardFromKeys, update.newValue);
    subJobs.push(updateBlogRest(blogId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      updateAndFormatResourceMetafieldsRest(
        {
          ownerId: blogId,
          ownerResource: restResources.Blog,
          metafieldKeyValueSets: await getMetafieldKeyValueSetsFromUpdate(
            prefixedMetafieldFromKeys,
            update.newValue,
            metafieldDefinitions,
            context
          ),
        },
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.all(subJobs);
  if (updateJob?.body?.blog) {
    obj = {
      ...obj,
      ...formatBlogForSchemaFromRestApi(updateJob.body.blog, context),
    };
  }

  if (metafieldsJob) {
    obj = {
      ...obj,
      ...metafieldsJob,
    };
  }
  return obj;
}
// #endregion

// #region Formatting functions
export const formatBlogForSchemaFromRestApi = (blog, context: coda.ExecutionContext) => {
  let obj: any = {
    ...blog,
    admin_url: `${context.endpoint}/admin/blogs/${blog.id}`,
    graphql_gid: idToGraphQlGid(GraphQlResource.Blog, blog.blog_id),
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
export const fetchBlogsRest = (
  params: BlogSyncTableRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  let url =
    requestOptions.url ??
    coda.withQueryParams(
      `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`,
      cleanQueryParams(params)
    );
  return makeGetRequest({ ...requestOptions, url }, context);
};

export const fetchSingleBlogRest = (
  blogId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
};

export const createBlogRest = (
  params: BlogCreateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  // validateBlogParams(params);
  const payload = { blog: cleanQueryParams(params) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs.json`;
  return makePostRequest({ ...requestOptions, url, payload }, context);
};

export const updateBlogRest = (
  blogId: number,
  params: BlogUpdateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const restParams = cleanQueryParams(params);
  if (Object.keys(restParams).length) {
    // validateBlogParams(params);
    const payload = { blog: restParams };
    const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}.json`;
    return makePutRequest({ ...requestOptions, url, payload }, context);
  }
};

export const deleteBlogRest = (
  blogId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/blogs/${blogId}.json`;
  return makeDeleteRequest({ ...requestOptions, url }, context);
};
// #endregion
