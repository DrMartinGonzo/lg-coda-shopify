import * as coda from '@codahq/packs-sdk';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { COMMENTABLE_OPTIONS } from '../../schemas/syncTable/BlogSchema';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { Blog, blogResource } from './blogResource';

export class BlogRestFetcher extends SimpleRest<typeof blogResource> {
  constructor(context: coda.ExecutionContext) {
    super(blogResource, context);
  }

  validateParams = (
    params: Blog['rest']['params']['sync'] | Blog['rest']['params']['create'] | Blog['rest']['params']['update']
  ) => {
    const validCommentableOptions = COMMENTABLE_OPTIONS.map((option) => option.value);
    if ('commentable' in params && !validCommentableOptions.includes(params.commentable)) {
      throw new coda.UserVisibleError('Unknown commentable option: ' + params.commentable);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Blog['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Blog['rest']['params']['update'] | Blog['rest']['params']['create'] | undefined => {
    let restParams: Blog['rest']['params']['update'] | Blog['rest']['params']['create'] = {};

    if (row.title !== undefined) restParams.title = row.title;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.commentable !== undefined) restParams.commentable = row.commentable;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Blog['rest']['params']['create'];
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (blog): Blog['codaRow'] => {
    let obj: Blog['codaRow'] = {
      ...blog,
      admin_url: `${this.context.endpoint}/admin/blogs/${blog.id}`,
    };

    return obj;
  };
}
