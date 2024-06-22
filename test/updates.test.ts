// #region Imports

import * as coda from '@codahq/packs-sdk';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { describe, expect, test } from 'vitest';
import { pack } from '../pack';

import { Action_UpdateArticle } from '../coda/setup/articles-setup';
import { graphQlGidToId } from '../graphql/utils/graphql-utils';
import { SupportedMetafieldOwnerResource } from '../models/rest/MetafieldModel';
import { preprendPrefixToMetaFieldKey, restOwnerNameToOwnerType } from '../models/utils/metafields-utils';
import {
  defaultIntegrationContextOptions,
  defaultIntegrationUpdateExecuteOptions,
  formatMetafieldInput,
  formatMetafieldSingleLineTextInput,
  referenceIds,
} from './utils/test-utils';

import singleGraphQlMetafieldApiData from './__snapshots__/api/graphqlMetafield.single.json';
import singleRestMetafieldApiData from './__snapshots__/api/restMetafield.single.json';
import singleTranslationApiData from './__snapshots__/api/translation.single.json';

// #endregion

type UpdateArticleParams = coda.ParamValues<(typeof Action_UpdateArticle)['parameters']>;

const UPDATED = '_updated';

describe.skip('INTEGRATION: Update Action', () => {
  test('Article', async () => {
    const parameters = [
      referenceIds.update.article, // articleId
      undefined, // author
      undefined, // blog
      undefined, // bodyHtml
      undefined, // summaryHtml
      undefined, // handle
      undefined, // imageUrl
      undefined, // imageAlt
      undefined, // published
      undefined, // publishedAt
      undefined, // tags
      undefined, // templateSuffix
      undefined, // title
      undefined, // metafields
    ] as UpdateArticleParams;

    const noImageParameters = [
      ...parameters.slice(0, 6),
      null, // imageUrl
      '', // imageAlt
      ...parameters.slice(8),
    ] as UpdateArticleParams;

    const noImageAndAltParameters = [
      ...parameters.slice(0, 6),
      null, // imageUrl
      'dummy', // imageAlt
      ...parameters.slice(8),
    ] as UpdateArticleParams;

    const customMetafieldKey = 'custom.test';
    const customMetafieldParameters = [
      ...parameters.slice(0, 13),
      [await formatMetafieldInput(customMetafieldKey, await formatMetafieldSingleLineTextInput('bonjour !'))],
    ] as UpdateArticleParams;

    const emptyCustomMetafieldParameters = [
      ...parameters.slice(0, 13),
      [await formatMetafieldInput(customMetafieldKey, await formatMetafieldSingleLineTextInput(''))],
    ] as UpdateArticleParams;

    const newImageUrl =
      'https://m.media-amazon.com/images/S/pv-target-images/450cb81032f06cb5d3ce8430e41dcc10a2d8a558a6c76f86beeb2c070ec579ee.jpg';
    const ImageAndAltParameters = [
      ...parameters.slice(0, 6),
      newImageUrl, // imageUrl
      'dummy', // imageAlt
      ...parameters.slice(8),
    ] as UpdateArticleParams;

    async function update(params: UpdateArticleParams) {
      return executeFormulaFromPackDef(
        pack,
        'UpdateArticle',
        params,
        undefined,
        defaultIntegrationUpdateExecuteOptions,
        defaultIntegrationContextOptions
      );
    }

    const updateResult = await update(noImageParameters);
    expect.soft(updateResult.image_url, 'there should be no image url').toEqual(null);
    expect.soft(updateResult.image_alt_text, 'there should be no image alt text').toEqual(null);

    const updateResult2 = await update(noImageAndAltParameters);
    expect.soft(updateResult2.image_url, 'there should be no image url').toEqual(null);
    expect.soft(updateResult2.image_alt_text, 'there should be no image alt text').toEqual(null);

    const updateResult3 = await update(ImageAndAltParameters);
    expect.soft(updateResult3.image_url, 'image filename should be equal').toBeTypeOf('string');
    expect.soft(updateResult3.image_alt_text).toEqual('dummy');

    const updateResult4 = await update(customMetafieldParameters);
    expect.soft(updateResult4[preprendPrefixToMetaFieldKey(customMetafieldKey)]).toEqual('bonjour !');

    const updateResult5 = await update(emptyCustomMetafieldParameters);
    expect.soft(updateResult5[preprendPrefixToMetaFieldKey(customMetafieldKey)]).toEqual(null);
  });

  test('GraphQl Metafield', async () => {
    const original = singleGraphQlMetafieldApiData;
    const originalValue = original.value;
    const newValue = originalValue + UPDATED;

    async function update(value: string) {
      const metafieldInput = await formatMetafieldInput(
        'global.title_tag',
        await formatMetafieldSingleLineTextInput(value)
      );

      return executeFormulaFromPackDef(
        pack,
        'SetMetafield',
        [
          original.ownerType, // string
          metafieldInput, // metafieldValue
          graphQlGidToId(original.owner.id), // ownerID
        ],
        undefined,
        defaultIntegrationUpdateExecuteOptions,
        defaultIntegrationContextOptions
      );
    }

    const updatedResult = await update(newValue);
    expect.soft(updatedResult.rawValue).toEqual(newValue);

    const restoreResult = await update(originalValue);
    expect.soft(restoreResult.rawValue).toEqual(originalValue);
  });

  test('Rest Metafield', async () => {
    const original = singleRestMetafieldApiData;
    const originalValue = original.value;
    const newValue = originalValue + UPDATED;

    async function update(value: string) {
      const metafieldInput = await formatMetafieldInput(
        'global.title_tag',
        await formatMetafieldSingleLineTextInput(value)
      );

      return executeFormulaFromPackDef(
        pack,
        'SetMetafield',
        [
          restOwnerNameToOwnerType(original.owner_resource as SupportedMetafieldOwnerResource), // string
          metafieldInput, // metafieldValue
          original.owner_id, // ownerID
        ],
        undefined,
        defaultIntegrationUpdateExecuteOptions,
        defaultIntegrationContextOptions
      );
    }

    const updatedResult = await update(newValue);
    expect.soft(updatedResult.rawValue).toEqual(newValue);

    const restoreResult = await update(originalValue);
    expect.soft(restoreResult.rawValue).toEqual(originalValue);
  });

  test('Translation', async () => {
    const original = singleTranslationApiData;
    const originalValue = original.translatedValue;
    const newValue = originalValue + UPDATED;

    async function update(value: string) {
      return executeFormulaFromPackDef(
        pack,
        'SetTranslation',
        [
          'COLLECTION',
          referenceIds.sync.smartCollection,
          original.locale,
          original.key,
          value,
        ] as coda.ParamValues<coda.ParamDefs>,
        undefined,
        defaultIntegrationUpdateExecuteOptions,
        defaultIntegrationContextOptions
      );
    }

    const updatedResult = await update(newValue);
    expect.soft(updatedResult.translatedValue).toEqual(newValue);

    const restoreResult = await update(originalValue);
    expect.soft(restoreResult.translatedValue).toEqual(originalValue);
  });
});
