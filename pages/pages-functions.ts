import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION } from '../constants';
import {
  cleanQueryParams,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
  makeSyncTableGetRequest,
} from '../helpers-rest';
import { pageFieldDependencies } from './pages-schema';
import { handleFieldDependencies } from '../helpers';
import { FormatFunction } from '../types/misc';
import { SyncTableRestContinuation } from '../types/tableSync';
import { graphQlGidToId } from '../helpers-graphql';

export const formatPage: FormatFunction = (page, context) => {
  page.admin_url = `${context.endpoint}/admin/pages/${page.id}`;
  page.body = striptags(page.body_html);
  page.published = !!page.published_at;
  return page;
};

function validatePageParams(params: any) {
  if (params.published_status && !OPTIONS_PUBLISHED_STATUS.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}

export const fetchPage = async ([pageGid], context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages/${graphQlGidToId(pageGid)}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  if (response.body.page) {
    return formatPage(response.body.page, context);
  }
};

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
  const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
  const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, pageFieldDependencies);

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

  let url =
    prevContinuation?.nextUrl ??
    coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages.json`, params);

  return await makeSyncTableGetRequest(
    {
      url,
      formatFunction: formatPage,
      cacheTtlSecs: 0,
      mainDataKey: 'pages',
    },
    context
  );
};

export const createPage = async (fields: { [key: string]: any }, context: coda.ExecutionContext) => {
  validatePageParams(fields);

  const payload = { page: cleanQueryParams(fields) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages.json`;

  return makePostRequest({ url, payload }, context);
};

export const updatePage = async (pageGid, fields: { [key: string]: any }, context: coda.ExecutionContext) => {
  const params = cleanQueryParams(fields);

  validatePageParams(params);

  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages/${graphQlGidToId(pageGid)}.json`;
  const response = await makePutRequest({ url, payload: { page: params } }, context);

  return formatPage(response.body.page, context);
};

export const deletePage = async ([pageGID], context) => {
  const pageId = graphQlGidToId(pageGID);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages/${pageId}.json`;
  return makeDeleteRequest({ url }, context);
};
