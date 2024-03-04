// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';

import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { RestResourceName } from '../types/RequestsRest';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { PageSyncTableSchema } from '../schemas/syncTable/PageSchema';

import type { PageRow } from '../types/CodaRows';
import type { PageCreateRestParams, PageUpdateRestParams } from '../types/Page';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';

// #endregion

export class PageRestFetcher extends SimpleRest<RestResourceName.Page, typeof PageSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Page, PageSyncTableSchema, context);
  }

  validateParams = (params: any) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<PageRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): PageUpdateRestParams | PageCreateRestParams | undefined => {
    let restParams: PageUpdateRestParams | PageCreateRestParams = {};

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
      restParams = { ...restParams, metafields: metafieldRestInputs } as PageCreateRestParams;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (page): PageRow => {
    let obj: PageRow = {
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
