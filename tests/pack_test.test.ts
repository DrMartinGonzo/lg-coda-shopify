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
import { isObject } from '../utils/helpers';

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
