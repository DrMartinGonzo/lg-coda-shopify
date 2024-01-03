import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS } from '../constants';
import { cleanQueryParams, restGetRequest, restPutRequest, syncTableRestGetRequest } from '../helpers-rest';

export const formatPage = (page) => {
  page.body = striptags(page.body_html);
  return page;
};

function validatePageParams(params: any) {
  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}

export const syncPages = async (
  [
    created_at_max,
    created_at_min,
    handle,
    maxEntriesPerRun,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  ],
  context: coda.SyncExecutionContext
) => {
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    created_at_max,
    created_at_min,
    handle,
    limit: maxEntriesPerRun,
    published_at_max,
    published_at_min,
    published_status,
    since_id,
    title,
    updated_at_max,
    updated_at_min,
  });

  validatePageParams(params);

  let url = (context.sync.continuation ??
    coda.withQueryParams(`${context.endpoint}/admin/api/2023-07/pages.json`, params)) as string;

  return await syncTableRestGetRequest(
    {
      url,
      formatFunction: formatPage,
      cacheTtlSecs: 0,
      mainDataKey: 'pages',
    },
    context
  );
};
