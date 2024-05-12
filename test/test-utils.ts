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
import { METAFIELD_TYPES } from '../Resources/Mixed/METAFIELD_TYPES';

// let context: MockExecutionContext;
// context = newMockExecutionContext({
//   endpoint: 'https://coda-pack-test.myshopify.com',
// });

const defaultExecuteOptions = {
  useRealFetcher: true,
  manifestPath: require.resolve('../pack.ts'),
};

export function normalizeExpectedRowKeys(obj) {
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

export function compareToExpectedRow(result: any, expected: any) {
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

export function doSync(SyncFormulaName: string, args: any[]) {
  return executeSyncFormulaFromPackDef(
    pack,
    SyncFormulaName,
    args as coda.ParamValues<coda.ParamDefs>,
    undefined,
    { useDeprecatedResultNormalization: true },
    defaultExecuteOptions
  );
}
