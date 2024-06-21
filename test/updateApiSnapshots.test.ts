// #region Imports
import { ExpectStatic, describe, test } from 'vitest';

import {
  FileClient,
  InventoryItemClient,
  LocationClient,
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
import { MetafieldOwnerType, TranslatableResourceType } from '../types/admin.types';
import { getRealContext } from './utils/test-utils';

// #endregion

/***********************************************************************************
 * Le but de cette suite de 'test' n'est pas à proprement parler de tester mais
 * de détourner la fonction 'toMatchFileSnapshot' pour générer nos mock data des
 * ressources que l'on va tester
 ***********************************************************************************/

const DEFAULT_LIMIT = 10;

async function snapSingleData(expect: ExpectStatic, data: any, name: string) {
  await expect(JSON.stringify(data, null, 2)).toMatchFileSnapshot(`./__snapshots__/api/${name}.single.json`);
}
async function snapListData(expect: ExpectStatic, data: any, name: string) {
  await expect(JSON.stringify(data, null, 2)).toMatchFileSnapshot(`./__snapshots__/api/${name}.list.json`);
}

describe('Dump Single API Data', () => {
  test('Article', async ({ expect }) => {
    const response = await ArticleClient.createInstance(getRealContext()).single({ id: 588854919424 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'article');
  });

  test('Blog', async ({ expect }) => {
    const response = await BlogClient.createInstance(getRealContext()).single({ id: 91627159808 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'blog');
  });

  test('Collect', async ({ expect }) => {
    const response = await CollectClient.createInstance(getRealContext()).single({ id: 35236133667072 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'collect');
  });

  test('Customer', async ({ expect }) => {
    const response = await CustomerClient.createInstance(getRealContext()).single({ id: 7199674794240 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'customer');
  });

  test('Custom Collection', async ({ expect }) => {
    const response = await CustomCollectionClient.createInstance(getRealContext()).single({ id: 413874323712 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'customCollection');
  });

  test('Draft Order', async ({ expect }) => {
    const response = await DraftOrderClient.createInstance(getRealContext()).single({ id: 1143039000832 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'draftOrder');
  });

  test('File', async ({ expect }) => {
    const response = await FileClient.createInstance(getRealContext()).single({
      id: 'gid://shopify/MediaImage/34028708233472',
      forceAllFields: undefined,
    });
    const { updatedAt, ...data } = response.body;
    await snapSingleData(expect, data, 'file');
  });

  test('Location', async ({ expect }) => {
    const response = await LocationClient.createInstance(getRealContext()).single({
      id: 'gid://shopify/Location/74534912256',
      forceAllFields: undefined,
    });
    const { ...data } = response.body;
    await snapSingleData(expect, data, 'location');
  });

  test('Rest Metafield', async ({ expect }) => {
    const response = await MetafieldClient.createInstance(getRealContext()).single({ id: 27141965611264 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'restMetafield');
  });

  test('GraphQl Metafield', async ({ expect }) => {
    const response = await MetafieldGraphQlClient.createInstance(getRealContext()).single({
      id: 'gid://shopify/Metafield/25730257289472',
      forceAllFields: undefined,
    });
    const { updatedAt, ...data } = response.body;
    await snapSingleData(expect, data, 'graphqlMetafield');
  });

  test('Metaobject', async ({ expect }) => {
    const response = await MetaobjectClient.createInstance(getRealContext()).single({
      id: 'gid://shopify/Metaobject/62614470912',
      forceAllFields: undefined,
    });
    const { updatedAt, ...data } = response.body;
    await snapSingleData(expect, data, 'metaobject');
  });

  test('MetaobjectDefinition', async ({ expect }) => {
    const metaobjectDefinitionId = 'gid://shopify/MetaobjectDefinition/967475456';
    const response = await MetaobjectDefinitionClient.createInstance(getRealContext()).single({
      id: metaobjectDefinitionId,
      forceAllFields: true,
    });
    const data = response.body;
    await snapSingleData(expect, data, 'testMetaobjectDefinition');
  });

  test('Order', async ({ expect }) => {
    const response = await OrderClient.createInstance(getRealContext()).single({ id: 5586624381184 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'order');
  });

  test('Page', async ({ expect }) => {
    const response = await PageClient.createInstance(getRealContext()).single({ id: 109215252736 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'page');
  });

  test('Product', async ({ expect }) => {
    const response = await ProductClient.createInstance(getRealContext()).single({
      id: 'gid://shopify/Product/8406091333888',
      forceAllFields: undefined,
    });
    const { updatedAt, ...data } = response.body;
    await snapSingleData(expect, data, 'product');
  });

  test('Product Variant', async ({ expect }) => {
    const response = await VariantClient.createInstance(getRealContext()).single({
      id: 'gid://shopify/ProductVariant/44365639713024',
      forceAllFields: undefined,
    });
    const { updatedAt, ...data } = response.body;
    await snapSingleData(expect, data, 'variant');
  });

  test('Redirect', async ({ expect }) => {
    const response = await RedirectClient.createInstance(getRealContext()).single({ id: 417021952256 });
    const { ...data } = response.body;
    await snapSingleData(expect, data, 'redirect');
  });

  test('Smart Collection', async ({ expect }) => {
    const response = await SmartCollectionClient.createInstance(getRealContext()).single({ id: 413086843136 });
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'smartCollection');
  });

  test('Shop', async ({ expect }) => {
    const response = await ShopClient.createInstance(getRealContext()).current({});
    const { updated_at, ...data } = response.body;
    await snapSingleData(expect, data, 'shop');
  });

  test('Translation', async ({ expect }) => {
    const response = await TranslationClient.createInstance(getRealContext()).single({
      key: 'title',
      locale: 'fr',
      forceAllFields: undefined,
      id: 'gid://shopify/Collection/413086843136',
    });
    const { updatedAt, ...data } = response.body;
    await snapSingleData(expect, data, 'translation');
  });
});

describe('Dump List API Data', () => {
  test('Articles', async ({ expect }) => {
    const response = await ArticleClient.createInstance(getRealContext()).list({
      blog_id: 91627159808,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((article) => {
      const { updated_at, ...data } = article;
      return data;
    });
    await snapListData(expect, listData, 'article');
  });

  test('Blog', async ({ expect }) => {
    const response = await BlogClient.createInstance(getRealContext()).list({ limit: DEFAULT_LIMIT });
    const listData = response.body.map((blog) => {
      const { updated_at, ...data } = blog;
      return data;
    });
    await snapListData(expect, listData, 'blog');
  });

  test('Collect', async ({ expect }) => {
    const response = await CollectClient.createInstance(getRealContext()).list({
      collection_id: 413874323712,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((collect) => {
      const { updated_at, ...data } = collect;
      return data;
    });
    await snapListData(expect, listData, 'collect');
  });

  test('Customer', async ({ expect }) => {
    const response = await CustomerClient.createInstance(getRealContext()).list({ limit: DEFAULT_LIMIT });
    const listData = response.body.map((customer) => {
      const { updated_at, ...data } = customer;
      return data;
    });
    await snapListData(expect, listData, 'customer');
  });

  test('Custom Collection', async ({ expect }) => {
    const response = await CustomCollectionClient.createInstance(getRealContext()).list({
      handle: 'vitest-custom',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((customCollection) => {
      const { updated_at, ...data } = customCollection;
      return data;
    });
    await snapListData(expect, listData, 'customCollection');
  });

  test('Draft Order', async ({ expect }) => {
    const response = await DraftOrderClient.createInstance(getRealContext()).list({
      ids: '1143039000832',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((draftOrder) => {
      const { updated_at, ...data } = draftOrder;
      return data;
    });
    await snapListData(expect, listData, 'draftOrder');
  });

  test('File', async ({ expect }) => {
    const response = await FileClient.createInstance(getRealContext()).list({
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((file) => {
      const { updatedAt, ...data } = file;
      return data;
    });
    await snapListData(expect, listData, 'file');
  });

  test('InventoryLevels', async ({ expect }) => {
    const response = await InventoryLevelClient.createInstance(getRealContext()).list({
      location_ids: '74534912256',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((inventoryLevel) => {
      const { updated_at, ...data } = inventoryLevel;
      return data;
    });
    await snapListData(expect, listData, 'inventoryLevel');
  });

  test('InventoryItems', async ({ expect }) => {
    const response = await InventoryItemClient.createInstance(getRealContext()).list({
      skus: ['vitest'],
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((inventoryItem) => {
      const { updatedAt, ...data } = inventoryItem;
      return data;
    });
    await snapListData(expect, listData, 'inventoryItem');
  });

  test('Location', async ({ expect }) => {
    const response = await LocationClient.createInstance(getRealContext()).list({
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body;
    await snapListData(expect, listData, 'location');
  });

  test('Article Metafields', async ({ expect }) => {
    const response = await MetafieldClient.createInstance(getRealContext()).list({
      owner_id: 589065715968,
      owner_resource: RestResourcesSingular.Article,
    });
    const listData = response.body.map((metafield) => {
      const { updated_at, ...data } = metafield;
      return data;
    });
    await snapListData(expect, listData, 'articleMetafield');
  });

  test('GraphQl Metafield', async ({ expect }) => {
    const response = await MetafieldGraphQlClient.createInstance(getRealContext()).list({
      ownerType: MetafieldOwnerType.Product,
      forceAllFields: true,
    });
    const listData = response.body.map((metafield) => {
      const { updatedAt, ...data } = metafield;
      return data;
    });
    await snapListData(expect, listData, 'graphqlMetafield');
  });

  test('MetafieldDefinition', async ({ expect }) => {
    const response = await MetafieldDefinitionClient.createInstance(getRealContext()).list({
      ownerType: MetafieldOwnerType.Article,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body;
    await snapListData(expect, listData, 'articleMetafieldDefinition');
  });

  test('Metaobject', async ({ expect }) => {
    const response = await MetaobjectClient.createInstance(getRealContext()).list({
      type: 'test',
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((metaobject) => {
      const { updatedAt, ...data } = metaobject;
      return data;
    });
    await snapListData(expect, listData, 'metaobject');
  });

  test('Order', async ({ expect }) => {
    const response = await OrderClient.createInstance(getRealContext()).list({
      ids: '5586624381184',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((order) => {
      const { updated_at, ...data } = order;
      return data;
    });
    await snapListData(expect, listData, 'order');
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
    const listData = response.body;
    await snapListData(expect, listData, 'orderTransaction');
  });

  test('Page', async ({ expect }) => {
    const response = await PageClient.createInstance(getRealContext()).list({
      handle: 'vitest',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((page) => {
      const { updated_at, ...data } = page;
      return data;
    });
    await snapListData(expect, listData, 'page');
  });

  test('Product', async ({ expect }) => {
    const response = await ProductClient.createInstance(getRealContext()).list({
      ids: ['8406091333888'],
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((product) => {
      const { updatedAt, ...data } = product;
      return data;
    });
    await snapListData(expect, listData, 'product');
  });

  test('Product Variant', async ({ expect }) => {
    const response = await VariantClient.createInstance(getRealContext()).list({
      product_ids: ['8406091333888'],
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((variant) => {
      const { updatedAt, ...data } = variant;
      return data;
    });
    await snapListData(expect, listData, 'variant');
  });

  test('Redirect', async ({ expect }) => {
    const response = await RedirectClient.createInstance(getRealContext()).list({
      path: '/vitest',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body;
    await snapListData(expect, listData, 'redirect');
  });

  test('Smart Collection', async ({ expect }) => {
    const response = await SmartCollectionClient.createInstance(getRealContext()).list({
      handle: 'vitest-smart',
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((smartCollection) => {
      const { updated_at, ...data } = smartCollection;
      return data;
    });
    await snapListData(expect, listData, 'smartCollection');
  });

  test('Shop', async ({ expect }) => {
    const response = await ShopClient.createInstance(getRealContext()).list({ limit: DEFAULT_LIMIT });
    const listData = response.body.map((shop) => {
      const { updated_at, ...data } = shop;
      return data;
    });
    await snapListData(expect, listData, 'shop');
  });

  test('Translation', async ({ expect }) => {
    const response = await TranslationClient.createInstance(getRealContext()).list({
      resourceType: TranslatableResourceType.Collection,
      locale: 'fr',
      forceAllFields: true,
      limit: DEFAULT_LIMIT,
    });
    const listData = response.body.map((translation) => {
      const { updatedAt, ...data } = translation;
      return data;
    });
    await snapListData(expect, listData, 'translation');
  });
});
