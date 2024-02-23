import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { REST_DEFAULT_API_VERSION } from '../constants';
import { FetchRequestOptions } from '../types/Requests';

import { RedirectSchema } from '../schemas/syncTable/RedirectSchema';
import { RedirectCreateRestParams, RedirectUpdateRestParams } from '../types/Redirect';

// #region Helpers
function formatRedirectStandardFieldsRestParams(
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
export const formatRedirectForSchemaFromRestApi = (redirect, context: coda.ExecutionContext) => {
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
export const fetchSingleRedirectRest = (
  redirectId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const { cacheTtlSecs } = requestOptions;
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects/${redirectId}.json`;
  return makeGetRequest({ url, cacheTtlSecs }, context);
};

export function createRedirectRest(
  params: RedirectCreateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const restParams = cleanQueryParams(params);
  // validateRedirectsParams(restParams);
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects.json`;
  const payload = { redirect: restParams };
  return makePostRequest({ url, payload }, context);
}

const updateRedirectRest = async (
  redirectId: number,
  params: RedirectUpdateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const restParams = cleanQueryParams(params);
  // validateRedirectsParams(params);
  const payload = { redirect: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects/${redirectId}.json`;
  return makePutRequest({ url, payload }, context);
};

export const deleteRedirect = async (
  redirectId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects/${redirectId}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion
