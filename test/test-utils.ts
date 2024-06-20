import * as coda from '@codahq/packs-sdk';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { pack } from '../pack';

import {
  executeFormulaFromPackDef,
  executeSyncFormulaFromPackDef,
  newRealFetcherSyncExecutionContext,
} from '@codahq/packs-sdk/dist/development';

import { expect } from 'vitest';
import { isObject } from '../utils/helpers';

// let context: MockExecutionContext;
// context = newMockExecutionContext({
//   endpoint: PACK_TEST_ENDPOINT,
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
    { useDeprecatedResultNormalization: true, validateParams: true },
    defaultExecuteOptions
  );
}

export function getSyncContextWithDynamicUrl(dynamicUrl: string) {
  const syncContext = newRealFetcherSyncExecutionContext(pack, require.resolve('../pack.ts'));
  // @ts-expect-error
  syncContext.sync = { dynamicUrl };
  return syncContext;
}

export async function formatMetafieldInput(fullkey: string, input: string): Promise<string> {
  return executeFormulaFromPackDef(
    pack,
    'FormatMetafield',
    [fullkey, input],
    undefined,
    undefined,
    defaultExecuteOptions
  );
}

export async function formatMetafieldSingleLineTextInput(value: string): Promise<string> {
  return executeFormulaFromPackDef(pack, 'MetaSingleLineText', [value], undefined, undefined, defaultExecuteOptions);
}

export async function deleteRestResource(formulaName: string, id: number): Promise<string> {
  return executeFormulaFromPackDef(pack, formulaName, [id], undefined, undefined, defaultExecuteOptions);
}
