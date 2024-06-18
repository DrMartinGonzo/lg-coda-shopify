import * as coda from '@codahq/packs-sdk';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { describe, expect, test } from 'vitest';
import { pack } from '../pack';

import { expectedRows } from './expectedRows';
import { compareToExpectedRow, doSync, normalizeExpectedRowKeys } from './test-utils';
import { MetafieldOwnerType } from '../types/admin.types';

test('Sync Articles with Metafields', async () => {
  // No need to normalize with executeSyncFormulaFromPackDef…
  const expected = expectedRows.article;

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

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected
  );
});

test('Sync Blogs with Metafields', async () => {
  // No need to normalize with executeSyncFormulaFromPackDef…
  const expected = expectedRows.blog;

  const result = await doSync('Blogs', [
    true, // syncMetafields
  ]);
  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected
  );
});

test('Sync Customers with Metafields', async () => {
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

test('Sync MetafieldDefinitions', async () => {
  const expected = expectedRows.metafieldDefinition;
  const result = await doSync('MetafieldDefinitions', [
    MetafieldOwnerType.Page, // ownerType
  ]);

  compareToExpectedRow(
    result.find((res) => res.Id === expected.id),
    normalizeExpectedRowKeys(expected)
  );
});

test('Sync Pages with Metafields', async () => {
  // No need to normalize with executeSyncFormulaFromPackDef…
  const expected = expectedRows.page;

  const result = await doSync('Pages', [
    true, // syncMetafields
    undefined, // createdAtRange
    undefined, // updatedAtRange
    undefined, // publishedAtRange
    'vitest', // handle
    undefined, // publishedStatus
    undefined, // sinceId
    undefined, // title
  ]);
  // console.log('result', result);
  // throw new Error('Not implemented');
  compareToExpectedRow(result[0], expected);
});

test('Sync Products with Metafields', async () => {
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
    [expectedRows.product.id], // idArray
  ]);

  result.forEach((res, index) => {
    compareToExpectedRow(res, expected[index]);
  });
});

test('Sync ProductVariants with Metafields', async () => {
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
