// #region Imports

import * as coda from '@codahq/packs-sdk';
import {
  ContextOptions,
  ExecuteOptions,
  executeFormulaFromPackDef,
  newJsonFetchResponse,
  newRealFetcherExecutionContext,
  newRealFetcherSyncExecutionContext,
} from '@codahq/packs-sdk/dist/development';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { TadaDocumentNode } from 'gql.tada';
import { expect } from 'vitest';

import { GraphQlData } from '../../Clients/GraphQlClients';
import { RestResourcesSingular } from '../../constants/resourceNames-constants';
import { isQueryFromDocumentNode } from '../../graphql/utils/graphql-utils';
import { pack } from '../../pack';
import { isObject } from '../../utils/helpers';
import SingleShopApiData from '../__snapshots__/api/shop.single.json';

// #endregion

export const manifestPath = require.resolve('../../pack.ts');

export const defaultIntegrationContextOptions: ContextOptions = {
  useRealFetcher: true,
  manifestPath,
};

export const defaultMockExecuteOptions: ExecuteOptions = {
  useDeprecatedResultNormalization: true,
  validateParams: true,
  validateResult: false,
};

export const defaultMockSyncExecuteOptions: ExecuteOptions = {
  useDeprecatedResultNormalization: true,
  validateParams: true,
  validateResult: false,
};

export const defaultIntegrationSyncExecuteOptions: ExecuteOptions = {
  useDeprecatedResultNormalization: true,
  validateParams: true,
  validateResult: true,
};

export function getRealContext() {
  return newRealFetcherExecutionContext(pack, manifestPath);
}

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

export function getSyncContextWithDynamicUrl(dynamicUrl: string) {
  const syncContext = newRealFetcherSyncExecutionContext(pack, require.resolve('../pack.ts'));
  // @ts-expect-error
  syncContext.sync = { dynamicUrl };
  return syncContext;
}

export function newGraphqlFetchResponse<T>(data: T, currentlyAvailable = 1999) {
  return newJsonFetchResponse({
    data,
    extensions: {
      cost: {
        requestedQueryCost: 10,
        actualQueryCost: 10,
        throttleStatus: {
          maximumAvailable: 2000,
          currentlyAvailable,
          restoreRate: 50,
        },
      },
    },
  } as GraphQlData<T>);
}

export function getCurrentShopCurrencyMockResponse() {
  return newJsonFetchResponse({ [RestResourcesSingular.Shop]: { currency: SingleShopApiData.currency } });
}

export function getThrottleStatusMockResponse(currentlyAvailable = 1999) {
  return newGraphqlFetchResponse({ shop: { id: undefined } }, currentlyAvailable);
}

export async function formatMetafieldInput(fullkey: string, input: string): Promise<string> {
  return executeFormulaFromPackDef(
    pack,
    'FormatMetafield',
    [fullkey, input],
    undefined,
    undefined,
    defaultIntegrationContextOptions
  );
}

export async function formatMetafieldSingleLineTextInput(value: string): Promise<string> {
  return executeFormulaFromPackDef(
    pack,
    'MetaSingleLineText',
    [value],
    undefined,
    undefined,
    defaultIntegrationContextOptions
  );
}

export async function deleteRestResource(formulaName: string, id: number): Promise<string> {
  return executeFormulaFromPackDef(pack, formulaName, [id], undefined, undefined, defaultIntegrationContextOptions);
}

function isGraphQlUrl(url: string) {
  const regex = new RegExp(`^https:\/\/.*.myshopify.com\/admin\/api/(\\d{4}-\\d{2})/graphql\\\.json$`, '');
  return regex.test(url);
}

export function isSameGraphQlQueryRequest(documentNode: TadaDocumentNode, fetchRequest: coda.FetchRequest) {
  try {
    const body = JSON.parse(fetchRequest?.body as string);
    const isSameQuery = isQueryFromDocumentNode(documentNode, body?.query ?? '');
    return isGraphQlUrl(fetchRequest?.url) && isSameQuery;
  } catch (error) {
    return false;
  }
}
