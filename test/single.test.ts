import * as coda from '@codahq/packs-sdk';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { describe, expect, test } from 'vitest';
import { pack } from '../pack';

import { expectedRows } from './expectedRows';
import { compareToExpectedRow, normalizeExpectedRowKeys } from './test-utils';

const defaultExecuteOptions = {
  useRealFetcher: true,
  manifestPath: require.resolve('../pack.ts'),
};

test('Single Article', async () => {
  const expected = normalizeExpectedRowKeys(expectedRows.article);
  const result = await executeFormulaFromPackDef(
    pack,
    'Article',
    [expected.Id],
    undefined,
    undefined,
    defaultExecuteOptions
  );
  compareToExpectedRow(result, expected);
});

test('Single Blog', async () => {
  const expected = normalizeExpectedRowKeys(expectedRows.blog);
  const result = await executeFormulaFromPackDef(
    pack,
    'Blog',
    [expected.Id],
    undefined,
    undefined,
    defaultExecuteOptions
  );
  compareToExpectedRow(result, expected);
});

test('Single Page', async () => {
  const expected = normalizeExpectedRowKeys(expectedRows.page);
  const result = await executeFormulaFromPackDef(
    pack,
    'Page',
    [expected.Id],
    undefined,
    undefined,
    defaultExecuteOptions
  );
  compareToExpectedRow(result, expected);
});

test('Single Customer', async () => {
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

test('Single MetafieldDefinition', async () => {
  const expected = normalizeExpectedRowKeys(expectedRows.metafieldDefinition);
  const result = await executeFormulaFromPackDef(
    pack,
    'MetafieldDefinition',
    [expected.Id],
    undefined,
    undefined,
    defaultExecuteOptions
  );
  compareToExpectedRow(result, expected);
});

test('Single Product', async () => {
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

test('Single ProductVariant', async () => {
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
