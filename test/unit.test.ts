// #region Imports

import { MockExecutionContext, newMockExecutionContext } from '@codahq/packs-sdk/dist/development';
import { describe, expect, test } from 'vitest';
import { GRAPHQL_DEFAULT_RESTORE_RATE, GraphQlFetcher } from '../Clients/GraphQlClients';
import { calcGraphQlWaitTime } from '../Clients/utils/client-utils';
import { SyncUpdateRequiredPropertyMissingVisibleError } from '../Errors/Errors';
import { ShopifyGraphQlRequestCost } from '../Errors/GraphQlErrors';
import { validateSyncUpdate } from '../coda/setup/productVariants-setup';
import { METAFIELD_TYPES } from '../constants/metafields-constants';
import { PACK_TEST_ENDPOINT } from '../constants/pack-constants';
import { GraphQlResourceNames } from '../constants/resourceNames-constants';
import { idToGraphQlGid } from '../graphql/utils/graphql-utils';
import { VariantApidata, VariantModel } from '../models/graphql/VariantModel';
import { CustomCollectionModel } from '../models/rest/CustomCollectionModel';
import { maybeBackToArray } from '../models/utils/metafields-utils';
import { CollectionRow } from '../schemas/CodaRows.types';
import { SyncTableMixedContinuation } from '../sync/rest/AbstractSyncedRestResourcesWithGraphQlMetafields';
import { RestItemsBatch } from '../sync/rest/RestItemsBatch';
import { stringifyContinuationProperty } from '../sync/utils/sync-utils';

// #endregion

function getRestItemsBatchItems(context: MockExecutionContext, count: number) {
  const baseRow: CollectionRow = {
    id: 1,
    title: 'un titre',
    body_html: '<p>un body</p>',
    handle: 'un-handle',
    published: true,
    template_suffix: undefined,
  };
  const rows: CollectionRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({ ...baseRow, id: i + 1 });
  }
  return rows.map((row) => CustomCollectionModel.createInstanceFromRow(context, row));
}

/**
 * On trigger une mise à jour de variant sur weight et option2,
 * mais il manque weight_unit et option1
 */
test('Update missing data on row update', async () => {
  const context = newMockExecutionContext();
  const missingWeightUnit = 'KILOGRAMS';
  const initialOption1 = 'option1';
  const initialOption2 = 'option2';
  const updatedOption2 = 'option2 NEW';

  const prevRow = {
    id: 44810810786048,
    weight: 222,
    option2: initialOption2,
    title: 'whatever',
  };
  const newRow = {
    id: 44810810786048,
    weight: 9,
    option2: updatedOption2,
    title: 'whatever',
  };

  const instance: VariantModel = VariantModel.createInstanceFromRow(context, newRow);

  try {
    validateSyncUpdate(prevRow, newRow);
  } catch (error) {
    if (error instanceof SyncUpdateRequiredPropertyMissingVisibleError) {
      /** Simulate augmenting with fresh data and check again if it passes validation */
      // @ts-expect-error
      instance.setData(
        // @ts-expect-error
        instance.mergeMissingData({
          selectedOptions: [
            {
              value: initialOption1,
            },
            { value: initialOption2 },
          ],
          inventoryItem: {
            measurement: {
              weight: {
                unit: missingWeightUnit,
              },
            },
          },
        } as VariantApidata)
      );

      validateSyncUpdate(prevRow, instance.toCodaRow());

      expect(instance.data.inventoryItem.measurement.weight.unit, 'Should have updated weight unit').toEqual(
        missingWeightUnit
      );
      expect(instance.data.selectedOptions[0].value, 'Should have updated option1').toEqual('option1');
      expect(instance.data.selectedOptions[1].value, 'Should have kept option2 from newRow').toEqual('option2 NEW');
    } else {
      throw error;
    }
  }
});

test('calcGraphQlMaxLimit', async () => {
  const limit = GraphQlFetcher.calcGraphQlMaxLimit({
    lastCost: {
      requestedQueryCost: 100,
    },
    lastLimit: 250,
    throttleStatus: {
      currentlyAvailable: 2000,
      maximumAvailable: 2000,
      restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
    },
  });
  expect(limit).toBe(250);

  const limit2 = GraphQlFetcher.calcGraphQlMaxLimit({
    lastCost: {
      requestedQueryCost: 100,
    },
    lastLimit: 10,
    throttleStatus: {
      currentlyAvailable: 2000,
      maximumAvailable: 2000,
      restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
    },
  });
  expect(limit2).toEqual(90);

  const limit3 = GraphQlFetcher.calcGraphQlMaxLimit({
    lastCost: {
      requestedQueryCost: 100,
    },
    lastLimit: 250,
    throttleStatus: {
      currentlyAvailable: 10,
      maximumAvailable: 2000,
      restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
    },
  });
  expect(limit3).toEqual(25);
});

test('idToGraphQlGid', async () => {
  const resourceName = GraphQlResourceNames.Market;
  const id = 17893163264;
  const expectedGid = `gid://shopify/${resourceName}/${id}`;

  expect(idToGraphQlGid(resourceName, id), 'id is number').toEqual(expectedGid);
  expect(idToGraphQlGid(resourceName, id.toString()), 'id is string').toEqual(expectedGid);
  expect(idToGraphQlGid(resourceName, expectedGid), 'id is GraphQlGid').toEqual(expectedGid);

  expect(() => idToGraphQlGid(resourceName, 'abcd'), "id can't be parsed to a number").toThrowError(
    'Unable to format GraphQlGid'
  );
  expect(() => idToGraphQlGid(undefined, 17893163264), 'resourceName is undefined').toThrowError(
    'Unable to format GraphQlGid'
  );
});

test('calcGraphQlWaitTime', async () => {
  const waiTime = calcGraphQlWaitTime({
    currentlyAvailable: 10,
    maximumAvailable: 2000,
    restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
  });
  expect(waiTime).toEqual(3000);

  const waiTime2 = calcGraphQlWaitTime({
    currentlyAvailable: 1999,
    maximumAvailable: 2000,
    restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
  });
  expect(waiTime2).toEqual(0);
});

test('maybeBackToArray', async () => {
  expect(maybeBackToArray([100, 50], METAFIELD_TYPES.list_rating, 'number')).toEqual([100, 50]);
  expect(maybeBackToArray('100, 50', METAFIELD_TYPES.list_rating, 'number')).toEqual([100, 50]);
  expect(maybeBackToArray('', METAFIELD_TYPES.list_rating, 'number')).toEqual([]);

  expect(maybeBackToArray('14ml,26m³', METAFIELD_TYPES.list_rating, 'string')).toEqual(['14ml', '26m³']);
  expect(maybeBackToArray('14ml,26m³', METAFIELD_TYPES.list_rating, 'number')).toEqual([14, 26]);
  expect(
    maybeBackToArray('14ml,26m³,,,', METAFIELD_TYPES.list_rating, 'number'),
    'trailing commas should not impact the result'
  ).toEqual([14, 26]);
});

describe.concurrent('RestItemsBatch', () => {
  let context: MockExecutionContext;
  context = newMockExecutionContext({
    endpoint: PACK_TEST_ENDPOINT,
  });

  test('RestItemsBatch without continuation', async () => {
    const currentItems = getRestItemsBatchItems(context, 500);
    const limit = 10;

    const restItemsBatch = new RestItemsBatch({
      prevContinuation: undefined,
      items: currentItems,
      limit,
      reviveItems: (data: any) => CustomCollectionModel.createInstance(context, data),
    });

    const expectedToProcessLength = Math.min(limit, currentItems.length);
    const expectedRemainingLength = Math.max(0, currentItems.length - limit);
    expect(restItemsBatch.toProcess.length, 'length of toProcess should be equal to limit').toEqual(
      expectedToProcessLength
    );
    expect(
      restItemsBatch.remaining.length,
      'count of remaining items should be equal to number of items minus limit'
    ).toEqual(expectedRemainingLength);
  });

  test('RestItemsBatch with continuation, no cursor', async () => {
    const markedId = 999;
    const prevRestItems = getRestItemsBatchItems(context, 10);
    const limit = 6;
    const lastCost: ShopifyGraphQlRequestCost = {
      actualQueryCost: 240,
      requestedQueryCost: 320,
      throttleStatus: {
        currentlyAvailable: 1500,
        maximumAvailable: 2000,
        restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
      },
    };
    const previousRestItemsBatch = new RestItemsBatch({
      prevContinuation: undefined,
      items: prevRestItems,
      limit,
      reviveItems: (data: any) => CustomCollectionModel.createInstance(context, data),
    });
    // mark first remaining item with a special id
    previousRestItemsBatch.remaining[0].data.id = markedId;

    expect(previousRestItemsBatch.remaining.length, 'previous batch should have 4 remaining items').toEqual(4);

    const prevContinuation: SyncTableMixedContinuation = {
      hasLock: 'true',
      skipNextRestSync: 'false',
      cursor: undefined,
      lastCost: stringifyContinuationProperty(lastCost),
      lastLimit: limit,
      extraData: {
        batch: previousRestItemsBatch.toString(),
      },
    };
    const currentItems = getRestItemsBatchItems(context, 30);
    const restItemsBatch = new RestItemsBatch({
      prevContinuation: prevContinuation,
      items: currentItems,
      limit,
      reviveItems: (data: any) => CustomCollectionModel.createInstance(context, data),
    });

    expect(
      restItemsBatch.toProcess[0].data.id,
      'First toProcess item should be the first remaining item of previous batch'
    ).toEqual(markedId);
    expect(restItemsBatch.remaining.length, 'No remaining items in current batch').toEqual(0);
  });

  test('RestItemsBatch with continuation, with cursor', async () => {
    const markedId = 999;
    const prevRestItems = getRestItemsBatchItems(context, 10);
    const limit = 6;
    const lastCost: ShopifyGraphQlRequestCost = {
      actualQueryCost: 240,
      requestedQueryCost: 320,
      throttleStatus: {
        currentlyAvailable: 1500,
        maximumAvailable: 2000,
        restoreRate: GRAPHQL_DEFAULT_RESTORE_RATE,
      },
    };
    const previousRestItemsBatch = new RestItemsBatch({
      prevContinuation: undefined,
      items: prevRestItems,
      limit,
      reviveItems: (data: any) => CustomCollectionModel.createInstance(context, data),
    });
    // mark first remaining item with a special id
    previousRestItemsBatch.remaining[0].data.id = markedId;

    expect(previousRestItemsBatch.remaining.length, 'previous batch should have 4 remaining items').toEqual(4);

    const prevContinuation: SyncTableMixedContinuation = {
      hasLock: 'true',
      skipNextRestSync: 'false',
      cursor: 'dummycursor',
      lastCost: stringifyContinuationProperty(lastCost),
      lastLimit: limit,
      extraData: {
        batch: previousRestItemsBatch.toString(),
      },
    };
    const currentItems = getRestItemsBatchItems(context, 30);
    const restItemsBatch = new RestItemsBatch({
      prevContinuation: prevContinuation,
      items: currentItems,
      limit,
      reviveItems: (data: any) => CustomCollectionModel.createInstance(context, data),
    });

    expect(restItemsBatch.toProcess).toEqual(previousRestItemsBatch.toProcess);
    expect(restItemsBatch.remaining).toEqual(previousRestItemsBatch.remaining);
  });
});
