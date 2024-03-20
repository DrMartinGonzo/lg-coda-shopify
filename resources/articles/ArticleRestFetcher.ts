import * as coda from '@codahq/packs-sdk';

import striptags from 'striptags';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants';
import { cleanQueryParams, getRestBaseUrl } from '../../helpers-rest';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { RestResourcePlural } from '../../Fetchers/ShopifyRestResource.types';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { Article, articleResource } from './articleResource';

export class ArticleRestFetcher extends SimpleRest<Article> {
  constructor(context: coda.ExecutionContext) {
    super(articleResource, context);
  }

  getFetchAllFromBlogUrl = (blogId: number, params: Article['rest']['params']['sync']) => {
    return coda.withQueryParams(
      coda.joinUrl(getRestBaseUrl(this.context), `${RestResourcePlural.Blog}/${blogId}/${this.plural}.json`),
      cleanQueryParams(params)
    );
  };

  validateParams = (
    params:
      | Article['rest']['params']['sync']
      | Article['rest']['params']['update']
      | Article['rest']['params']['create']
  ) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Article['codaRow']>,
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet> = []
  ): Article['rest']['params']['update'] | Article['rest']['params']['create'] | undefined => {
    let restParams: Article['rest']['params']['update'] | Article['rest']['params']['create'] = {};

    if (row.author !== undefined) restParams.author = row.author;
    if (row.blog !== undefined) restParams.blog_id = row.blog.id;
    if (row.blog_id !== undefined) restParams.blog_id = row.blog_id;
    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.image_alt_text !== undefined || row.image_url !== undefined) {
      restParams.image = {};
      if (row.image_alt_text !== undefined) restParams.image.alt = row.image_alt_text;
      if (row.image_url !== undefined) restParams.image.src = row.image_url;
    }
    if (row.published !== undefined) restParams.published = row.published;
    if (row.published_at !== undefined) restParams.published_at = row.published_at;
    if (row.summary_html !== undefined) restParams.summary_html = row.summary_html;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;
    if (row.tags !== undefined) restParams.tags = row.tags;
    if (row.title !== undefined) restParams.title = row.title;

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Article['rest']['params']['create'];
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (article) => {
    let obj: Article['codaRow'] = {
      ...article,
      body: striptags(article.body_html),
      summary: striptags(article.summary_html),
      admin_url: `${this.context.endpoint}/admin/articles/${article.id}`,
      published: !!article.published_at,
    };

    if (article.blog_id) {
      obj.blog = formatBlogReference(article.blog_id);
    }

    if (article.image) {
      obj.image_alt_text = article.image.alt;
      obj.image_url = article.image.src;
    }

    return obj;
  };
}
