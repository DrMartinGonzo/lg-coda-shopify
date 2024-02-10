import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { CACHE_SINGLE_FETCH, REST_DEFAULT_API_VERSION } from '../constants';
import { FormatFunction } from '../types/misc';

import { RedirectSchema } from './redirects-schema';
import { RedirectCreateRestParams, RedirectUpdateRestParams } from '../types/Redirect';

// #region Helpers
export function formatRedirectStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof RedirectSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    restParams[fromKey] = values[fromKey];
  });
  return restParams;
}

export async function handleRedirectUpdateJob(
  update: coda.SyncUpdate<string, string, typeof RedirectSchema>,
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;

  let obj = { ...update.previousValue };
  const redirectId = update.previousValue.id as number;

  if (updatedFields.length) {
    const restParams: RedirectUpdateRestParams = formatRedirectStandardFieldsRestParams(updatedFields, update.newValue);
    const restResponse = await updateRedirectRest(redirectId, restParams, context);
    if (restResponse) {
      if (restResponse.body?.redirect) {
        obj = {
          ...obj,
          ...formatRedirectForSchemaFromRestApi(restResponse.body.redirect, context),
        };
      }
    }
  }

  return obj;
}
// #endregion

// #region Formatting
export const formatRedirectForSchemaFromRestApi: FormatFunction = (redirect, context) => {
  let obj: any = {
    ...redirect,
    admin_url: `${context.endpoint}/admin/redirects/${redirect.id}`,
  };
  if (redirect.path) {
    obj.test_url = `${context.endpoint}${redirect.path}`;
  }

  return obj;
};
// #endregion

// #region Rest requests
export const fetchRedirectRest = (redirect_id: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects/${redirect_id}.json`;
  return makeGetRequest({ url, cacheTtlSecs: CACHE_SINGLE_FETCH }, context);
};

export function createRedirectRest(params: RedirectCreateRestParams, context: coda.ExecutionContext) {
  const restParams = cleanQueryParams(params);
  // validateRedirectsParams(restParams);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects.json`;
  const payload = { redirect: restParams };
  return makePostRequest({ url, payload }, context);
}

export const updateRedirectRest = async (
  redirectId: number,
  params: RedirectUpdateRestParams,
  context: coda.ExecutionContext
) => {
  const restParams = cleanQueryParams(params);
  // validateRedirectsParams(params);
  const payload = { redirect: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects/${redirectId}.json`;
  return makePutRequest({ url, payload }, context);
};

export const deleteRedirect = async (redirect_id: number, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects/${redirect_id}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion
