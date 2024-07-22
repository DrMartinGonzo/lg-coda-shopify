// #region Imports
import { ExpectStatic, describe, test } from 'vitest';

import {
  FileClient,
  LocationClient,
  MarketClient,
  MetafieldDefinitionClient,
  MetafieldClient as MetafieldGraphQlClient,
  MetaobjectClient,
  MetaobjectDefinitionClient,
  OrderTransactionClient,
  ProductClient,
  TranslationClient,
  VariantClient,
} from '../Clients/GraphQlClients';
import {
  ArticleClient,
  BlogClient,
  CollectClient,
  CustomCollectionClient,
  CustomerClient,
  DraftOrderClient,
  InventoryLevelClient,
  MetafieldClient,
  OrderClient,
  PageClient,
  RedirectClient,
  ShopClient,
  SmartCollectionClient,
} from '../Clients/RestClients';
import { RestResourcesSingular } from '../constants/resourceNames-constants';
import { graphQlGidToId } from '../graphql/utils/graphql-utils';
import { MetafieldOwnerType, TranslatableResourceType } from '../types/admin.types';
import { excludeVolatileProperties, getRealContext, referenceIds } from './utils/test-utils';

// #endregion

/***********************************************************************************
 * Le but de cette suite de 'test' n'est pas à proprement parler de tester mais
 * de détourner la fonction 'toMatchFileSnapshot' pour générer nos mock data des
 * ressources que l'on va tester
 ***********************************************************************************/

const DEFAULT_LIMIT = 10;

async function snapSingleData(expect: ExpectStatic, data: any, name: string) {
  await expect(JSON.stringify(excludeVolatileProperties(data), null, 2)).toMatchFileSnapshot(
    `./__snapshots__/api/${name}.single.json`
  );
}
async function snapListData(expect: ExpectStatic, data: any[], name: string) {
  await expect(JSON.stringify(data.map(excludeVolatileProperties), null, 2)).toMatchFileSnapshot(
    `./__snapshots__/api/${name}.list.json`
  );
}

describe('Dump Single API Data', () => {
  test('Article', async ({ expect }) => {
    const response = await ArticleClient.createInstance(getRealContext()).single({ id: referenceIds.sync.article });
    await snapSingleData(expect, response.body, 'article');
  });

  test('Blog', async ({ expect }) => {
    const response = await BlogClient.createInstance(getRealContext()).single({ id: referenceIds.sync.blog });
    await snapSingleData(expect, response.body, 'blog');
  });

  test('Collect', async ({ expect }) => {
    const response = await CollectClient.createInstance(getRealContext()).single({ id: referenceIds.sync.collect });
    await snapSingleData(expect, response.body, 'collect');
  });

  test('Customer', async ({ expect }) => {
    const response = await CustomerClient.createInstance(getRealContext()).single({ id: referenceIds.sync.customer });
    await snapSingleData(expect, response.body, 'customer');
  });

  test('Custom Collection', async ({ expect }) => {
    const response = await CustomCollectionClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.customCollection,
    });
    await snapSingleData(expect, response.body, 'customCollection');
  });

  test('Draft Order', async ({ expect }) => {
    const response = await DraftOrderClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.draftOrder,
    });
    await snapSingleData(expect, response.body, 'draftOrder');
  });

  test('File', async ({ expect }) => {
    const response = await FileClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.file,
      forceAllFields: undefined,
    });
    await snapSingleData(expect, response.body, 'file');
  });

  test('Location', async ({ expect }) => {
    const response = await LocationClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.location,
      forceAllFields: undefined,
    });
    const { ...data } = response.body;
    await snapSingleData(expect, data, 'location');
  });

  test('Rest Metafield', async ({ expect }) => {
    const response = await MetafieldClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.restMetafield,
    });
    await snapSingleData(expect, response.body, 'restMetafield');
  });

  test('GraphQl Metafield', async ({ expect }) => {
    const response = await MetafieldGraphQlClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.graphQlMetafield,
      forceAllFields: undefined,
    });
    await snapSingleData(expect, response.body, 'graphqlMetafield');
  });

  test('Metaobject', async ({ expect }) => {
    const response = await MetaobjectClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.metaobject,
      forceAllFields: undefined,
    });
    await snapSingleData(expect, response.body, 'metaobject');
  });

  test('MetaobjectDefinition', async ({ expect }) => {
    const response = await MetaobjectDefinitionClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.metaobjectDefinition,
      forceAllFields: true,
    });
    await snapSingleData(expect, response.body, 'testMetaobjectDefinition');
  });

  test('Order', async ({ expect }) => {
    const response = await OrderClient.createInstance(getRealContext()).single({ id: referenceIds.sync.order });
    await snapSingleData(expect, response.body, 'order');
  });

  test('Page', async ({ expect }) => {
    const response = await PageClient.createInstance(getRealContext()).single({ id: referenceIds.sync.page });
    await snapSingleData(expect, response.body, 'page');
  });

  test('Product', async ({ expect }) => {
    const response = await ProductClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.product,
      forceAllFields: undefined,
    });
    await snapSingleData(expect, response.body, 'product');
  });

  test('Product Variant', async ({ expect }) => {
    const response = await VariantClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.variant,
      forceAllFields: undefined,
    });
    await snapSingleData(expect, response.body, 'variant');
  });

  test('Redirect', async ({ expect }) => {
    const response = await RedirectClient.createInstance(getRealContext()).single({ id: referenceIds.sync.redirect });
    const { ...data } = response.body;
    await snapSingleData(expect, data, 'redirect');
  });

  test('Smart Collection', async ({ expect }) => {
    const response = await SmartCollectionClient.createInstance(getRealContext()).single({
      id: referenceIds.sync.smartCollection,
    });
    await snapSingleData(expect, response.body, 'smartCollection');
  });

  test('Shop', async ({ expect }) => {
    const response = await ShopClient.createInstance(getRealContext()).current({});
    await snapSingleData(expect, response.body, 'shop');
  });

  test('Translation', async ({ expect }) => {
    const response = await TranslationClient.createInstance(getRealContext()).single({
      key: 'title',
      locale: 'fr',
      forceAllFields: undefined,
      id: referenceIds.sync.translationOwner,
    });
    await snapSingleData(expect, response.body, 'translation');
  });
});

describe('Dump List API Data', () => {
  test('Articles', async ({ expect }) => {
    const response = await ArticleClient.createInstance(getRealContext()).list({
      blog_id: referenceIds.sync.blog,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'article');
  });

  test('Blog', async ({ expect }) => {
    const response = await BlogClient.createInstance(getRealContext()).list({ limit: DEFAULT_LIMIT });
    await snapListData(expect, response.body, 'blog');
  });

  test('Collect', async ({ expect }) => {
    const response = await CollectClient.createInstance(getRealContext()).list({
      collection_id: referenceIds.sync.customCollection,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'collect');
  });

  test('Customer', async ({ expect }) => {
    const response = await CustomerClient.createInstance(getRealContext()).list({ limit: DEFAULT_LIMIT });
    await snapListData(expect, response.body, 'customer');
  });

  test('Custom Collection', async ({ expect }) => {
    const response = await CustomCollectionClient.createInstance(getRealContext()).list({
      handle: 'vitest-custom',
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'customCollection');
  });

  test('Draft Order', async ({ expect }) => {
    const response = await DraftOrderClient.createInstance(getRealContext()).list({
      ids: `${referenceIds.sync.draftOrder}`,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'draftOrder');
  });

  test('File', async ({ expect }) => {
    const response = await FileClient.createInstance(getRealContext()).list({
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'file');
  });

  test('InventoryLevels', async ({ expect }) => {
    const response = await InventoryLevelClient.createInstance(getRealContext()).list({
      location_ids: graphQlGidToId(referenceIds.sync.location).toString(),
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'inventoryLevel');
  });

  test('Location', async ({ expect }) => {
    const response = await LocationClient.createInstance(getRealContext()).list({
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'location');
  });

  test('Article (Rest) Metafields', async ({ expect }) => {
    const response = await MetafieldClient.createInstance(getRealContext()).list({
      owner_id: referenceIds.sync.article,
      owner_resource: RestResourcesSingular.Article,
    });
    await snapListData(expect, response.body, 'articleMetafield');
  });

  test('Product (GraphQl) Metafield', async ({ expect }) => {
    const response = await MetafieldGraphQlClient.createInstance(getRealContext()).list({
      ownerType: MetafieldOwnerType.Product,
      forceAllFields: true,
    });
    await snapListData(expect, response.body, 'graphqlMetafield');
  });

  test('Market', async ({ expect }) => {
    const response = await MarketClient.createInstance(getRealContext()).list({
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'market');
  });

  test('MetafieldDefinition', async ({ expect }) => {
    const response = await MetafieldDefinitionClient.createInstance(getRealContext()).list({
      ownerType: MetafieldOwnerType.Article,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'articleMetafieldDefinition');
  });

  test('Metaobject', async ({ expect }) => {
    const response = await MetaobjectClient.createInstance(getRealContext()).list({
      type: 'test',
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'metaobject');
  });

  test('Order', async ({ expect }) => {
    const response = await OrderClient.createInstance(getRealContext()).list({
      ids: `${referenceIds.sync.order}`,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'order');
  });

  test('OrderTransaction', async ({ expect }) => {
    const response = await OrderTransactionClient.createInstance(getRealContext()).list({
      orderProcessedAtMin: new Date('2024-02-22T09:12:06Z'),
      orderProcessedAtMax: new Date('2024-02-23T09:12:06Z'),
      orderFinancialStatus: 'any',
      orderFulfillmentStatus: 'any',
      orderStatus: 'any',
      gateways: ['bogus'],
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'orderTransaction');
  });

  test('Page', async ({ expect }) => {
    const response = await PageClient.createInstance(getRealContext()).list({
      handle: 'vitest',
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'page');
  });

  test('Product', async ({ expect }) => {
    const response = await ProductClient.createInstance(getRealContext()).list({
      ids: [graphQlGidToId(referenceIds.sync.product).toString()],
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'product');
  });

  test('Product Variant', async ({ expect }) => {
    const response = await VariantClient.createInstance(getRealContext()).list({
      product_ids: [graphQlGidToId(referenceIds.sync.product).toString()],
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'variant');
  });

  test('Redirect', async ({ expect }) => {
    const response = await RedirectClient.createInstance(getRealContext()).list({
      path: '/vitest',
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'redirect');
  });

  test('Smart Collection', async ({ expect }) => {
    const response = await SmartCollectionClient.createInstance(getRealContext()).list({
      handle: 'vitest-smart',
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'smartCollection');
  });

  test('Shop', async ({ expect }) => {
    const response = await ShopClient.createInstance(getRealContext()).list({ limit: DEFAULT_LIMIT });
    await snapListData(expect, response.body, 'shop');
  });

  test('Translation', async ({ expect }) => {
    const response = await TranslationClient.createInstance(getRealContext()).list({
      resourceType: TranslatableResourceType.Collection,
      locale: 'fr',
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    await snapListData(expect, response.body, 'translation');
  });
});
