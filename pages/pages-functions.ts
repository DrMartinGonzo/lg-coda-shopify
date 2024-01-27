import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import {
  METAFIELD_GID_PREFIX_KEY,
  METAFIELD_PREFIX_KEY,
  OPTIONS_PUBLISHED_STATUS,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
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
import {
  fetchMetafieldDefinitions,
  fetchResourceMetafields,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
} from '../metafields/metafields-functions';
import { Metafield, MetafieldDefinition } from '../types/admin.types';

import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';

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
    syncMetafields,
    created_at_max,
    created_at_min,
    handle,
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
  const effectiveMetafieldKeys = effectivePropertyKeys
    .filter((key) => key.startsWith(METAFIELD_PREFIX_KEY) || key.startsWith(METAFIELD_GID_PREFIX_KEY))
    .map(getMetaFieldRealFromKey);
  const shouldSyncMetafields = !!effectiveMetafieldKeys.length;
  let metafieldDefinitions: MetafieldDefinition[] = [];
  if (shouldSyncMetafields) {
    metafieldDefinitions =
      prevContinuation?.extraContinuationData?.metafieldDefinitions ??
      (await fetchMetafieldDefinitions('PAGE', context));
  }
  const syncedFields = handleFieldDependencies(effectivePropertyKeys, pageFieldDependencies);

  const params = cleanQueryParams({
    fields: syncedFields.join(', '),
    created_at_max,
    created_at_min,
    handle,
    // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
    // TODO: calculate best possible value based on effectiveMetafieldKeys.length
    limit: shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
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

  let restResult = [];
  let { response, continuation } = await makeSyncTableGetRequest(
    { url, extraContinuationData: { metafieldDefinitions } },
    context
  );
  if (response && response.body?.pages) {
    restResult = response.body.pages.map((page) => formatPage(page, context));
  }

  // Add metafields by doing multiple Rest Admin API calls
  if (shouldSyncMetafields) {
    restResult = await Promise.all(
      restResult.map(async (resource) => {
        const response = await fetchResourceMetafields(resource.id, 'page', {}, context);

        // Only keep metafields that have a definition are in the schema
        const metafields: MetafieldRest[] = response.body.metafields.filter((meta: MetafieldRest) =>
          effectiveMetafieldKeys.includes(`${meta.namespace}.${meta.key}`)
        );
        if (metafields.length) {
          return {
            ...resource,
            ...formatMetafieldsForSchema(metafields, metafieldDefinitions),
          };
        }
        return resource;
      })
    );
  }

  return { result: restResult, continuation };
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
