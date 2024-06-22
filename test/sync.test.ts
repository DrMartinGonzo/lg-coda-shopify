// #region Imports

import * as coda from '@codahq/packs-sdk';
import {
  ExecuteOptions,
  MockSyncExecutionContext,
  executeSyncFormulaFromPackDef,
  executeSyncFormulaFromPackDefSingleIteration,
  newJsonFetchResponse,
  newMockSyncExecutionContext,
} from '@codahq/packs-sdk/dist/development';
import sinon from 'sinon';
import UrlParse from 'url-parse';
import { ExpectStatic, beforeEach, describe, expect, test } from 'vitest';

import { REST_SYNC_OWNER_METAFIELDS_LIMIT } from '../Clients/RestClients';
import { REST_DEFAULT_API_VERSION } from '../config';
import { PACK_TEST_ENDPOINT } from '../constants/pack-constants';
import { RestResourcesPlural, RestResourcesSingular } from '../constants/resourceNames-constants';
import { getMetafieldDefinitionsQuery } from '../graphql/metafieldDefinitions-graphql';
import { getSingleMetaObjectDefinitionQuery } from '../graphql/metaobjectDefinition-graphql';
import { throttleStatusQuery } from '../graphql/shop-graphql';
import { graphQlGidToId } from '../graphql/utils/graphql-utils';
import { pack } from '../pack';
import { MetafieldOwnerType, TranslatableResourceType } from '../types/admin.types';
import { formatOptionNameId } from '../utils/helpers';
import {
  defaultIntegrationSyncExecuteOptions,
  defaultMockSyncExecuteOptions,
  excludeVolatileProperties,
  getCurrentShopCurrencyMockResponse,
  getSyncContextWithDynamicUrl,
  getThrottleStatusMockResponse,
  isSameGraphQlQueryRequest,
  manifestPath,
  newGraphqlFetchResponse,
  referenceIds,
} from './utils/test-utils';

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
import { SyncInventoryLevelsParams } from '../sync/rest/SyncedInventoryLevels';
import { SyncMetafieldsParams } from '../sync/rest/SyncedMetafields';
import { SyncOrderLineItemsParams } from '../sync/rest/SyncedOrderLineItems';
import { SyncOrdersParams } from '../sync/rest/SyncedOrders';
import { SyncPagesParams } from '../sync/rest/SyncedPages';
import { SyncRedirectsParams } from '../sync/rest/SyncedRedirects';
import { SyncShopsParams } from '../sync/rest/SyncedShops';
import * as listData from './__snapshots__/api/list';
import * as singleData from './__snapshots__/api/single';

// #endregion

// #region Default Sync Parameters
const defaultArticleParams = [
  false, // syncMetafields
  [formatOptionNameId(singleData.blog.title, singleData.article.blog_id)], // blog idArray
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

const defaultSmartCollectionParams = [
  false, // syncMetafields
  undefined, // updatedAtRange
  undefined, // publishedAtRange
  singleData.smartCollection.handle, // handle
  undefined, // idArray
  undefined, // productId
  undefined, // publishedStatus
  undefined, // title
] as SyncCollectionsParams;

const defaultCollectParams = [
  singleData.collect.collection_id, // collectionId
] as SyncCollectsParams;

const defaultDraftOrdersParams = [
  false, // syncMetafields
  undefined, // status
  undefined, // updatedAtRange
  [singleData.draftOrder.id.toString()], // idArray
  undefined, // sinceId
] as SyncDraftOrdersParams;

const defaultCustomersParams = [
  false, // syncMetafields
  undefined, // createdAtRange
  undefined, // updatedAtRange
  [singleData.customer.id.toString()], // idArray
  undefined, // tags
] as SyncCustomersParams;

const defaultFilesParams = [
  'IMAGE', // type
  '64', // previewSize
] as SyncFilesParams;

const defaultInventoryLevelsParams = [
  [`Vitest Location (${graphQlGidToId(singleData.location.id)})`], // locationIds
  undefined, // updatedAtMin
] as SyncInventoryLevelsParams;

const defaultInventoryItemsParams = [
  undefined, // createdAtRange
  undefined, // updatedAtRange
  listData.inventoryItems.map((i) => i.sku), // skuArray
] as SyncInventoryItemsParams;

const defaultLocationsParams = [
  false, // syncMetafields
] as SyncLocationsParams;

const defaultArticleMetafieldsParams = [
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
  [singleData.order.id.toString()], // idArray
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
  [singleData.order.id.toString()], // idArray
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
  singleData.page.handle, // handle
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
  [graphQlGidToId(singleData.product.id).toString()], // idArray
  undefined, // tagsArray
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
  [graphQlGidToId(singleData.product.id).toString()], // idArray
] as SyncVariantsParams;

const defaultRedirectsParams = [
  singleData.redirect.path, // path
  undefined, // target
] as SyncRedirectsParams;

const defaultShopsParams = [] as SyncShopsParams;

const defaultTranslationsParams = [
  singleData.translation.locale, // locale
  TranslatableResourceType.Collection, // resourceType
] as SyncTranslationsParams;
// #endregion

async function matchRowsSnapshot(expect: ExpectStatic, result: any[], name: string) {
  await expect(JSON.stringify(result.map(excludeVolatileProperties), null, 2)).toMatchFileSnapshot(
    `./__snapshots__/rows/mock/${name}.rows.json`
  );
}
async function matchRowsIntegrationSnapshot(expect: ExpectStatic, result: any[], name: string) {
  await expect(JSON.stringify(result.map(excludeVolatileProperties), null, 2)).toMatchFileSnapshot(
    `./__snapshots__/rows/integration/${name}.rows.json`
  );
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

const isRestMetafieldsRequest = sinon.match((fetchRequest: coda.FetchRequest) => {
  const restMetafieldsUrlStart = `${PACK_TEST_ENDPOINT}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;
  return fetchRequest?.url.startsWith(restMetafieldsUrlStart);
}, 'isRestMetafieldOwnerRequest');

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

  test.skip('Article', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Article]: listData.articles }));

    const result = await doSync('Articles', defaultArticleParams);
    await matchRowsSnapshot(expect, result, 'articles');
  });

  // INVESTIGATE: bug when running along with previous 'Article' test, withArgs(isMetafieldDefinitionRequest) is not triggered ?
  test('Article with metafields', async ({ expect }) => {
    context.fetcher.fetch.withArgs(isMetafieldDefinitionRequest).callsFake(function fakeFn() {
      return newGraphqlFetchResponse({
        metafieldDefinitions: { nodes: listData.articleMetafieldDefinitions },
      });
    });
    context.fetcher.fetch.withArgs(isRestMetafieldsRequest).callsFake(function fakeFn(fetchRequest: coda.FetchRequest) {
      const decodedUrl = decodeURI(fetchRequest.url);
      const parsedUrl = new UrlParse(decodedUrl, true);
      const ownerId = parseInt(parsedUrl.query['metafield[owner_id]']);
      return newJsonFetchResponse({
        [RestResourcesPlural.Metafield]: listData.articleMetafields.filter((m) => m.owner_id === ownerId),
      });
    });
    context.sync.dynamicUrl = MetafieldOwnerType.Article;

    const [syncMetafieldsDefault, ...params] = defaultArticleParams;
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Article]: listData.articles }));
    const result = await doSync('Articles', [
      true, // syncMetafields
      ...params,
    ]);
    await matchRowsSnapshot(expect, result, 'articlesWithMetafields');
  });

  test('Blog', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Blog]: listData.blogs }));
    const result = await doSync('Blogs', defaultBlogParams);
    await matchRowsSnapshot(expect, result, 'blogs');
  });

  test('Collection', async ({ expect }) => {
    context.fetcher.fetch
      .onFirstCall()
      .returns(newJsonFetchResponse({ [RestResourcesPlural.CustomCollection]: listData.customCollections }));
    context.fetcher.fetch
      .onSecondCall()
      .returns(newJsonFetchResponse({ [RestResourcesPlural.SmartCollection]: listData.smartCollections }));
    const result = await doSync('Collections', defaultSmartCollectionParams);
    await matchRowsSnapshot(expect, result, 'collections');
  });

  test('Collect', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Collect]: listData.collects }));
    const result = await doSync('Collects', defaultCollectParams);
    await matchRowsSnapshot(expect, result, 'collects');
  });

  test('Customer', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Customer]: listData.customers }));
    const result = await doSync('Customers', defaultCustomersParams);
    await matchRowsSnapshot(expect, result, 'customers');
  });

  test('DraftOrder', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.DraftOrder]: listData.draftOrders }));
    const result = await doSync('DraftOrders', defaultDraftOrdersParams);
    await matchRowsSnapshot(expect, result, 'draftOrders');
  });

  test('File', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ files: { nodes: listData.files } }));
    const result = await doSync('Files', defaultFilesParams);
    await matchRowsSnapshot(expect, result, 'files');
  });

  test('InventoryLevel', async ({ expect }) => {
    context.fetcher.fetch.returns(
      newJsonFetchResponse({ [RestResourcesPlural.InventoryLevel]: listData.inventoryLevels })
    );
    const result = await doSync('InventoryLevels', defaultInventoryLevelsParams);
    await matchRowsSnapshot(expect, result, 'inventoryLevels');
  });

  test('InventoryItem', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ inventoryItems: { nodes: listData.inventoryItems } }));

    const result = await doSync('InventoryItems', defaultInventoryItemsParams);
    await matchRowsSnapshot(expect, result, 'inventoryItems');
  });

  test('Location', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ locations: { nodes: listData.locations } }));
    const result = await doSync('Locations', defaultLocationsParams);
    await matchRowsSnapshot(expect, result, 'locations');
  });

  test('Sync Article (Rest) Metafields', async ({ expect }) => {
    const restMetafieldsArticleUrl = `${PACK_TEST_ENDPOINT}/admin/api/${REST_DEFAULT_API_VERSION}/articles.json?fields=id&limit=${REST_SYNC_OWNER_METAFIELDS_LIMIT}`;
    const isRestMetafieldsArticleRequest = sinon.match(
      (fetchRequest: coda.FetchRequest) => fetchRequest?.url === restMetafieldsArticleUrl,
      'isRestMetafieldOwnerRequest'
    );

    context.sync.dynamicUrl = MetafieldOwnerType.Article;
    context.fetcher.fetch.withArgs(isRestMetafieldsArticleRequest).returns(
      newJsonFetchResponse({
        [RestResourcesPlural.Article]: listData.articles.map((article) => ({ id: article.id })),
      })
    );
    // On doit utiliser une fonction de callback sinon on dirait que la réponse se 'détériore' à chaque run…
    // L'object ne doit pas être immutable quelque part…
    context.fetcher.fetch.withArgs(isRestMetafieldsRequest).callsFake(function fakeFn() {
      return newJsonFetchResponse({
        [RestResourcesPlural.Metafield]: listData.articleMetafields,
      });
    });
    context.fetcher.fetch.withArgs(isMetafieldDefinitionRequest).callsFake(function fakeFn() {
      return newGraphqlFetchResponse({
        metafieldDefinitions: { nodes: listData.articleMetafieldDefinitions },
      });
    });

    const result = await doSync('Metafields', defaultArticleMetafieldsParams);
    await matchRowsSnapshot(expect, result, 'restMetafields');
  });

  test('Sync Product (GraphQL) Metafields', async ({ expect }) => {
    context.sync.dynamicUrl = MetafieldOwnerType.Product;
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        products: {
          nodes: [
            {
              id: listData.productMetafields[0].parentNode.id,
              __typename: 'Product',
              metafields: { nodes: listData.productMetafields },
            },
          ],
        },
      })
    );
    const result = await doSync('Metafields', defaultGraphQLMetafieldsParams);
    await matchRowsSnapshot(expect, result, 'graphqlMetafields');
  });

  test('MetafieldDefinitions', async ({ expect }) => {
    context.sync.dynamicUrl = MetafieldOwnerType.Product;
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        metafieldDefinitions: {
          nodes: listData.articleMetafieldDefinitions,
        },
      })
    );
    const result = await doSync('MetafieldDefinitions', defaultMetafieldDefinitionsParams);
    await matchRowsSnapshot(expect, result, 'metafieldDefinitions');
  });

  test('Metaobjects', async ({ expect }) => {
    context.sync.dynamicUrl = SyncedMetaobjects.encodeDynamicUrl({
      id: listData.metaobjects[0].definition.id,
    });
    context.fetcher.fetch
      .withArgs(isSingleMetaobjectDefinitionRequest)
      .returns(newGraphqlFetchResponse({ metaobjectDefinition: singleData.testMetaobjectDefinition }));
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ metaobjects: { nodes: listData.metaobjects } }));
    const result = await doSync('Metaobjects', defaultMetaobjectsParams);
    await matchRowsSnapshot(expect, result, 'metaobjects');
  });

  test('Order', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Order]: listData.orders }));
    const result = await doSync('Orders', defaultOrdersParams);
    await matchRowsSnapshot(expect, result, 'orders');
  });

  test('OrderLineItem', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Order]: listData.orders }));
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
              transactions: listData.orderTransactions,
            },
          ],
        },
      })
    );

    const result = await doSync('OrderTransactions', defaultCollectParams);
    await matchRowsSnapshot(expect, result, 'orderTransactions');
  });

  test('Page', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Page]: listData.pages }));
    const result = await doSync('Pages', defaultPagesParams);
    await matchRowsSnapshot(expect, result, 'pages');
  });

  test('Product', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ products: { nodes: listData.products } }));
    const result = await doSync('Products', defaultProductsParams);
    await matchRowsSnapshot(expect, result, 'products');
  });

  test('Redirect', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Redirect]: listData.redirects }));
    const result = await doSync('Redirects', defaultRedirectsParams);
    await matchRowsSnapshot(expect, result, 'redirects');
  });

  test('Shop', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Shop]: singleData.shop }));
    const result = await doSync('Shops', defaultShopsParams);
    await matchRowsSnapshot(expect, result, 'shops');
  });

  test('Variant', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ productVariants: { nodes: listData.variants } }));
    const result = await doSync('ProductVariants', defaultVariantsParams);
    await matchRowsSnapshot(expect, result, 'variants');
  });

  test('GraphQl not enough points', async () => {
    context.fetcher.fetch.withArgs(isCheckThrottleStatusRequest).returns(getThrottleStatusMockResponse(100));
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ products: { nodes: listData.products } }));
    const result = await executeSyncFormulaFromPackDefSingleIteration(
      pack,
      'Products',
      defaultProductsParams,
      context,
      defaultMockSyncExecuteOptions
    );

    expect(result.result).toEqual([]);
    expect(result.continuation).toEqual({ hasLock: 'false' });
  });
});

describe.skip('INTEGRATION: Sync resources', () => {
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
      overrideContext,
      overrideOptions ?? defaultIntegrationSyncExecuteOptions,
      {
        useRealFetcher: true,
        manifestPath,
      }
    );
  }

  test('Sync Articles with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultArticleParams;
    const result = await doSync('Articles', [
      true, // syncMetafields
      ...params,
    ] as SyncArticlesParams);
    await matchRowsIntegrationSnapshot(expect, result, 'articlesWithMetafields');
  });

  test('Sync Blogs with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultBlogParams;
    const result = await doSync('Blogs', [
      true, // syncMetafields
      ...params,
    ] as SyncBlogsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'blogsWithMetafields');
  });

  test('Sync Collections with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultSmartCollectionParams;
    const result = await doSync('Collections', [
      true, // syncMetafields
      ...params,
    ] as SyncCollectionsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'collectionsWithMetafields');
  });

  test('Sync Collects', async () => {
    const result = await doSync('Collects', defaultCollectParams);
    await matchRowsIntegrationSnapshot(expect, result, 'collects');
  });

  test('Sync DraftOrders with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultDraftOrdersParams;
    const result = await doSync('DraftOrders', [
      true, // syncMetafields
      ...params,
    ] as SyncDraftOrdersParams);
    await matchRowsIntegrationSnapshot(expect, result, 'draftOrdersWithMetafields');
  });

  test('Sync Customers with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultCustomersParams;
    const result = await doSync('Customers', [
      true, // syncMetafields
      ...params,
    ] as SyncCustomersParams);
    await matchRowsIntegrationSnapshot(expect, result, 'customersWithMetafields');
  });

  test('Sync Files', async () => {
    const result = await doSync('Files', defaultFilesParams);
    await matchRowsIntegrationSnapshot(
      expect,
      result.filter((res) => res.GraphqlGid === singleData.file.id),
      'files'
    );
  });

  test('Sync InventoryLevels', async () => {
    const result = await doSync('InventoryLevels', defaultInventoryLevelsParams);
    await matchRowsIntegrationSnapshot(
      expect,
      // don't keep the whole list
      result.slice(0, 5),
      'inventoryLevels'
    );
  });

  test('Sync InventoryItems', async () => {
    const result = await doSync('InventoryItems', defaultInventoryItemsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'inventoryItems');
  });

  test('Sync Locations with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultLocationsParams;
    const result = await doSync('Locations', [
      true, // syncMetafields,
      ...params,
    ] as SyncLocationsParams);
    await matchRowsIntegrationSnapshot(
      expect,
      result.filter((res) => res.id === graphQlGidToId(singleData.location.id)),
      'locationsWithMetafields'
    );
  });

  test('Sync Article (Rest) Metafields', async () => {
    const result = await doSync(
      'Metafields',
      defaultArticleMetafieldsParams,
      getSyncContextWithDynamicUrl(MetafieldOwnerType.Article)
    );
    await matchRowsIntegrationSnapshot(
      expect,
      result.filter((res) => res.owner_id === listData.articleMetafields[0].owner_id),
      'restMetafields'
    );
  });

  test('Sync Product (GraphQL) Metafields', async () => {
    const result = await doSync(
      'Metafields',
      defaultGraphQLMetafieldsParams,
      getSyncContextWithDynamicUrl(MetafieldOwnerType.Product)
    );
    await matchRowsIntegrationSnapshot(
      expect,
      result.filter((res) => res.owner_id === graphQlGidToId(listData.productMetafields[0].parentNode.id)),
      'graphqlMetafields'
    );
  });

  test('Sync MetafieldDefinitions', async () => {
    const result = await doSync('MetafieldDefinitions', defaultMetafieldDefinitionsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'metafieldDefinitions');
  });

  test('Sync Metaobjects', async () => {
    const result = await doSync(
      'Metaobjects',
      defaultMetaobjectsParams,
      getSyncContextWithDynamicUrl(SyncedMetaobjects.encodeDynamicUrl({ id: referenceIds.sync.metaobjectDefinition }))
    );
    await matchRowsIntegrationSnapshot(
      expect,
      result.filter((res) => res.id === graphQlGidToId(singleData.testMetaobject.id)),
      'testMetaobjects'
    );
  });

  test('Sync Orders with Metafields', async () => {
    const [statusDefault, syncMetafieldsDefault, ...params] = defaultOrdersParams;
    const result = await doSync('Orders', [
      statusDefault,
      true, // syncMetafields
      ...params,
    ] as SyncOrdersParams);
    await matchRowsIntegrationSnapshot(expect, result, 'ordersWithMetafields');
  });

  test('Sync OrderLineItems', async () => {
    const result = await doSync('OrderLineItems', defaultOrderLineItemsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'orderLineItems');
  });

  test('Sync OrderTransactions', async () => {
    const result = await doSync('OrderTransactions', defaultOrderTransactionsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'orderTransactions');
  });

  test('Sync Pages with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultPagesParams;
    const result = await doSync('Pages', [
      true, // syncMetafields
      ...params,
    ] as SyncPagesParams);
    await matchRowsIntegrationSnapshot(expect, result, 'pages');
  });

  test('Sync Products with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultProductsParams;
    console.log('defaultProductsParams', defaultProductsParams);
    const result = await doSync('Products', [
      true, // syncMetafields
      ...params,
    ] as SyncProductsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'products');
  });

  test('Sync ProductVariants with Metafields', async () => {
    const [syncMetafieldsDefault, ...params] = defaultVariantsParams;
    const result = await doSync('ProductVariants', [
      true, // syncMetafields
      ...params,
    ] as SyncVariantsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'variants');
  });

  test('Sync Redirects', async () => {
    const result = await doSync('Redirects', defaultRedirectsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'redirects');
  });

  test('Sync Shops', async () => {
    const result = await doSync('Shops', defaultShopsParams);
    await matchRowsIntegrationSnapshot(expect, result, 'shops');
  });

  test('Sync Translations', async () => {
    const result = await doSync('Translations', defaultTranslationsParams);
    await matchRowsIntegrationSnapshot(
      expect,
      result.filter((res) => res.originalValue === 'Vitest Smart Collection'),
      'translations'
    );
  });
});
