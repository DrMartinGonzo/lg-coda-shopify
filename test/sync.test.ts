// #region Imports

import * as coda from '@codahq/packs-sdk';
import {
  ExecuteOptions,
  MockSyncExecutionContext,
  executeSyncFormulaFromPackDef,
  newJsonFetchResponse,
  newMockSyncExecutionContext,
} from '@codahq/packs-sdk/dist/development';
import sinon from 'sinon';
import { ExpectStatic, beforeEach, describe, test } from 'vitest';

import { pack } from '../pack';

import { REST_SYNC_OWNER_METAFIELDS_LIMIT } from '../Clients/RestClients';
import { REST_DEFAULT_API_VERSION } from '../config';
import { PACK_TEST_ENDPOINT } from '../constants/pack-constants';
import { RestResourcesPlural, RestResourcesSingular } from '../constants/resourceNames-constants';
import { MetafieldOwnerType, TranslatableResourceType } from '../types/admin.types';
import { expectedRows } from './expectedRows';
import {
  compareToExpectedRow,
  defaultIntegrationSyncExecuteOptions,
  defaultMockSyncExecuteOptions,
  getCurrentShopCurrencyMockResponse,
  getSyncContextWithDynamicUrl,
  getThrottleStatusMockResponse,
  manifestPath,
  newGraphqlFetchResponse,
  normalizeExpectedRowKeys,
} from './utils/test-utils';

import { SyncArticlesParams } from '../sync/rest/SyncedArticles';
import { SyncBlogsParams } from '../sync/rest/SyncedBlogs';
import { SyncCollectionsParams } from '../sync/rest/SyncedCollections';
import { SyncCollectsParams } from '../sync/rest/SyncedCollects';
import { SyncCustomersParams } from '../sync/rest/SyncedCustomers';
import { SyncDraftOrdersParams } from '../sync/rest/SyncedDraftOrders';
import { SyncInventoryLevelsParams } from '../sync/rest/SyncedInventoryLevels';
import { SyncMetafieldsParams } from '../sync/rest/SyncedMetafields';
import { SyncOrderLineItemsParams } from '../sync/rest/SyncedOrderLineItems';
import { SyncOrdersParams } from '../sync/rest/SyncedOrders';
import { SyncPagesParams } from '../sync/rest/SyncedPages';
import { SyncRedirectsParams } from '../sync/rest/SyncedRedirects';
import { SyncShopsParams } from '../sync/rest/SyncedShops';

import { getMetafieldDefinitionsQuery } from '../graphql/metafieldDefinitions-graphql';
import { getSingleMetaObjectDefinitionQuery } from '../graphql/metaobjectDefinition-graphql';
import { throttleStatusQuery } from '../graphql/shop-graphql';
import { SyncFilesParams } from '../sync/graphql/SyncedFiles';
import { SyncInventoryItemsParams } from '../sync/graphql/SyncedInventoryItems';
import { SyncLocationsParams } from '../sync/graphql/SyncedLocations';
import { SyncMetafieldDefinitionsParams } from '../sync/graphql/SyncedMetafieldDefinitions';
import { SyncMetaobjectsParams, SyncedMetaobjects } from '../sync/graphql/SyncedMetaobjects';
import { SyncOrderTransactionsParams } from '../sync/graphql/SyncedOrderTransactions';
import { SyncProductsParams } from '../sync/graphql/SyncedProducts';
import { SyncTranslationsParams } from '../sync/graphql/SyncedTranslations';
import { SyncVariantsParams } from '../sync/graphql/SyncedVariants';

import listArticleApiData from './__snapshots__/api/article.list.json';
import listArticleMetafieldApiData from './__snapshots__/api/articleMetafield.list.json';
import listArticleMetafieldDefinitionApiData from './__snapshots__/api/articleMetafieldDefinition.list.json';
import listBlogApiData from './__snapshots__/api/blog.list.json';
import listCollectApiData from './__snapshots__/api/collect.list.json';
import listCustomCollectionApiData from './__snapshots__/api/customCollection.list.json';
import listCustomerApiData from './__snapshots__/api/customer.list.json';
import listDraftOrderApiData from './__snapshots__/api/draftOrder.list.json';
import listFileApiData from './__snapshots__/api/file.list.json';
import listGraphqlMetafieldApiData from './__snapshots__/api/graphqlMetafield.list.json';
import listInventoryItemApiData from './__snapshots__/api/inventoryItem.list.json';
import listInventoryLevelApiData from './__snapshots__/api/inventoryLevel.list.json';
import listLocationApiData from './__snapshots__/api/location.list.json';
import listMetaobjectApiData from './__snapshots__/api/metaobject.list.json';
import listOrderApiData from './__snapshots__/api/order.list.json';
import listOrderTransactionApiData from './__snapshots__/api/orderTransaction.list.json';
import listPageApiData from './__snapshots__/api/page.list.json';
import listProductApiData from './__snapshots__/api/product.list.json';
import listRedirectApiData from './__snapshots__/api/redirect.list.json';
import SingleShopApiData from './__snapshots__/api/shop.single.json';
import listSmartCollectionApiData from './__snapshots__/api/smartCollection.list.json';
import singleTestMetaobjectDefinitionApiData from './__snapshots__/api/testMetaobjectDefinition.single.json';
import listVariantApiData from './__snapshots__/api/variant.list.json';
import { isSameGraphQlQueryRequest } from './utils/test-utils';
// #endregion

// #region Default Sync Parameters
const defaultArticleParams = [
  false, // syncMetafields
  [`Vitest (${expectedRows.article.blog_id})`], // blog idArray
  undefined, // author
  undefined, // createdAtRange
  undefined, // updatedAtRange
  undefined, // publishedAtRange
  undefined, // handle
  undefined, // publishedStatus
  undefined, // tagsArray
] as SyncArticlesParams;

const defaultBlogParams = [
  false, // syncMetafields
] as SyncBlogsParams;

const defaultCollectionParams = [
  false, // syncMetafields
  undefined, // updatedAtRange
  undefined, // publishedAtRange
  'vitest-smart', // handle
  undefined, // idArray
  undefined, // productId
  undefined, // publishedStatus
  undefined, // title
] as SyncCollectionsParams;

const defaultCollectParams = [
  413874323712, // collectionId
] as SyncCollectsParams;

const defaultDraftOrdersParams = [
  false, // syncMetafields
  undefined, // status
  undefined, // updatedAtRange
  [expectedRows.draftOrder.id.toString()], // idArray
  undefined, // sinceId
] as SyncDraftOrdersParams;

const defaultCustomersParams = [
  false, // syncMetafields
  undefined, // createdAtRange
  undefined, // updatedAtRange
  [expectedRows.customer.id.toString()], // idArray
  undefined, // tags
] as SyncCustomersParams;

const defaultFilesParams = [
  'IMAGE', // type
  '64', // previewSize
] as SyncFilesParams;

const defaultInventoryLevelsParams = [
  [`Vitest Location (${expectedRows.location.id})`], // locationIds
  undefined, // updatedAtMin
] as SyncInventoryLevelsParams;

const defaultInventoryItemsParams = [
  undefined, // createdAtRange
  undefined, // updatedAtRange
  ['vitest'], // skuArray
] as SyncInventoryItemsParams;

const defaultLocationsParams = [
  false, // syncMetafields
] as SyncLocationsParams;

const defaultRestMetafieldsParams = [
  ['custom.test'], // metafieldKeys
] as SyncMetafieldsParams;

const defaultGraphQLMetafieldsParams = [
  ['global.title_tag'], // metafieldKeys
] as SyncMetafieldsParams;

const defaultMetafieldDefinitionsParams = [
  MetafieldOwnerType.Article, // ownerType
] as SyncMetafieldDefinitionsParams;

const defaultMetaobjectsParams = [] as SyncMetaobjectsParams;

const defaultOrdersParams = [
  'any', // status
  false, // syncMetafields
  undefined, // createdAtRange
  undefined, // updatedAtRange
  undefined, // processedAtRange
  undefined, // financialStatus
  undefined, // fulfillmentStatus
  [expectedRows.order.id.toString()], // idArray
  undefined, // sinceId
  undefined, // customerTags
  undefined, // orderTags
] as SyncOrdersParams;

const defaultOrderLineItemsParams = [
  'any', // orderStatus
  undefined, // orderCreatedAt
  undefined, // orderUpdatedAt
  undefined, // orderProcessedAt
  undefined, // orderFinancialStatus
  undefined, // orderFulfillmentStatus
  [expectedRows.orderLineItems[0].order_id.toString()], // idArray
  undefined, // sinceOrderId
] as SyncOrderLineItemsParams;

const defaultOrderTransactionsParams = [
  undefined, // orderCreatedAt
  undefined, // orderUpdatedAt
  [new Date('2024-02-22T09:12:06Z'), new Date('2024-02-23T09:12:06Z')], // orderProcessedAt
  'any', // orderFinancialStatus
  'any', // orderFulfillmentStatus
  'any', // orderStatus
  ['bogus'], // gateways
] as SyncOrderTransactionsParams;

const defaultPagesParams = [
  false, // syncMetafields
  undefined, // createdAtRange
  undefined, // updatedAtRange
  undefined, // publishedAtRange
  'vitest', // handle
  undefined, // publishedStatus
  undefined, // sinceId
  undefined, // title
] as SyncPagesParams;

const defaultProductsParams = [
  false, // syncMetafields
  undefined, // productTypesArray
  undefined, // createdAtRange
  undefined, // updatedAtRange
  undefined, // statusArray
  undefined, // publishedStatus
  undefined, // vendorsArray
  undefined, // tagsArray
  [expectedRows.product.id.toString()], // idArray
] as SyncProductsParams;

const defaultVariantsParams = [
  false, // syncMetafields
  undefined, // productType
  undefined, // createdAtRange
  undefined, // updatedAtRange
  undefined, // statusArray
  undefined, // publishedStatus
  undefined, // vendorsArray
  undefined, // skuArray
  [expectedRows.product.id.toString()], // idArray
] as SyncVariantsParams;

const defaultRedirectsParams = [
  '/vitest', // path
  undefined, // target
] as SyncRedirectsParams;

const defaultShopsParams = [] as SyncShopsParams;

const defaultTranslationsParams = [
  'fr', // locale
  TranslatableResourceType.Collection, // resourceType
] as SyncTranslationsParams;
// #endregion

async function matchRowsSnapshot(expect: ExpectStatic, result: any, name: string) {
  await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(`./__snapshots__/rows/${name}.rows.json`);
}

const isActiveShopCurrencyRequest = sinon.match(function (fetchRequest: coda.FetchRequest) {
  return (
    fetchRequest?.url ===
    `${PACK_TEST_ENDPOINT}/admin/api/${REST_DEFAULT_API_VERSION}/shop.json?fields=currency&limit=250`
  );
}, 'isActiveShopCurrencyRequest');

const isCheckThrottleStatusRequest = sinon.match(function (fetchRequest: coda.FetchRequest) {
  return isSameGraphQlQueryRequest(throttleStatusQuery, fetchRequest);
}, 'isCheckThrottleStatusRequest');

const isMetafieldDefinitionRequest = sinon.match(function (fetchRequest: coda.FetchRequest) {
  return isSameGraphQlQueryRequest(getMetafieldDefinitionsQuery, fetchRequest);
}, 'isMetafieldDefinitionRequest');

const isSingleMetaobjectDefinitionRequest = sinon.match(function (fetchRequest: coda.FetchRequest) {
  return isSameGraphQlQueryRequest(getSingleMetaObjectDefinitionQuery, fetchRequest);
}, 'isSingleMetaobjectDefinitionRequest');

describe('Sync resources', () => {
  let context: MockSyncExecutionContext;

  async function doSync(
    formulaName: string,
    parameters: coda.ParamValues<coda.ParamDefs>,
    overrideContext?: MockSyncExecutionContext,
    overrideOptions?: ExecuteOptions
  ) {
    return executeSyncFormulaFromPackDef(
      pack,
      formulaName,
      parameters,
      overrideContext ?? context,
      overrideOptions ?? defaultMockSyncExecuteOptions
    );
  }

  beforeEach(() => {
    context = newMockSyncExecutionContext({ endpoint: PACK_TEST_ENDPOINT });
    context.fetcher.fetch = sinon.stub();
    context.fetcher.fetch.reset();
    // Handles requests to current Shop currency and throttle status
    context.fetcher.fetch.withArgs(isActiveShopCurrencyRequest).returns(getCurrentShopCurrencyMockResponse());
    context.fetcher.fetch.withArgs(isCheckThrottleStatusRequest).returns(getThrottleStatusMockResponse());
  });

  test('Article', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Article]: listArticleApiData }));
    const result = await doSync('Articles', defaultArticleParams);
    await matchRowsSnapshot(expect, result, 'article');
  });

  test('Blog', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Blog]: listBlogApiData }));
    const result = await doSync('Blogs', defaultBlogParams);
    await matchRowsSnapshot(expect, result, 'blog');
  });

  test('Collection', async ({ expect }) => {
    context.fetcher.fetch
      .onFirstCall()
      .returns(newJsonFetchResponse({ [RestResourcesPlural.CustomCollection]: listCustomCollectionApiData }));
    context.fetcher.fetch
      .onSecondCall()
      .returns(newJsonFetchResponse({ [RestResourcesPlural.SmartCollection]: listSmartCollectionApiData }));
    const result = await doSync('Collections', defaultCollectionParams);
    await matchRowsSnapshot(expect, result, 'collection');
  });

  test('Collect', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Collect]: listCollectApiData }));
    const result = await doSync('Collects', defaultCollectParams);
    await matchRowsSnapshot(expect, result, 'collect');
  });

  test('Customer', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Customer]: listCustomerApiData }));
    const result = await doSync('Customers', defaultCustomersParams);
    await matchRowsSnapshot(expect, result, 'customer');
  });

  test('DraftOrder', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.DraftOrder]: listDraftOrderApiData }));
    const result = await doSync('DraftOrders', defaultDraftOrdersParams);
    await matchRowsSnapshot(expect, result, 'draftOrder');
  });

  test('File', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ files: { nodes: listFileApiData } }));
    const result = await doSync('Files', defaultFilesParams);
    await matchRowsSnapshot(expect, result, 'file');
  });

  test('InventoryLevel', async ({ expect }) => {
    context.fetcher.fetch.returns(
      newJsonFetchResponse({ [RestResourcesPlural.InventoryLevel]: listInventoryLevelApiData })
    );
    const result = await doSync('InventoryLevels', defaultInventoryLevelsParams);
    await matchRowsSnapshot(expect, result, 'inventoryLevel');
  });

  test('InventoryItem', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ inventoryItems: { nodes: listInventoryItemApiData } }));

    const result = await doSync('InventoryItems', defaultInventoryItemsParams);
    await matchRowsSnapshot(expect, result, 'inventoryItem');
  });

  test('Location', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ locations: { nodes: listLocationApiData } }));
    const result = await doSync('Locations', defaultLocationsParams);
    await matchRowsSnapshot(expect, result, 'location');
  });

  test('Rest Metafields', async ({ expect }) => {
    const restMetafieldsArticleUrl = `${PACK_TEST_ENDPOINT}/admin/api/${REST_DEFAULT_API_VERSION}/articles.json?fields=id&limit=${REST_SYNC_OWNER_METAFIELDS_LIMIT}`;
    const isRestMetafieldsArticleRequest = sinon.match(
      (fetchRequest: coda.FetchRequest) => fetchRequest?.url === restMetafieldsArticleUrl,
      'isRestMetafieldOwnerRequest'
    );

    const restMetafieldsUrlStart = `${PACK_TEST_ENDPOINT}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;
    const isRestMetafieldsRequest = sinon.match(
      (fetchRequest: coda.FetchRequest) => fetchRequest?.url.startsWith(restMetafieldsUrlStart),
      'isRestMetafieldOwnerRequest'
    );

    context.sync.dynamicUrl = MetafieldOwnerType.Article;
    context.fetcher.fetch.withArgs(isRestMetafieldsArticleRequest).returns(
      newJsonFetchResponse({
        [RestResourcesPlural.Article]: listArticleApiData.map((article) => ({ id: article.id })),
      })
    );
    // On doit utiliser une fonction de callback sinon on dirait que la réponse se 'détériore' à chaque run…
    // L'object ne doit pas être immutable quelque part…
    context.fetcher.fetch.withArgs(isRestMetafieldsRequest).callsFake(function fakeFn() {
      return newJsonFetchResponse({
        [RestResourcesPlural.Metafield]: listArticleMetafieldApiData,
      });
    });
    context.fetcher.fetch.withArgs(isMetafieldDefinitionRequest).callsFake(function fakeFn() {
      return newGraphqlFetchResponse({
        metafieldDefinitions: { nodes: listArticleMetafieldDefinitionApiData },
      });
    });

    const result = await doSync('Metafields', defaultRestMetafieldsParams);
    await matchRowsSnapshot(expect, result, 'restMetafield');
  });

  test('GraphQl Metafields', async ({ expect }) => {
    context.sync.dynamicUrl = MetafieldOwnerType.Product;
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        products: {
          nodes: [
            {
              id: listGraphqlMetafieldApiData[0].parentNode.id,
              __typename: 'Product',
              metafields: { nodes: listGraphqlMetafieldApiData },
            },
          ],
        },
      })
    );
    const result = await doSync('Metafields', defaultGraphQLMetafieldsParams);
    await matchRowsSnapshot(expect, result, 'graphqlMetafield');
  });

  test('MetafieldDefinitions', async ({ expect }) => {
    context.sync.dynamicUrl = MetafieldOwnerType.Product;
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        metafieldDefinitions: {
          nodes: listArticleMetafieldDefinitionApiData,
        },
      })
    );
    const result = await doSync('MetafieldDefinitions', defaultMetafieldDefinitionsParams);
    await matchRowsSnapshot(expect, result, 'metafieldDefinition');
  });

  test('Metaobjects', async ({ expect }) => {
    context.sync.dynamicUrl = SyncedMetaobjects.encodeDynamicUrl({ id: listMetaobjectApiData[0].definition.id });
    context.fetcher.fetch
      .withArgs(isSingleMetaobjectDefinitionRequest)
      .returns(newGraphqlFetchResponse({ metaobjectDefinition: singleTestMetaobjectDefinitionApiData }));
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ metaobjects: { nodes: listMetaobjectApiData } }));
    const result = await doSync('Metaobjects', defaultMetaobjectsParams);
    await matchRowsSnapshot(expect, result, 'metaobject');
  });

  test('Order', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Order]: listOrderApiData }));
    const result = await doSync('Orders', defaultOrdersParams);
    await matchRowsSnapshot(expect, result, 'order');
  });

  test('OrderLineItem', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Order]: listOrderApiData }));
    const result = await doSync('OrderLineItems', defaultOrderLineItemsParams);
    await matchRowsSnapshot(expect, result, 'orderLineItems');
  });

  test('OrderTransaction', async ({ expect }) => {
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        orders: {
          nodes: [
            {
              id: 'gid://shopify/Order/5516156698880',
              name: '#1021',
              transactions: listOrderTransactionApiData,
            },
          ],
        },
      })
    );

    const result = await doSync('OrderTransactions', defaultCollectParams);
    await matchRowsSnapshot(expect, result, 'orderTransaction');
  });

  test('Page', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Page]: listPageApiData }));
    const result = await doSync('Pages', defaultPagesParams);
    await matchRowsSnapshot(expect, result, 'page');
  });

  test('Product', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ products: { nodes: listProductApiData } }));
    const result = await doSync('Products', defaultProductsParams);
    await matchRowsSnapshot(expect, result, 'product');
  });

  test('Redirect', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Redirect]: listRedirectApiData }));
    const result = await doSync('Redirects', defaultRedirectsParams);
    await matchRowsSnapshot(expect, result, 'redirect');
  });

  test('Shop', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Shop]: SingleShopApiData }));
    const result = await doSync('Shops', defaultShopsParams);
    await matchRowsSnapshot(expect, result, 'shop');
  });

  test('Variant', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ productVariants: { nodes: listVariantApiData } }));
    const result = await doSync('ProductVariants', defaultVariantsParams);
    await matchRowsSnapshot(expect, result, 'variant');
  });
});

describe.skip('INTEGRATION: Sync resources', () => {
  async function doSync(SyncFormulaName: string, args: any[]) {
    return executeSyncFormulaFromPackDef(
      pack,
      SyncFormulaName,
      args as coda.ParamValues<coda.ParamDefs>,
      undefined,
      defaultIntegrationSyncExecuteOptions,
      {
        useRealFetcher: true,
        manifestPath,
      }
    );
  }

  test('Sync Articles with Metafields', async () => {
    const expected = expectedRows.article;
    const [syncMetafieldsDefault, ...params] = defaultArticleParams;
    const result = await doSync('Articles', [
      true, // syncMetafields
      ...params,
    ] as SyncArticlesParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Blogs with Metafields', async () => {
    const expected = expectedRows.blog;
    const [syncMetafieldsDefault, ...params] = defaultBlogParams;
    const result = await doSync('Blogs', [
      true, // syncMetafields
      ...params,
    ] as SyncBlogsParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Collections with Metafields', async () => {
    const expected = expectedRows.collectionSmart;
    const [syncMetafieldsDefault, ...params] = defaultCollectionParams;
    const result = await doSync('Collections', [
      true, // syncMetafields
      ...params,
    ] as SyncCollectionsParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Collects', async () => {
    const expected = expectedRows.collect;
    const result = await doSync('Collects', defaultCollectParams);

    compareToExpectedRow(
      result.find((res) => res.Id === expected.id),
      normalizeExpectedRowKeys(expected)
    );
  });

  test('Sync DraftOrders with Metafields', async () => {
    const expected = expectedRows.draftOrder;
    const [syncMetafieldsDefault, ...params] = defaultDraftOrdersParams;
    const result = await doSync('DraftOrders', [
      true, // syncMetafields
      ...params,
    ] as SyncDraftOrdersParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Customers with Metafields', async () => {
    const expected = [expectedRows.customer];
    const [syncMetafieldsDefault, ...params] = defaultCustomersParams;
    const result = await doSync('Customers', [
      true, // syncMetafields
      ...params,
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
    const result = await doSync('Files', defaultFilesParams);

    compareToExpectedRow(
      result.find((res) => res.GraphqlGid === expected.id),
      normalizeExpectedRowKeys(expected)
    );
  });

  test('Sync InventoryLevels', async () => {
    const expected = expectedRows.inventoryLevel;
    const result = await doSync('InventoryLevels', defaultInventoryLevelsParams);

    compareToExpectedRow(
      result.find((res) => res.UniqueId === expected.unique_id),
      normalizeExpectedRowKeys(expected) // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync InventoryItems', async () => {
    const expected = expectedRows.inventoryItem;
    const result = await doSync('InventoryItems', defaultInventoryItemsParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Locations with Metafields', async () => {
    const expected = expectedRows.location;
    const [syncMetafieldsDefault, ...params] = defaultLocationsParams;
    const result = await doSync('Locations', [
      true, // syncMetafields,
      ...params,
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
      defaultRestMetafieldsParams,
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
      defaultGraphQLMetafieldsParams,
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
    const result = await doSync('MetafieldDefinitions', defaultMetafieldDefinitionsParams);

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
      defaultMetaobjectsParams,
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
    const [statusDefault, syncMetafieldsDefault, ...params] = defaultOrdersParams;
    const result = await doSync('Orders', [
      statusDefault,
      true, // syncMetafields
      ...params,
    ] as SyncOrdersParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync OrderLineItems', async () => {
    const expected = expectedRows.orderLineItems;
    const result = await doSync('OrderLineItems', defaultOrderLineItemsParams);

    compareToExpectedRow(
      result,
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync OrderTransactions', async () => {
    const expected = expectedRows.orderTransaction;
    const result = await doSync('OrderTransactions', defaultOrderTransactionsParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Pages with Metafields', async () => {
    const expected = expectedRows.page;
    const [syncMetafieldsDefault, ...params] = defaultPagesParams;
    const result = await doSync('Pages', [
      true, // syncMetafields
      ...params,
    ] as SyncPagesParams);

    compareToExpectedRow(
      result[0],
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });

  test('Sync Products with Metafields', async () => {
    const expected = [expectedRows.product];
    const [syncMetafieldsDefault, ...params] = defaultProductsParams;
    const result = await doSync('Products', [
      true, // syncMetafields
      ...params,
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
    const [syncMetafieldsDefault, ...params] = defaultVariantsParams;
    const result = await doSync('ProductVariants', [
      true, // syncMetafields
      ...params,
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
    const result = await doSync('Redirects', defaultRedirectsParams);

    compareToExpectedRow(
      result.find((res) => res.Id === expected.id),
      normalizeExpectedRowKeys(expected)
    );
  });

  test('Sync Shops', async () => {
    const expected = expectedRows.shop;
    const result = await doSync('Shops', defaultShopsParams);

    compareToExpectedRow(result[0], normalizeExpectedRowKeys(expected));
  });

  test('Sync Translations', async () => {
    const expected = expectedRows.translation;
    const result = await doSync('Translations', defaultTranslationsParams);

    compareToExpectedRow(
      result.find((res) => res.id === expected.id),
      expected // No need to normalize because dynamic schema will not be normalized in CLI context
    );
  });
});
