// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_LIMIT } from '../constants';
import { idToGraphQlGid } from '../helpers-graphql';
import {
  formatMetafieldRestInputFromKeyValueSet,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';
import { formatOptionNameId } from '../helpers';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { RestResourceName, restResources } from '../types/RequestsRest';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { BlogSyncTableSchema } from '../schemas/syncTable/BlogSchema';

import type { BlogRow } from '../types/CodaRows';
import type { BlogCreateRestParams, BlogUpdateRestParams } from '../types/Blog';

// #endregion

export class BlogRestFetcher extends SimpleRest<RestResourceName.Blog, typeof BlogSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Blog, BlogSyncTableSchema, context);
  }

  validateParams = (params: any) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<BlogRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): BlogUpdateRestParams | BlogCreateRestParams | undefined => {
    let restParams: BlogUpdateRestParams | BlogCreateRestParams = {};

    if (row.title !== undefined) restParams.title = row.title;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.commentable !== undefined) restParams.commentable = row.commentable;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as BlogCreateRestParams;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (blog): BlogRow => {
    let obj: BlogRow = {
      ...blog,
      admin_url: `${this.context.endpoint}/admin/blogs/${blog.id}`,
      graphql_gid: idToGraphQlGid(GraphQlResource.Blog, blog.id),
    };

    return obj;
  };
}

// #region Helpers
/**
 * On peut créer des metafields directement en un call mais apparemment ça ne
 * fonctionne que pour les créations, pas les updates, du coup on applique la
 * même stratégie que pour handleArticleUpdateJob, CAD il va falloir faire un
 * appel séparé pour chaque metafield
 */
export async function handleBlogUpdateJob(
  row: {
    original?: BlogRow;
    updated: BlogRow;
  },
  metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = [],
  context: coda.ExecutionContext
): Promise<BlogRow> {
  const blogFetcher = new BlogRestFetcher(context);
  const originalRow = row.original ?? {};
  const updatedRow = row.updated;
  const restParams = blogFetcher.formatRowToApi(updatedRow);
  const updateBlogPromise = restParams ? blogFetcher.update(updatedRow.id, restParams) : undefined;

  const updateMetafieldsPromise = metafieldKeyValueSets.length
    ? updateAndFormatResourceMetafieldsRest(
        { ownerId: updatedRow.id, ownerResource: restResources.Blog, metafieldKeyValueSets },
        context
      )
    : undefined;

  const [res, formattedMetafields] = await Promise.all([updateBlogPromise, updateMetafieldsPromise]);

  const updatedBlog = res?.body?.blog ? blogFetcher.formatApiToRow(res.body.blog) : {};
  return {
    ...originalRow,
    id: updatedRow.id,
    ...updatedBlog,
    ...(formattedMetafields ?? {}),
  } as BlogRow;
}
// #endregion

// #region AutoComplete
async function autocompleteBlogIdParameter(context: coda.ExecutionContext, search: string, args: any) {
  const params = {
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  };
  const blogFetcher = new BlogRestFetcher(context);
  const response = await blogFetcher.fetchAll(params);
  return coda.autocompleteSearchObjects(search, response.body.blogs, 'title', 'id');
}

export async function autocompleteBlogParameterWithName(context: coda.ExecutionContext, search: string, args: any) {
  const params = {
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  };
  const blogFetcher = new BlogRestFetcher(context);
  const response = await blogFetcher.fetchAll(params);
  return response.body.blogs.map((blog) => formatOptionNameId(blog.title, blog.id));
}
// #endregion
