// #region Imports
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { pack } from '../pack';

import { describe, expect, test } from 'vitest';
import { METAFIELD_TYPES } from '../constants/metafields-constants';

// #endregion

describe.concurrent('Metafields Formula', () => {
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
  test('MetaFileReference: GenericFile', async () => {
    const result = await executeFormulaFromPackDef(pack, 'MetaFileReference', [445458787879, 'GenericFile']);
    expect(result).toEqual(
      JSON.stringify({ type: METAFIELD_TYPES.file_reference, value: 'gid://shopify/GenericFile/445458787879' })
    );
  });
  test('MetaFileReference: throw on wrong fileType', async () => {
    const result = executeFormulaFromPackDef(pack, 'MetaFileReference', [445458787879, 'wrong']);
    await expect(result).rejects.toThrowError(/Unknown file type: /);
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

describe.concurrent('Format Metafields Formula', () => {
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
