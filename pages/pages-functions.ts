import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';

import { FormatFunction } from '../types/misc';
import { PageSchema } from '../schemas/syncTable/PageSchema';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getMetafieldKeyValueSetsFromUpdate,
  handleResourceMetafieldsUpdateRest,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { PageCreateRestParams, PageUpdateRestParams } from '../types/Page';
import { restResources } from '../types/Rest';

// #region Helpers
function formatPageStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof PageSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    restParams[fromKey] = values[fromKey];
  });
  return restParams;
}

/**
 * On peut créer des metafields directement en un call mais apparemment ça ne
 * fonctionne que pour les créations, pas les updates, du coup on applique la
 * même stratégie que pour handleArticleUpdateJob, CAD il va falloir faire un
 * appel séparé pour chaque metafield
 */
export async function handlePageUpdateJob(
  update: coda.SyncUpdate<string, string, typeof PageSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const pageId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: PageUpdateRestParams = formatPageStandardFieldsRestParams(standardFromKeys, update.newValue);
    subJobs.push(updatePageRest(pageId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateRest(
        pageId,
        restResources.Page,
        getMetafieldKeyValueSetsFromUpdate(prefixedMetafieldFromKeys, update.newValue, metafieldDefinitions),
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.allSettled(subJobs);
  if (updateJob) {
    if (updateJob.status === 'fulfilled' && updateJob.value) {
      if (updateJob.value.body?.page) {
        obj = {
          ...obj,
          ...formatPageForSchemaFromRestApi(updateJob.value.body.page, context),
        };
      }
    } else if (updateJob.status === 'rejected') {
      throw new coda.UserVisibleError(updateJob.reason);
    }
  }
  if (metafieldsJob) {
    if (metafieldsJob.status === 'fulfilled' && metafieldsJob.value) {
      obj = {
        ...obj,
        ...metafieldsJob.value,
      };
    } else if (metafieldsJob.status === 'rejected') {
      throw new coda.UserVisibleError(metafieldsJob.reason);
    }
  }

  return obj;
}
// #endregion

// #region Formatting functions
export const formatPageForSchemaFromRestApi: FormatFunction = (page, context) => {
  let obj: any = {
    ...page,
    admin_url: `${context.endpoint}/admin/pages/${page.id}`,
    body: striptags(page.body_html),
    published: !!page.published_at,
  };

  if (!!page.published_at && page.handle) {
    obj.shop_url = `${context.endpoint}/pages/${page.handle}`;
  }

  return obj;
};

export function validatePageParams(params: any) {
  const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}
// #endregion

// #region Rest Requests
export const fetchPageRest = (pageId: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages/${pageId}.json`;
  return makeGetRequest({ url, cacheTtlSecs: 10 }, context);
};

export const createPageRest = (params: PageCreateRestParams, context: coda.ExecutionContext) => {
  validatePageParams(params);
  const payload = { page: cleanQueryParams(params) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages.json`;
  return makePostRequest({ url, payload }, context);
};

export const updatePageRest = (pageId: number, params: PageUpdateRestParams, context: coda.ExecutionContext) => {
  const restParams = cleanQueryParams(params);
  validatePageParams(restParams);
  const payload = { page: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages/${pageId}.json`;
  return makePutRequest({ url, payload }, context);
};

export const deletePageRest = (pageId: number, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages/${pageId}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion
