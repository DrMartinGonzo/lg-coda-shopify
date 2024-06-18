// #region Imports

import { describe, test } from 'vitest';
import { doSync } from './test-utils';
import { TranslatableResourceType } from '../types/admin.types';

// #endregion

describe.concurrent('SyncTables should not error', () => {
  describe.concurrent('Articles', () => {
    test('Articles without Metafields', async () => {
      await doSync('Articles', [
        false, // syncMetafields
      ]);
    });
    test('Articles with Metafields', async () => {
      await doSync('Articles', [
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('Blogs', () => {
    test('Blogs without Metafields', async () => {
      await doSync('Blogs', [
        false, // syncMetafields
      ]);
    });
    test('Blogs with Metafields', async () => {
      await doSync('Blogs', [
        true, // syncMetafields
      ]);
    });
  });

  test('Collects', async () => {
    await doSync('Collects', []);
  });

  describe.concurrent('Collections', () => {
    test('Collections without Metafields', async () => {
      await doSync('Collections', [
        false, // syncMetafields
      ]);
    });
    test('Collections with Metafields', async () => {
      await doSync('Collections', [
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('Customers', () => {
    test('Customers without Metafields', async () => {
      await doSync('Customers', [
        false, // syncMetafields
      ]);
    });
    test('Customers with Metafields', async () => {
      await doSync('Customers', [
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('DraftOrders', () => {
    test('DraftOrders without Metafields', async () => {
      await doSync('DraftOrders', [
        false, // syncMetafields
      ]);
    });
    test('DraftOrders with Metafields', async () => {
      await doSync('DraftOrders', [
        true, // syncMetafields
      ]);
    });
  });

  test('InventoryLevels', async () => {
    await doSync('InventoryLevels', [
      ['Shop location (74534912256)'], // locationIds
    ]);
  });

  describe.concurrent('Orders', () => {
    test('Orders without Metafields', async () => {
      await doSync('Orders', [
        'any', // status
        false, // syncMetafields
      ]);
    });
    test('Orders with Metafields', async () => {
      await doSync('Orders', [
        'any', // status
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('OrderLineItems', () => {
    test('OrderLineItems without Metafields', async () => {
      await doSync('OrderLineItems', [
        'any', // orderStatus
      ]);
    });
  });

  describe.concurrent('Pages', () => {
    test('Pages without Metafields', async () => {
      await doSync('Pages', [
        false, // syncMetafields
      ]);
    });
    test('Pages with Metafields', async () => {
      await doSync('Pages', [
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('Products', () => {
    test('Products without Metafields', async () => {
      await doSync('Products', [
        false, // syncMetafields
      ]);
    });
    test('Products with Metafields', async () => {
      await doSync('Products', [
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('ProductVariants', () => {
    test('ProductVariants without Metafields', async () => {
      await doSync('ProductVariants', [
        false, // syncMetafields
      ]);
    });
    test('ProductVariants with Metafields', async () => {
      await doSync('ProductVariants', [
        true, // syncMetafields
      ]);
    });
  });

  describe.concurrent('Redirects', () => {
    test('Redirects without Metafields', async () => {
      await doSync('Redirects', []);
    });
  });

  describe.concurrent('Shops', () => {
    test('Shops', async () => {
      await doSync('Shops', []);
    });
  });

  test('Translations', async () => {
    await doSync('Translations', [
      'fr', // locale
      TranslatableResourceType.Collection, // resourceType
    ]);
  });
});
