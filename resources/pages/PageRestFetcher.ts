import * as coda from '@codahq/packs-sdk';

import striptags from 'striptags';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { Page, pageResource } from './pageResource';

// #endregion
export class PageRestFetcher extends SimpleRest<Page> {
  constructor(context: coda.ExecutionContext) {
    super(pageResource, context);
  }

  validateParams = (
    params: Page['rest']['params']['update'] | Page['rest']['params']['create'] | Page['rest']['params']['sync']
  ) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Page['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Page['rest']['params']['update'] | Page['rest']['params']['create'] | undefined => {
    let restParams: Page['rest']['params']['update'] | Page['rest']['params']['create'] = {};

    if (row.author !== undefined) restParams.author = row.author;
    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.published !== undefined) restParams.published = row.published;
    if (row.published_at !== undefined) restParams.published_at = row.published_at;
    if (row.title !== undefined) restParams.title = row.title;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Page['rest']['params']['create'];
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (page): Page['codaRow'] => {
    let obj: Page['codaRow'] = {
      ...page,
      admin_url: `${this.context.endpoint}/admin/pages/${page.id}`,
      body: striptags(page.body_html),
      published: !!page.published_at,
    };

    if (!!page.published_at && page.handle) {
      obj.shop_url = `${this.context.endpoint}/pages/${page.handle}`;
    }

    return obj;
  };
}
