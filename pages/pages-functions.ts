import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';

import { FormatFunction } from '../types/misc';
import { graphQlGidToId } from '../helpers-graphql';

export const formatPage: FormatFunction = (page, context) => {
  page.admin_url = `${context.endpoint}/admin/pages/${page.id}`;
  page.body = striptags(page.body_html);
  page.published = !!page.published_at;
  return page;
};

export function validatePageParams(params: any) {
  const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
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
