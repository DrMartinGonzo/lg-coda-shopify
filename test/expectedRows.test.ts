import * as coda from '@codahq/packs-sdk';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { describe, expect, test } from 'vitest';
import { pack } from '../pack';

import { expectedRows } from './expectedRows';
import { compareToExpectedRow, doSync, normalizeExpectedRowKeys } from './test-utils';
import { Action_UpdateArticle } from '../coda/setup/articles-setup';
import { Action_SetTranslation } from '../coda/setup/translations-setup';

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
      true, // syncMetafields
      undefined, // productTypesArray
      undefined, // createdAtRange
      undefined, // updatedAtRange
      undefined, // statusArray
      undefined, // publishedStatus
      undefined, // vendorsArray
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
      true, // syncMetafields
      undefined, // productType
      undefined, // createdAtRange
      undefined, // updatedAtRange
      undefined, // statusArray
      undefined, // publishedStatus
      undefined, // vendorsArray
      undefined, // skuArray
      [expectedRows.product.id], // idArray
    ]);

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});

describe.concurrent('EXPECTED: Translation', () => {
  test('Update', async () => {
    const originalValue = 'VANS UPDATED (FR)';
    const updatedValue = 'VANS UPDATED (FR) (UPDATED)';

    /** Order must reflect what is in the parameters of {@link Action_SetTranslation} */
    const parametersMap = new Map<string, any>();
    parametersMap.set('resourceType', 'COLLECTION');
    parametersMap.set('resourceId', 413086843136);
    parametersMap.set('locale', 'fr');
    parametersMap.set('key', 'title');
    parametersMap.set('value', updatedValue);

    async function update(parametersMap: Map<string, any>) {
      return executeFormulaFromPackDef(
        pack,
        'SetTranslation',
        Array.from(parametersMap.values()) as coda.ParamValues<coda.ParamDefs>,
        undefined,
        undefined,
        defaultExecuteOptions
      );
    }

    const updateResult = await update(parametersMap);
    expect(updateResult.TranslatedValue, 'Should have updated translation').toBe(updatedValue);

    parametersMap.set('value', originalValue);
    const revertResult = await update(parametersMap);
    expect(revertResult.TranslatedValue, 'Should have reverted to original value').toBe(originalValue);
  });
});
