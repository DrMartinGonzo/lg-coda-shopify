// #region Imports
import * as coda from '@codahq/packs-sdk';

import { REST_DEFAULT_LIMIT } from '../../constants';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { formatOptionNameId, handleFieldDependencies } from '../../helpers';
import { COMMENTABLE_OPTIONS, blogFieldDependencies } from '../../schemas/syncTable/BlogSchema';
import { cleanQueryParams } from '../../helpers-rest';
import { SyncTableRestNew } from '../../Fetchers/SyncTableRest';
import { SimpleRestNew } from '../../Fetchers/SimpleRest';

import type { Blog } from '../../types/Resources/Blog';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import type { SyncTableType } from '../../types/SyncTable';
import { blogResource } from '../allResources';

export type BlogSyncTableType = SyncTableType<
  typeof blogResource,
  Blog.Row,
  Blog.Params.Sync,
  Blog.Params.Create,
  Blog.Params.Update
>;
// #endregion

// #region Class
export class BlogSyncTable extends SyncTableRestNew<BlogSyncTableType> {
  constructor(fetcher: BlogRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(blogResource, fetcher, params);
  }

  setSyncParams() {
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, blogFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
    });
  }
}

export class BlogRestFetcher extends SimpleRestNew<BlogSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(blogResource, context);
  }

  validateParams = (params: Blog.Params.Sync | Blog.Params.Create | Blog.Params.Update) => {
    const validCommentableOptions = COMMENTABLE_OPTIONS.map((option) => option.value);
    if ('commentable' in params && !validCommentableOptions.includes(params.commentable)) {
      throw new coda.UserVisibleError('Unknown commentable option: ' + params.commentable);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Blog.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Blog.Params.Update | Blog.Params.Create | undefined => {
    let restParams: Blog.Params.Update | Blog.Params.Create = {};

    if (row.title !== undefined) restParams.title = row.title;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.commentable !== undefined) restParams.commentable = row.commentable;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Blog.Params.Create;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (blog): Blog.Row => {
    let obj: Blog.Row = {
      ...blog,
      admin_url: `${this.context.endpoint}/admin/blogs/${blog.id}`,
    };

    return obj;
  };
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
