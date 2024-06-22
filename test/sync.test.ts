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
import { excludeObjectKeys, formatOptionNameId } from '../utils/helpers';
import { excludeVolatileProperties, referenceIds } from './utils/test-utils';
import {
  defaultIntegrationSyncExecuteOptions,
  defaultMockSyncExecuteOptions,
  getCurrentShopCurrencyMockResponse,
  getSyncContextWithDynamicUrl,
  getThrottleStatusMockResponse,
  isSameGraphQlQueryRequest,
  manifestPath,
  newGraphqlFetchResponse,
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

import listArticleApiData from './__snapshots__/api/article.list.json';
import listArticleMetafieldApiData from './__snapshots__/api/articleMetafield.list.json';
import listArticleMetafieldDefinitionApiData from './__snapshots__/api/articleMetafieldDefinition.list.json';
import listBlogApiData from './__snapshots__/api/blog.list.json';
import listCollectApiData from './__snapshots__/api/collect.list.json';
import listCustomCollectionApiData from './__snapshots__/api/customCollection.list.json';
import listCustomerApiData from './__snapshots__/api/customer.list.json';
import listDraftOrderApiData from './__snapshots__/api/draftOrder.list.json';
import listFileApiData from './__snapshots__/api/file.list.json';
import listProductMetafieldApiData from './__snapshots__/api/graphqlMetafield.list.json';
import {
  default as ListInventoryItemApiData,
  default as listInventoryItemApiData,
} from './__snapshots__/api/inventoryItem.list.json';
import listInventoryLevelApiData from './__snapshots__/api/inventoryLevel.list.json';
import listLocationApiData from './__snapshots__/api/location.list.json';
import listMetaobjectApiData from './__snapshots__/api/metaobject.list.json';
import listOrderApiData from './__snapshots__/api/order.list.json';
import listOrderTransactionApiData from './__snapshots__/api/orderTransaction.list.json';
import listPageApiData from './__snapshots__/api/page.list.json';
import listProductApiData from './__snapshots__/api/product.list.json';
import listRedirectApiData from './__snapshots__/api/redirect.list.json';
import listSmartCollectionApiData from './__snapshots__/api/smartCollection.list.json';
import listVariantApiData from './__snapshots__/api/variant.list.json';

import singleArticleApiData from './__snapshots__/api/article.single.json';
import singleBlogApiData from './__snapshots__/api/blog.single.json';
import SingleCollectApiData from './__snapshots__/api/collect.single.json';
import singleCustomerApiData from './__snapshots__/api/customer.single.json';
import singleDraftOrderApiData from './__snapshots__/api/draftOrder.single.json';
import singleFileApiData from './__snapshots__/api/file.single.json';
import singleLocationApiData from './__snapshots__/api/location.single.json';
import singleTestMetaobjectApiData from './__snapshots__/api/metaobject.single.json';
import singleOrderApiData from './__snapshots__/api/order.single.json';
import singlePageApiData from './__snapshots__/api/page.single.json';
import singleProductApiData from './__snapshots__/api/product.single.json';
import singleRedirectApiData from './__snapshots__/api/redirect.single.json';
import SingleShopApiData from './__snapshots__/api/shop.single.json';
import singleSmartCollectionApiData from './__snapshots__/api/smartCollection.single.json';
import singleTestMetaobjectDefinitionApiData from './__snapshots__/api/testMetaobjectDefinition.single.json';
import singleTranslationApiData from './__snapshots__/api/translation.single.json';

// #endregion

// #region Default Sync Parameters
const defaultArticleParams = [
  false, // syncMetafields
  [formatOptionNameId(singleBlogApiData.title, singleArticleApiData.blog_id)], // blog idArray
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
  singleSmartCollectionApiData.handle, // handle
  undefined, // idArray
  undefined, // productId
  undefined, // publishedStatus
  undefined, // title
] as SyncCollectionsParams;

const defaultCollectParams = [
  SingleCollectApiData.collection_id, // collectionId
] as SyncCollectsParams;

const defaultDraftOrdersParams = [
  false, // syncMetafields
  undefined, // status
  undefined, // updatedAtRange
  [singleDraftOrderApiData.id.toString()], // idArray
  undefined, // sinceId
] as SyncDraftOrdersParams;

const defaultCustomersParams = [
  false, // syncMetafields
  undefined, // createdAtRange
  undefined, // updatedAtRange
  [singleCustomerApiData.id.toString()], // idArray
  undefined, // tags
] as SyncCustomersParams;

const defaultFilesParams = [
  'IMAGE', // type
  '64', // previewSize
] as SyncFilesParams;

const defaultInventoryLevelsParams = [
  [`Vitest Location (${graphQlGidToId(singleLocationApiData.id)})`], // locationIds
  undefined, // updatedAtMin
] as SyncInventoryLevelsParams;

const defaultInventoryItemsParams = [
  undefined, // createdAtRange
  undefined, // updatedAtRange
  ListInventoryItemApiData.map((i) => i.sku), // skuArray
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
  [singleOrderApiData.id.toString()], // idArray
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
  [singleOrderApiData.id.toString()], // idArray
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
  singlePageApiData.handle, // handle
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
  [graphQlGidToId(singleProductApiData.id).toString()], // idArray
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
  [graphQlGidToId(singleProductApiData.id).toString()], // idArray
] as SyncVariantsParams;

const defaultRedirectsParams = [
  singleRedirectApiData.path, // path
  undefined, // target
] as SyncRedirectsParams;

const defaultShopsParams = [] as SyncShopsParams;

const defaultTranslationsParams = [
  singleTranslationApiData.locale, // locale
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
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Article]: listArticleApiData }));

    const result = await doSync('Articles', defaultArticleParams);
    await matchRowsSnapshot(expect, result, 'articles');
  });

  // INVESTIGATE: bug when running along with previous 'Article' test, withArgs(isMetafieldDefinitionRequest) is not triggered ?
  test('Article with metafields', async ({ expect }) => {
    context.fetcher.fetch.withArgs(isMetafieldDefinitionRequest).callsFake(function fakeFn() {
      return newGraphqlFetchResponse({
        metafieldDefinitions: { nodes: listArticleMetafieldDefinitionApiData },
      });
    });
    context.fetcher.fetch.withArgs(isRestMetafieldsRequest).callsFake(function fakeFn(fetchRequest: coda.FetchRequest) {
      const decodedUrl = decodeURI(fetchRequest.url);
      const parsedUrl = new UrlParse(decodedUrl, true);
      const ownerId = parseInt(parsedUrl.query['metafield[owner_id]']);
      return newJsonFetchResponse({
        [RestResourcesPlural.Metafield]: listArticleMetafieldApiData.filter((m) => m.owner_id === ownerId),
      });
    });
    context.sync.dynamicUrl = MetafieldOwnerType.Article;

    const [syncMetafieldsDefault, ...params] = defaultArticleParams;
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Article]: listArticleApiData }));
    const result = await doSync('Articles', [
      true, // syncMetafields
      ...params,
    ]);
    await matchRowsSnapshot(expect, result, 'articlesWithMetafields');
  });

  test('Blog', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Blog]: listBlogApiData }));
    const result = await doSync('Blogs', defaultBlogParams);
    await matchRowsSnapshot(expect, result, 'blogs');
  });

  test('Collection', async ({ expect }) => {
    context.fetcher.fetch
      .onFirstCall()
      .returns(newJsonFetchResponse({ [RestResourcesPlural.CustomCollection]: listCustomCollectionApiData }));
    context.fetcher.fetch
      .onSecondCall()
      .returns(newJsonFetchResponse({ [RestResourcesPlural.SmartCollection]: listSmartCollectionApiData }));
    const result = await doSync('Collections', defaultSmartCollectionParams);
    await matchRowsSnapshot(expect, result, 'collections');
  });

  test('Collect', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Collect]: listCollectApiData }));
    const result = await doSync('Collects', defaultCollectParams);
    await matchRowsSnapshot(expect, result, 'collects');
  });

  test('Customer', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Customer]: listCustomerApiData }));
    const result = await doSync('Customers', defaultCustomersParams);
    await matchRowsSnapshot(expect, result, 'customers');
  });

  test('DraftOrder', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.DraftOrder]: listDraftOrderApiData }));
    const result = await doSync('DraftOrders', defaultDraftOrdersParams);
    await matchRowsSnapshot(expect, result, 'draftOrders');
  });

  test('File', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ files: { nodes: listFileApiData } }));
    const result = await doSync('Files', defaultFilesParams);
    await matchRowsSnapshot(expect, result, 'files');
  });

  test('InventoryLevel', async ({ expect }) => {
    context.fetcher.fetch.returns(
      newJsonFetchResponse({ [RestResourcesPlural.InventoryLevel]: listInventoryLevelApiData })
    );
    const result = await doSync('InventoryLevels', defaultInventoryLevelsParams);
    await matchRowsSnapshot(expect, result, 'inventoryLevels');
  });

  test('InventoryItem', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ inventoryItems: { nodes: listInventoryItemApiData } }));

    const result = await doSync('InventoryItems', defaultInventoryItemsParams);
    await matchRowsSnapshot(expect, result, 'inventoryItems');
  });

  test('Location', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ locations: { nodes: listLocationApiData } }));
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
              id: listProductMetafieldApiData[0].parentNode.id,
              __typename: 'Product',
              metafields: { nodes: listProductMetafieldApiData },
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
          nodes: listArticleMetafieldDefinitionApiData,
        },
      })
    );
    const result = await doSync('MetafieldDefinitions', defaultMetafieldDefinitionsParams);
    await matchRowsSnapshot(expect, result, 'metafieldDefinitions');
  });

  test('Metaobjects', async ({ expect }) => {
    context.sync.dynamicUrl = SyncedMetaobjects.encodeDynamicUrl({ id: listMetaobjectApiData[0].definition.id });
    context.fetcher.fetch
      .withArgs(isSingleMetaobjectDefinitionRequest)
      .returns(newGraphqlFetchResponse({ metaobjectDefinition: singleTestMetaobjectDefinitionApiData }));
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ metaobjects: { nodes: listMetaobjectApiData } }));
    const result = await doSync('Metaobjects', defaultMetaobjectsParams);
    await matchRowsSnapshot(expect, result, 'metaobjects');
  });

  test('Order', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Order]: listOrderApiData }));
    const result = await doSync('Orders', defaultOrdersParams);
    await matchRowsSnapshot(expect, result, 'orders');
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
    await matchRowsSnapshot(expect, result, 'orderTransactions');
  });

  test('Page', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Page]: listPageApiData }));
    const result = await doSync('Pages', defaultPagesParams);
    await matchRowsSnapshot(expect, result, 'pages');
  });

  test('Product', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ products: { nodes: listProductApiData } }));
    const result = await doSync('Products', defaultProductsParams);
    await matchRowsSnapshot(expect, result, 'products');
  });

  test('Redirect', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesPlural.Redirect]: listRedirectApiData }));
    const result = await doSync('Redirects', defaultRedirectsParams);
    await matchRowsSnapshot(expect, result, 'redirects');
  });

  test('Shop', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Shop]: SingleShopApiData }));
    const result = await doSync('Shops', defaultShopsParams);
    await matchRowsSnapshot(expect, result, 'shops');
  });

  test('Variant', async ({ expect }) => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ productVariants: { nodes: listVariantApiData } }));
    const result = await doSync('ProductVariants', defaultVariantsParams);
    await matchRowsSnapshot(expect, result, 'variants');
  });

  test('GraphQl not enough points', async () => {
    context.fetcher.fetch.withArgs(isCheckThrottleStatusRequest).returns(getThrottleStatusMockResponse(100));
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ products: { nodes: listProductApiData } }));
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
      result.filter((res) => res.GraphqlGid === singleFileApiData.id),
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
      result.filter((res) => res.id === graphQlGidToId(singleLocationApiData.id)),
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
      result.filter((res) => res.owner_id === listArticleMetafieldApiData[0].owner_id),
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
      result.filter((res) => res.owner_id === graphQlGidToId(listProductMetafieldApiData[0].parentNode.id)),
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
      result.filter((res) => res.id === graphQlGidToId(singleTestMetaobjectApiData.id)),
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
