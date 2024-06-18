// #region Imports

import { test } from 'vitest';

import { executeSyncFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { pack } from '../pack';
import { SyncFilesParams } from '../sync/graphql/SyncedFiles';
import { SyncInventoryItemsParams } from '../sync/graphql/SyncedInventoryItems';
import { SyncLocationsParams } from '../sync/graphql/SyncedLocations';
import { SyncMetafieldDefinitionsParams } from '../sync/graphql/SyncedMetafieldDefinitions';
import { SyncMetaobjectsParams, SyncedMetaobjects } from '../sync/graphql/SyncedMetaobjects';
import { SyncOrderTransactionsParams } from '../sync/graphql/SyncedOrderTransactions';
import { SyncProductsParams } from '../sync/graphql/SyncedProducts';
import { SyncTranslationsParams } from '../sync/graphql/SyncedTranslations';
import { SyncVariantsParams } from '../sync/graphql/SyncedVariants';
import { SyncArticlesParams } from '../sync/rest/SyncedArticles';
import { SyncBlogsParams } from '../sync/rest/SyncedBlogs';
import { SyncCollectionsParams } from '../sync/rest/SyncedCollections';
import { SyncCollectsParams } from '../sync/rest/SyncedCollects';
import { SyncCustomersParams } from '../sync/rest/SyncedCustomers';
import { SyncDraftOrdersParams } from '../sync/rest/SyncedDraftOrders';
import { SyncMetafieldsParams } from '../sync/rest/SyncedMetafields';
import { SyncOrdersParams } from '../sync/rest/SyncedOrders';
import { SyncPagesParams } from '../sync/rest/SyncedPages';
import { SyncRedirectsParams } from '../sync/rest/SyncedRedirects';
import { SyncShopsParams } from '../sync/rest/SyncedShops';
import { MetafieldOwnerType, TranslatableResourceType } from '../types/admin.types';
import { expectedRows } from './expectedRows';
import { compareToExpectedRow, doSync, getSyncContextWithDynamicUrl, normalizeExpectedRowKeys } from './test-utils';

// #endregion

test('Sync Articles with Metafields', async () => {
  const expected = expectedRows.article;
  const result = await doSync('Articles', [
    true, // syncMetafields
    ['Vitest (91627159808)'], // blog idArray
    undefined, // author
    undefined, // createdAtRange
    undefined, // updatedAtRange
    undefined, // publishedAtRange
    undefined, // handle
    undefined, // publishedStatus
    undefined, // tagsArray
  ] as SyncArticlesParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Blogs with Metafields', async () => {
  const expected = expectedRows.blog;
  const result = await doSync('Blogs', [
    true, // syncMetafields
  ] as SyncBlogsParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Collections with Metafields', async () => {
  const expected = expectedRows.collectionSmart;
  const result = await doSync('Collections', [
    true, // syncMetafields
    undefined, // updatedAtRange
    undefined, // publishedAtRange
    'vitest-smart', // handle
    undefined, // idArray
    undefined, // productId
    undefined, // publishedStatus
    undefined, // title
  ] as SyncCollectionsParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Collects', async () => {
  const expected = expectedRows.collect;
  const result = await doSync('Collects', [
    413874323712, // collectionId
  ] as SyncCollectsParams);

  compareToExpectedRow(
    result.find((res) => res.Id === expected.id),
    normalizeExpectedRowKeys(expected)
  );
});

test('Sync DraftOrders with Metafields', async () => {
  const expected = expectedRows.draftOrder;
  const result = await doSync('DraftOrders', [
    true, // syncMetafields
    undefined, // status
    undefined, // updatedAtRange
    // [expected[0].id.toString()], // idArray
    ['1143039000832'], // idArray
    undefined, // sinceId
  ] as SyncDraftOrdersParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Customers with Metafields', async () => {
  const expected = [expectedRows.customer];
  const result = await doSync('Customers', [
    true, // syncMetafields
    undefined, // createdAtRange
    undefined, // updatedAtRange
    [expected[0].id.toString()], // idArray
    undefined, // tags
  ] as SyncCustomersParams);

  result.forEach((res, index) => {
    compareToExpectedRow(
      res,
      expected[index] // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });
});

test('Sync Files', async () => {
  const expected = expectedRows.file;
  const result = await doSync('Files', [
    'IMAGE', // type
    '64', // previewSize
  ] as SyncFilesParams);
  console.log(
    'result',
    result.find((res) => res.GraphqlGid === 'gid://shopify/MediaImage/34028708233472')
  );

  compareToExpectedRow(
    result.find((res) => res.GraphqlGid === expected.id),
    normalizeExpectedRowKeys(expected)
  );
});

test('Sync InventoryItems', async () => {
  const expected = expectedRows.inventoryItem;
  const result = await doSync('InventoryItems', [
    undefined, // createdAtRange
    undefined, // updatedAtRange
    ['vitest'], // skuArray
  ] as SyncInventoryItemsParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Locations with Metafields', async () => {
  const expected = expectedRows.location;
  const result = await doSync('Locations', [
    true, // syncMetafields
  ] as SyncLocationsParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Rest Metafields', async () => {
  const expected = expectedRows.metafieldRest;
  const result = await executeSyncFormulaFromPackDef(
    pack,
    'Metafields',
    [
      ['custom.test'], // metafieldKeys
    ] as SyncMetafieldsParams,
    getSyncContextWithDynamicUrl(MetafieldOwnerType.Article),
    {
      useDeprecatedResultNormalization: true,
      validateParams: true,
    },
    {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    }
  );

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync GraphQL Metafields', async () => {
  const expected = expectedRows.metafieldGraphQl;
  const result = await executeSyncFormulaFromPackDef(
    pack,
    'Metafields',
    [
      ['global.title_tag'], // metafieldKeys
    ] as SyncMetafieldsParams,
    getSyncContextWithDynamicUrl(MetafieldOwnerType.Product),
    {
      useDeprecatedResultNormalization: true,
      validateParams: true,
    },
    {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    }
  );

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync MetafieldDefinitions', async () => {
  const expected = expectedRows.metafieldDefinition;
  const result = await doSync('MetafieldDefinitions', [
    MetafieldOwnerType.Page, // ownerType
  ] as SyncMetafieldDefinitionsParams);

  compareToExpectedRow(
    result.find((res) => res.Id === expected.id),
    normalizeExpectedRowKeys(expected)
  );
});

test('Sync Metaobjects', async () => {
  const expected = expectedRows.metaobject;
  const result = await executeSyncFormulaFromPackDef(
    pack,
    'Metaobjects',
    [] as SyncMetaobjectsParams,
    getSyncContextWithDynamicUrl(
      SyncedMetaobjects.encodeDynamicUrl({ id: 'gid://shopify/MetaobjectDefinition/967475456' })
    ),
    {
      useDeprecatedResultNormalization: true,
      validateParams: true,
    },
    {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    }
  );

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Orders with Metafields', async () => {
  const expected = expectedRows.order;
  const result = await doSync('Orders', [
    'any', // status
    true, // syncMetafields
    undefined, // createdAtRange
    undefined, // updatedAtRange
    undefined, // processedAtRange
    undefined, // financialStatus
    undefined, // fulfillmentStatus
    ['5586624381184'], // idArray
    undefined, // sinceId
    undefined, // customerTags
    undefined, // orderTags
  ] as SyncOrdersParams);
  // console.log('result', result[0].line_items);
  // throw new Error('Not implemented');

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync OrderTransactions', async () => {
  const expected = expectedRows.orderTransaction;
  const result = await doSync('OrderTransactions', [
    undefined, // orderCreatedAt
    undefined, // orderUpdatedAt
    [new Date('2024-02-22T09:12:06Z'), new Date('2024-02-23T09:12:06Z')], // orderProcessedAt
    'any', // orderFinancialStatus
    'any', // orderFulfillmentStatus
    'any', // orderStatus
    ['bogus'], // gateways
  ] as SyncOrderTransactionsParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Pages with Metafields', async () => {
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
  ] as SyncPagesParams);
  // console.log('result', result);
  // throw new Error('Not implemented');
  compareToExpectedRow(
    result[0],
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});

test('Sync Products with Metafields', async () => {
  const expected = [expectedRows.product];
  const result = await doSync('Products', [
    true, // syncMetafields
    undefined, // productTypesArray
    undefined, // createdAtRange
    undefined, // updatedAtRange
    undefined, // statusArray
    undefined, // publishedStatus
    undefined, // vendorsArray
    undefined, // tagsArray
    [expectedRows.product.id.toString()], // idArray
  ] as SyncProductsParams);

  result.forEach((res, index) => {
    compareToExpectedRow(
      res,
      expected[index] // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });
});

test('Sync ProductVariants with Metafields', async () => {
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
    [expectedRows.product.id.toString()], // idArray
  ] as SyncVariantsParams);

  result.forEach((res, index) => {
    compareToExpectedRow(
      res,
      expected[index] // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });
});

test('Sync Redirects', async () => {
  const expected = expectedRows.redirect;
  const result = await doSync('Redirects', [
    '/vitest', // path
    undefined, // target
  ] as SyncRedirectsParams);

  compareToExpectedRow(
    result.find((res) => res.Id === expected.id),
    normalizeExpectedRowKeys(expected)
  );
});

test('Sync Shops', async () => {
  const expected = expectedRows.shop;
  const result = await doSync('Shops', [] as SyncShopsParams);

  compareToExpectedRow(result[0], normalizeExpectedRowKeys(expected));
});

test('Sync Translations', async () => {
  const expected = expectedRows.translation;
  const result = await doSync('Translations', [
    'fr', // locale
    TranslatableResourceType.Collection, // resourceType
  ] as SyncTranslationsParams);

  compareToExpectedRow(
    result.find((res) => res.id === expected.id),
    expected // No need to normalize because dynamic schema will not be normalized in CLI context
  );
});
