import * as coda from '@codahq/packs-sdk';
import { normalizeSchema, normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { pack } from '../pack';

import { MockExecutionContext, executeSyncFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { newJsonFetchResponse } from '@codahq/packs-sdk/dist/development';
import { newMockExecutionContext } from '@codahq/packs-sdk/dist/development';

import { expect, test, describe } from 'vitest';
import { expectedRows } from './expectedRows';
import { untransformKeys } from '@codahq/packs-sdk/dist/handler_templates';
import { getUnitMap, isObject } from '../utils/helpers';
import { Action_UpdateArticle } from '../coda/setup/articles-setup';
import { compareToExpectedRow, doSync, normalizeExpectedRowKeys } from './test-utils';

// let context: MockExecutionContext;
// context = newMockExecutionContext({
//   endpoint: 'https://coda-pack-test.myshopify.com',
// });

const defaultExecuteOptions = {
  useRealFetcher: true,
  manifestPath: require.resolve('../pack.ts'),
};

describe.concurrent('EXPECTED: Article', () => {
  test('Update', async () => {
    const emptyMetafieldInput = await executeFormulaFromPackDef(pack, 'FormatMetafield', ['global.title_tag', '']);

    /** Order must reflect what is in the parameters of {@link Action_UpdateArticle} */
    const parametersMap = new Map();
    parametersMap.set('articleId', 588854919424);
    parametersMap.set('author', 'Martin');
    parametersMap.set('blog', 'News (91627159808)');
    parametersMap.set('bodyHtml', undefined);
    parametersMap.set('summaryHtml', undefined);
    parametersMap.set('handle', 'un-test-encore');
    parametersMap.set('imageUrl', undefined);
    parametersMap.set('imageAlt', undefined);
    parametersMap.set('published', false);
    parametersMap.set('publishedAt', undefined);
    parametersMap.set('tags', undefined);
    parametersMap.set('templateSuffix', undefined);
    parametersMap.set('title', undefined);
    parametersMap.set('metafields', [emptyMetafieldInput]);

    const parameters = Array.from(parametersMap.values()) as coda.ParamValues<coda.ParamDefs>;

    const result = await executeFormulaFromPackDef(
      pack,
      'UpdateArticle',
      parameters,
      undefined,
      undefined,
      defaultExecuteOptions
    );
    // console.log('result', result);
    // compareToExpectedRow(result, expected);
  });

  test('Sync with Metafields', async () => {
    // No need to normalize with executeSyncFormulaFromPackDef…
    const expected = [expectedRows.customer];

    const result = await doSync('Articles', [
      true, // syncMetafields
      [91627159808], // blog idArray
      undefined, // author
      undefined, // createdAtRange
      undefined, // updatedAtRange
      undefined, // publishedAtRange
      undefined, // handle
      undefined, // publishedStatus
      undefined, // tagsArray
    ]);

    // const result = await executeSyncFormulaFromPackDef(
    //   pack,
    //   'Articles',
    //   [
    //     true, // syncMetafields
    //     [91627159808], // blog idArray
    //     undefined, // author
    //     undefined, // createdAtRange
    //     undefined, // updatedAtRange
    //     undefined, // publishedAtRange
    //     undefined, // handle
    //     undefined, // publishedStatus
    //     undefined, // tagLOL
    //   ],
    //   undefined,
    //   { useDeprecatedResultNormalization: true },
    //   defaultExecuteOptions
    // );

    console.log('result', result);
    // result.forEach((res, index) => {
    //   compareToExpectedRow(res, expected[index]);
    // });
  });
});

describe.concurrent('EXPECTED: Customer', () => {
  test('Fetch', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.customer);
    const result = await executeFormulaFromPackDef(
      pack,
      'Customer',
      [expected.Id],
      undefined,
      undefined,
      defaultExecuteOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Sync with Metafields', async () => {
    // No need to normalize with executeSyncFormulaFromPackDef…
    const expected = [expectedRows.customer];
    const result = await doSync('Customers', [
      true, // syncMetafields
      undefined, // createdAtRange
      undefined, // updatedAtRange
      [expected[0].id], // idArray
    ]);

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});

describe.concurrent('EXPECTED: Metafield', () => {
  test('Update', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.metafield);
    const input = await executeFormulaFromPackDef(
      pack,
      'FormatMetafield',
      [
        'global.title_tag', // fullKey
        await executeFormulaFromPackDef(
          pack,
          'MetaSingleLineText',
          [
            'vitest', // string
          ],
          undefined,
          undefined,
          defaultExecuteOptions
        ), // value
      ],
      undefined,
      undefined,
      defaultExecuteOptions
    );

    const result = await executeFormulaFromPackDef(
      pack,
      'SetMetafield',
      [
        expected.OwnerType, // string
        input, // metafieldValue
        expected.OwnerId, // ownerID
      ],
      undefined,
      undefined,
      defaultExecuteOptions
    );
    compareToExpectedRow(result, expected);
  });
});

describe.concurrent('EXPECTED: Product', () => {
  test('Fetch', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.product);
    const result = await executeFormulaFromPackDef(
      pack,
      'Product',
      [expected.Id],
      undefined,
      undefined,
      defaultExecuteOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Sync with Metafields', async () => {
    // No need to normalize with executeSyncFormulaFromPackDef…
    const expected = [expectedRows.product];
    const result = await doSync('Products', [
      undefined, // productType
      true, // syncMetafields
      undefined, // createdAtRange
      undefined, // updatedAtRange
      undefined, // publishedAtRange
      undefined, // statusArray
      undefined, // publishedStatus
      undefined, // vendor
      undefined, // handleArray
      [expected[0].id], // idArray
    ]);

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});

describe.concurrent('EXPECTED: ProductVariant', () => {
  test('Fetch', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.productVariant);
    const result = await executeFormulaFromPackDef(
      pack,
      'ProductVariant',
      [expected.Id],
      undefined,
      undefined,
      defaultExecuteOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Sync with Metafields', async () => {
    // No need to normalize with executeSyncFormulaFromPackDef…
    const expected = [expectedRows.productVariant];
    const result = await doSync('ProductVariants', [
      undefined, // productType
      true, // syncMetafields
      undefined, // createdAtRange
      undefined, // updatedAtRange
      undefined, // publishedAtRange
      undefined, // statusArray
      undefined, // publishedStatus
      undefined, // vendor
      undefined, // handleArray
      [expectedRows.product.id], // idArray
    ]);

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});
