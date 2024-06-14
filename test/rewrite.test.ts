// #region Imports
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { pack } from '../pack';

import { describe, expect, test } from 'vitest';
import { METAFIELD_TYPES } from '../constants/metafields-constants';
import { MetafieldOwnerType } from '../types/admin.types';

// #endregion
const defaultExecuteOptions = {
  useRealFetcher: true,
  manifestPath: require.resolve('../pack.ts'),
};
test('UpdateArticle', async () => {
  const input = await executeFormulaFromPackDef(
    pack,
    'FormatMetafield',
    [
      'global.title_tag', // fullKey
      await executeFormulaFromPackDef(
        pack,
        'MetaSingleLineText',
        [
          'vitest999', // string
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
  console.log('input', input);

  const result = await executeFormulaFromPackDef(
    pack,
    'UpdateArticle',
    [
      588854919424, // id
      undefined, // author
      undefined, // blog
      'bonjour', // bodyHtml
      undefined, // summaryHtml
      undefined, // handle
      undefined, // imageUrl
      undefined, // imageAlt
      undefined, // published
      undefined, // publishedAt
      undefined, // tags
      undefined, // templateSuffix
      undefined, // title
      [input], // metafields
    ],
    undefined,
    undefined,
    defaultExecuteOptions
  );

  expect(result.BodyHtml).toEqual('bonjour');

  // const reset = await executeFormulaFromPackDef(
  //   pack,
  //   'UpdateArticle',
  //   [588854919424, undefined, undefined, 'un-test-encore'],
  //   undefined,
  //   undefined,
  //   defaultExecuteOptions
  // );
  // expect(reset.BodyHtml).toEqual('un-test-encore');
});
