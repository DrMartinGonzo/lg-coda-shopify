import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { NOT_FOUND, OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_API_VERSION } from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePostRequest, makePutRequest } from '../helpers-rest';
import { ArticleSchema } from '../schemas/syncTable/ArticleSchema';
import { getThumbnailUrlFromFullUrl } from '../helpers';
import { FormatFunction } from '../types/misc';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getMetafieldKeyValueSetsFromUpdate,
  handleResourceMetafieldsUpdateRest,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { ArticleCreateRestParams, ArticleUpdateRestParams } from '../types/Article';
import { restResources } from '../types/Rest';

// #region Helpers
function formatArticleStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof ArticleSchema>['newValue']
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
  update: coda.SyncUpdate<string, string, typeof ArticleSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
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
      handleResourceMetafieldsUpdateRest(
        articleId,
        restResources.Article,
        getMetafieldKeyValueSetsFromUpdate(prefixedMetafieldFromKeys, update.newValue, metafieldDefinitions),
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.allSettled(subJobs);
  if (updateJob && updateJob.status === 'fulfilled' && updateJob.value) {
    if (updateJob.value.body?.article) {
      obj = {
        ...obj,
        ...formatArticleForSchemaFromRestApi(updateJob.value.body.article, context),
      };
    }
  }

  if (metafieldsJob && metafieldsJob.status === 'fulfilled' && metafieldsJob.value) {
    obj = {
      ...obj,
      ...metafieldsJob.value,
    };
  }

  return obj;
}
// #endregion

// #region Formatting functions
export const formatArticleForSchemaFromRestApi: FormatFunction = (article, context) => {
  let obj: any = {
    ...article,
    body: striptags(article.body_html),
    summary: striptags(article.summary_html),
    admin_url: `${context.endpoint}/admin/articles/${article.id}`,
    published: !!article.published_at,
  };

  if (article.blog_id) {
    obj.blog = {
      id: article.blog_id,
      title: NOT_FOUND,
    };
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
export const fetchArticleRest = (articleId: number, context: coda.ExecutionContext) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles/${articleId}.json`;
  return makeGetRequest({ url, cacheTtlSecs: 10 }, context);
};

export const createArticleRest = (params: ArticleCreateRestParams, context: coda.ExecutionContext) => {
  validateArticleParams(params);
  const payload = { article: cleanQueryParams(params) };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles.json`;
  return makePostRequest({ url, payload }, context);
};

export const updateArticleRest = (
  articleId: number,
  params: ArticleUpdateRestParams,
  context: coda.ExecutionContext
) => {
  const restParams = cleanQueryParams(params);
  // validateBlogParams(params);
  const payload = { article: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles/${articleId}.json`;
  return makePutRequest({ url, payload }, context);
};

export const deleteArticleRest = async (articleId: number, context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/articles/${articleId}.json`;
  return makeDeleteRequest({ url }, context);
};
// #endregion
