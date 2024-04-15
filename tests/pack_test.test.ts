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
import { CustomerSyncTableSchema } from '../schemas/syncTable/CustomerSchema';
import { getUnitMap, isObject } from '../utils/helpers';
import { Action_UpdateArticle } from '../coda/setup/articles-setup';
import { METAFIELD_TYPES } from '../Resources/Mixed/Metafield.types';

// let context: MockExecutionContext;
// context = newMockExecutionContext({
//   endpoint: 'https://coda-pack-test.myshopify.com',
// });

function normalizeExpectedRowKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeExpectedRowKeys(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const pascalKey = normalizeSchemaKey(key);
      acc[pascalKey] = normalizeExpectedRowKeys(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

function compareToExpectedRow(result: any, expected: any) {
  Object.keys(result).forEach((key) => {
    if (key in expected) {
      if (Array.isArray(expected[key]) || isObject(expected[key])) {
        expect(result[key], key).toStrictEqual(expected[key]);
      } else {
        expect(result[key], key).toBe(expected[key]);
      }
    }
  });
}

const defaultExecuteOptions = {
  useRealFetcher: true,
  manifestPath: require.resolve('../pack.ts'),
};

describe('Metafields Formula', () => {
  test('MetaBoolean', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaBoolean', [true]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.boolean, value: true }));
  });
  test('MetaColor', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaColor', ['#cc0000']);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.color, value: '#cc0000' }));
  });
  test('MetaDate', async () => {
    const now = new Date();
    const result = await executeFormulaFromPackDef(pack, 'MetaDate', [now]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.date, value: now }));
  });
  test('MetaDateTime', async () => {
    const now = new Date();
    const result = await executeFormulaFromPackDef(pack, 'MetaDateTime', [now]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.date_time, value: now }));
  });
  test('MetaDimension', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaDimension', [100, 'CENTIMETERS']);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.dimension, value: { value: 100, unit: 'CENTIMETERS' } })
    );
  });
  test('MetaJson', async () => {
    const json = '{"compilerOptions":{"skipLibCheck":true,"lib":["ES2022"]},"exclude":["node_modules"]}';
    const result = await executeFormulaFromPackDef(pack, 'MetaJson', [json]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.json, value: json }));
  });
  test('MetaMetaobjectReference', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaMetaobjectReference', [445458787879]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.metaobject_reference, value: 'gid://shopify/Metaobject/445458787879' })
    );
  });
  test('MetaMixedReference', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaMixedReference', [454478845]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.mixed_reference, value: 'gid://shopify/Metaobject/454478845' })
    );
  });
  test('MetaMoney', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaMoney', [100, 'EUR']);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.money, value: { amount: 100, currency_code: 'EUR' } })
    );
  });
  test('MetaMultiLineText', async () => {
    const text = 'a multiline\ntext.';
    const result = await executeFormulaFromPackDef(pack, 'MetaMultiLineText', [text]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.multi_line_text_field, value: text }));
  });
  test('MetaNumberDecimal', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaNumberDecimal', [10.1245]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.number_decimal, value: 10.1245 }));
  });
  test('MetaNumberInteger', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaNumberInteger', [7]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.number_integer, value: 7 }));
  });
  test('MetaPageReference', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaPageReference', [454478845]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.page_reference, value: 'gid://shopify/OnlineStorePage/454478845' })
    );
  });
  test('MetaProductReference', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaProductReference', [454478845]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.product_reference, value: 'gid://shopify/Product/454478845' })
    );
  });
  test('MetaRating', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaRating', [6, 1, 10]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.rating, value: { value: 6, scale_min: 1, scale_max: 10 } })
    );
  });
  test('MetaSingleLineText', async () => {
    const text = 'a text value';
    const result = await executeFormulaFromPackDef(pack, 'MetaSingleLineText', [text]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.single_line_text_field, value: text }));
  });
  test('MetaUrl', async () => {
    const url = 'https://coda.io';
    const result = await executeFormulaFromPackDef(pack, 'MetaUrl', [url]);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.url, value: url }));
  });
  test('MetaVariantReference', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaVariantReference', [454478845]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.variant_reference, value: 'gid://shopify/ProductVariant/454478845' })
    );
  });
  test('MetaVolume', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaVolume', [100, 'CUBIC_METERS']);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.volume, value: { value: 100, unit: 'CUBIC_METERS' } })
    );
  });
  test('MetaWeight', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaWeight', [100, 'KILOGRAMS']);
    expect(result).toEqual(JSON.stringify({ type: METAFIELD_TYPES.weight, value: { value: 100, unit: 'KILOGRAMS' } }));
  });
  test('MetaCollectionReference', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaCollectionReference', [454478845]);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.collection_reference, value: 'gid://shopify/Collection/454478845' })
    );
  });
});

describe('Format Metafields Formula', () => {
  test('FormatMetafield with empty value', async () => {
    const result = await executeFormulaFromPackDef(pack, 'FormatMetafield', ['global.title_tag', '']);
    expect(result).toEqual(JSON.stringify({ key: 'global.title_tag', type: null, value: null }));
  });
  test('FormatMetafield with MetaSingleLineText', async () => {
    const result = await executeFormulaFromPackDef(pack, 'FormatMetafield', [
      'global.title_tag', // fullKey
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['Single line text value']), // value
    ]);
    expect(result).toEqual(
      JSON.stringify({
        key: 'global.title_tag',
        type: METAFIELD_TYPES.single_line_text_field,
        value: 'Single line text value',
      })
    );
  });
  test('FormatMetafield with empty MetaSingleLineText', async () => {
    const result = await executeFormulaFromPackDef(pack, 'FormatMetafield', [
      'global.title_tag', // fullKey
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['']), // value
    ]);
    expect(result).toEqual(
      JSON.stringify({
        key: 'global.title_tag',
        type: METAFIELD_TYPES.single_line_text_field,
        value: null,
      })
    );
  });

  test('FormatListMetafield with empty value', async () => {
    const result = await executeFormulaFromPackDef(pack, 'FormatListMetafield', ['custom.test_list', '']);
    expect(result).toEqual(JSON.stringify({ key: 'custom.test_list', type: null, value: null }));
  });
  test('FormatListMetafield with MetaSingleLineText', async () => {
    const varargsParameters = await Promise.all([
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['First value']),
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['Second value']),
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['Third value']),
    ]);

    const result = await executeFormulaFromPackDef(pack, 'FormatListMetafield', [
      'custom.test_list', // fullKey
      ...varargsParameters,
    ]);
    expect(result).toEqual(
      JSON.stringify({
        key: 'custom.test_list',
        type: METAFIELD_TYPES.list_single_line_text_field,
        value: ['First value', 'Second value', 'Third value'],
      })
    );
  });
  test('FormatListMetafield with MetaSingleLineText, one empty', async () => {
    const varargsParameters = await Promise.all([
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['First value']),
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['']),
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['Third value']),
    ]);

    const result = await executeFormulaFromPackDef(pack, 'FormatListMetafield', [
      'custom.test_list', // fullKey
      ...varargsParameters,
    ]);
    expect(result).toEqual(
      JSON.stringify({
        key: 'custom.test_list',
        type: METAFIELD_TYPES.list_single_line_text_field,
        value: ['First value', 'Third value'],
      })
    );
  });
  test('FormatListMetafield with MetaSingleLineText, all empty', async () => {
    const varargsParameters = await Promise.all([
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['']),
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['']),
      await executeFormulaFromPackDef(pack, 'MetaSingleLineText', ['']),
    ]);

    const result = await executeFormulaFromPackDef(pack, 'FormatListMetafield', [
      'custom.test_list', // fullKey
      ...varargsParameters,
    ]);
    expect(result).toEqual(
      JSON.stringify({
        key: 'custom.test_list',
        type: null,
        value: null,
      })
    );
  });
});
});

describe('Customer', () => {
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
    const result = await executeSyncFormulaFromPackDef(
      pack,
      'Customers',
      [
        true, // syncMetafields
        undefined, // createdAtRange
        undefined, // updatedAtRange
        [expected[0].id], // idArray
      ],
      undefined,
      { useDeprecatedResultNormalization: true },
      defaultExecuteOptions
    );

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});

describe('Product', () => {
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
    const result = await executeSyncFormulaFromPackDef(
      pack,
      'Products',
      [
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
      ],
      undefined,
      undefined,
      defaultExecuteOptions
    );

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});

describe('ProductVariant', () => {
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
    const result = await executeSyncFormulaFromPackDef(
      pack,
      'ProductVariants',
      [
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
      ],
      undefined,
      { useDeprecatedResultNormalization: true },
      defaultExecuteOptions
    );

    result.forEach((res, index) => {
      compareToExpectedRow(res, expected[index]);
    });
  });
});
