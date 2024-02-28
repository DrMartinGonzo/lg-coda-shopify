import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { ArticleSyncTableSchema } from '../schemas/syncTable/ArticleSchema';
import { getThumbnailUrlFromFullUrl } from '../helpers';
import { FetchRequestOptions } from '../types/Requests';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getMetafieldKeyValueSetsFromUpdate,
  updateAndFormatResourceMetafieldsRest,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { ArticleCreateRestParams, ArticleUpdateRestParams } from '../types/Article';
import { restResources } from '../types/RequestsRest';
import { formatBlogReferenceValueForSchema } from '../schemas/syncTable/BlogSchema';

// #region Helpers
function formatArticleStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof ArticleSyncTableSchema>['newValue']
) {
  const restParams: any = {};

  standardFromKeys.forEach((fromKey) => {
    const value = values[fromKey];

    // Edge cases
    if (fromKey === 'image_alt_text') {
      restParams.image = {
        ...(restParams.image ?? {}),
        alt: value,
      };
    } else if (fromKey === 'image_url') {
      restParams.image = {
        ...(restParams.image ?? {}),
        src: value,
      };
    } else if (fromKey === 'blog') {
      restParams.blog_id = value.id;
    }
    // No processing needed
    else {
      restParams[fromKey] = value;
    }
  });

  return restParams;
}

/**
 * Gère un update depuis Coda vers Shopify pour les articles
 * Pas la même stratégie que d'habitude pour cette fonction.
 * On ne peut pas directement update les metafields pour les articles.
 * Il va falloir faire un appel séparé pour chaque metafield
 */
export async function handleArticleUpdateJob(
  update: coda.SyncUpdate<string, string, typeof ArticleSyncTableSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: (Promise<any> | undefined)[] = [];
  const articleId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: ArticleUpdateRestParams = formatArticleStandardFieldsRestParams(
      standardFromKeys,
      update.newValue
    );
    subJobs.push(updateArticleRest(articleId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      updateAndFormatResourceMetafieldsRest(
        {
          ownerId: articleId,
          ownerResource: restResources.Article,
          metafieldKeyValueSets: await getMetafieldKeyValueSetsFromUpdate(
            prefixedMetafieldFromKeys,
            update.newValue,
            metafieldDefinitions,
            context
          ),
        },
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.all(subJobs);
  if (updateJob?.body?.article) {
    obj = {
      ...obj,
      ...formatArticleForSchemaFromRestApi(updateJob.body.article, context),
    };
  }
  if (metafieldsJob) {
    obj = {
      ...obj,
      ...metafieldsJob,
    };
  }
  return obj;
}
// #endregion

// #region Formatting functions
export const formatArticleForSchemaFromRestApi = (article, context: coda.ExecutionContext) => {
  let obj: any = {
    ...article,
    body: striptags(article.body_html),
    summary: striptags(article.summary_html),
    admin_url: `${context.endpoint}/admin/articles/${article.id}`,
    published: !!article.published_at,
  };

  if (article.blog_id) {
    obj.blog = formatBlogReferenceValueForSchema(article.blog_id);
  }

  if (article.image) {
    obj.thumbnail = getThumbnailUrlFromFullUrl(article.image.src);
    obj.image_alt_text = article.image.alt;
    obj.image_url = article.image.src;
  }

  return obj;
};

export function validateArticleParams(params: any) {
  const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
  if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
    throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
  }
}
// #endregion

// #region Rest Requests
export const fetchSingleArticleRest = (
  articleId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles/${articleId}.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
};

export const createArticleRest = (
  params: ArticleCreateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  validateArticleParams(params);
  const payload = { article: cleanQueryParams(params) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles.json`;
  return makePostRequest({ ...requestOptions, url, payload }, context);
};

export const updateArticleRest = (
  articleId: number,
  params: ArticleUpdateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const restParams = cleanQueryParams(params);
  if (Object.keys(restParams).length) {
    // validateBlogParams(params);
    const payload = { article: restParams };
    const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles/${articleId}.json`;
    return makePutRequest({ ...requestOptions, url, payload }, context);
  }
};

export const deleteArticleRest = async (
  articleId: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles/${articleId}.json`;
  return makeDeleteRequest({ ...requestOptions, url }, context);
};
// #endregion
