// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS } from '../../constants';

import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { SimpleRestNew } from '../../Fetchers/SimpleRest';
import { pageFieldDependencies } from '../../schemas/syncTable/PageSchema';
import { SyncTableRestNew } from '../../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../../helpers';
import { cleanQueryParams } from '../../helpers-rest';

import type { Page } from '../../types/Resources/Page';
import type { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import type { Sync_Pages } from './pages-setup';
import type { SyncTableType } from '../../types/SyncTable';
import { pageResource } from '../allResources';

// #region Classes
export type PageSyncTableType = SyncTableType<
  typeof pageResource,
  Page.Row,
  Page.Params.Sync,
  Page.Params.Create,
  Page.Params.Update
>;

export class PageSyncTable extends SyncTableRestNew<PageSyncTableType> {
  constructor(fetcher: PageRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(pageResource, fetcher, params);
  }

  setSyncParams() {
    const [syncMetafields, created_at, updated_at, published_at, handle, published_status, since_id, title] = this
      .codaParams as SyncTableParamValues<typeof Sync_Pages>;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, pageFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      published_at_min: published_at ? published_at[0] : undefined,
      published_at_max: published_at ? published_at[1] : undefined,
      handle,
      // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
      // TODO: calculate best possible value based on effectiveMetafieldKeys.length
      limit: this.restLimit,
      published_status,
      since_id,
      title,
    });
  }
}
// #endregion
export class PageRestFetcher extends SimpleRestNew<PageSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(pageResource, context);
  }

  validateParams = (params: Page.Params.Update | Page.Params.Create | Page.Params.Sync) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Page.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Page.Params.Update | Page.Params.Create | undefined => {
    let restParams: Page.Params.Update | Page.Params.Create = {};

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
      restParams = { ...restParams, metafields: metafieldRestInputs } as Page.Params.Create;
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (page): Page.Row => {
    let obj: Page.Row = {
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
