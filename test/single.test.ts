// #region Imports

import * as coda from '@codahq/packs-sdk';
import {
  ExecuteOptions,
  MockExecutionContext,
  executeFormulaFromPackDef,
  newJsonFetchResponse,
  newMockExecutionContext,
} from '@codahq/packs-sdk/dist/development';
import { ExpectStatic, beforeEach, describe, expect, test } from 'vitest';
import { SingleMetafieldByKeyResponse } from '../Clients/GraphQlClients';
import { Formula_Metafield } from '../coda/setup/metafields-setup';
import { PACK_TEST_ENDPOINT } from '../constants/pack-constants';
import { RestResourcesPlural, RestResourcesSingular } from '../constants/resourceNames-constants';
import { pack } from '../pack';
import { MetafieldOwnerType } from '../types/admin.types';
import { expectedRows } from './expectedRows';
import {
  compareToExpectedRow,
  defaultIntegrationContextOptions,
  defaultMockExecuteOptions,
  newGraphqlFetchResponse,
  normalizeExpectedRowKeys,
} from './utils/test-utils';

import singleArticleApiData from './__snapshots__/api/article.single.json';
import singleBlogApiData from './__snapshots__/api/blog.single.json';
import singleCustomCollectionApiData from './__snapshots__/api/customCollection.single.json';
import singleCustomerApiData from './__snapshots__/api/customer.single.json';
import singleDraftOrderApiData from './__snapshots__/api/draftOrder.single.json';
import singleFileApiData from './__snapshots__/api/file.single.json';
import singleGraphqlMetafieldApiData from './__snapshots__/api/graphqlMetafield.single.json';
import singleLocationApiData from './__snapshots__/api/location.single.json';
import singleOrderApiData from './__snapshots__/api/order.single.json';
import singlePageApiData from './__snapshots__/api/page.single.json';
import singleProductApiData from './__snapshots__/api/product.single.json';
import singleRedirectApiData from './__snapshots__/api/redirect.single.json';
import singleRestMetafieldApiData from './__snapshots__/api/restMetafield.single.json';
import singleShopApiData from './__snapshots__/api/shop.single.json';
import singleSmartCollectionApiData from './__snapshots__/api/smartCollection.single.json';
import singleVariantApiData from './__snapshots__/api/variant.single.json';

// #endregion

const FAKE_ID = 123456789;
const FAKE_GID = 'gid://shopify/Fake/34028708233472';

async function matchSingleRowSnapshot(expect: ExpectStatic, result: any, name: string) {
  await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(`./__snapshots__/rows/${name}.row.json`);
}

describe('Fetch single resource', () => {
  let context: MockExecutionContext;

  async function doFetch(
    formulaName: string,
    parameters: coda.ParamValues<coda.ParamDefs>,
    overrideContext?: MockExecutionContext,
    overrideOptions?: ExecuteOptions
  ) {
    return executeFormulaFromPackDef(
      pack,
      formulaName,
      parameters,
      overrideContext ?? context,
      overrideOptions ?? defaultMockExecuteOptions
    );
  }

  beforeEach(() => {
    context = newMockExecutionContext({
      endpoint: PACK_TEST_ENDPOINT,
    });
    context.fetcher.fetch.reset();
  });

  test('Article', async ({ expect }) => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Article]: singleArticleApiData }));
    const result = await doFetch('Article', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'article');
  });

  test('Blog', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Blog]: singleBlogApiData }));
    const result = await doFetch('Blog', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'blog');
  });

  test('CustomCollection', async () => {
    const collectionTypeResponse = newGraphqlFetchResponse({ collection: { isSmartCollection: undefined } });
    const customCollectionResponse = newJsonFetchResponse({
      [RestResourcesSingular.CustomCollection]: singleCustomCollectionApiData,
    });
    context.fetcher.fetch.onFirstCall().returns(collectionTypeResponse);
    context.fetcher.fetch.onSecondCall().returns(customCollectionResponse);
    const result = await doFetch('Collection', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'customCollection');
  });

  test('Customer', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Customer]: singleCustomerApiData }));
    const result = await doFetch('Customer', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'customer');
  });

  test('DraftOrder', async () => {
    context.fetcher.fetch.returns(
      newJsonFetchResponse({ [RestResourcesSingular.DraftOrder]: singleDraftOrderApiData })
    );
    const result = await doFetch('DraftOrder', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'draftOrder');
  });

  test('File', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ node: singleFileApiData }));
    const result = await doFetch('File', [FAKE_GID]);
    await matchSingleRowSnapshot(expect, result, 'file');
  });

  test('GraphQl Metafield', async () => {
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        node: {
          __typename: 'Product',
          id: 'gid://shopify/Product/8406091333888',
          parentOwner: {
            id: 'gid://shopify/Product/8406091333888',
          },
          metafields: {
            nodes: [singleGraphqlMetafieldApiData as any],
          },
        },
      } as SingleMetafieldByKeyResponse)
    );
    const result = await doFetch('Metafield', [
      MetafieldOwnerType.Product,
      'global.title_tag',
      8406091333888,
    ] as coda.ParamValues<(typeof Formula_Metafield)['parameters']>);
    await matchSingleRowSnapshot(expect, result, 'graphqlMetafield');
  });

  test('Location', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ location: singleLocationApiData }));
    const result = await doFetch('Location', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'location');
  });

  test('Order', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Order]: singleOrderApiData }));
    const result = await doFetch('Order', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'order');
  });

  test('Page', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Page]: singlePageApiData }));
    const result = await doFetch('Page', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'page');
  });

  test('Product', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ product: singleProductApiData }));
    const result = await doFetch('Product', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'product');
  });

  test('Redirect', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Redirect]: singleRedirectApiData }));
    const result = await doFetch('Redirect', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'redirect');
  });

  test('Rest Metafield', async () => {
    context.fetcher.fetch.returns(
      newJsonFetchResponse({ [RestResourcesPlural.Metafield]: [singleRestMetafieldApiData] })
    );
    const result = await doFetch('Metafield', [
      MetafieldOwnerType.Article,
      'custom.test',
      589065715968,
    ] as coda.ParamValues<(typeof Formula_Metafield)['parameters']>);
    await matchSingleRowSnapshot(expect, result, 'restMetafield');
  });

  test('Shop', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Shop]: singleShopApiData }));
    const result = await doFetch('Shop', []);
    await matchSingleRowSnapshot(expect, result, 'shop');
  });

  test('SmartCollection', async () => {
    const collectionTypeResponse = newGraphqlFetchResponse({
      collection: { isSmartCollection: { appliedDisjunctively: undefined } },
    });
    const smartCollectionResponse = newJsonFetchResponse({
      [RestResourcesSingular.SmartCollection]: singleSmartCollectionApiData,
    });
    context.fetcher.fetch.onFirstCall().returns(collectionTypeResponse);
    context.fetcher.fetch.onSecondCall().returns(smartCollectionResponse);
    const result = await doFetch('Collection', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'smartCollection');
  });

  test('Variant', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ productVariant: singleVariantApiData }));
    const result = await doFetch('ProductVariant', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'variant');
  });
});

describe.skip('INTEGRATION: Fetch single resource', () => {
  test('Article', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.article);
    const result = await executeFormulaFromPackDef(
      pack,
      'Article',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Blog', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.blog);
    const result = await executeFormulaFromPackDef(
      pack,
      'Blog',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Customer', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.customer);
    const result = await executeFormulaFromPackDef(
      pack,
      'Customer',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('MetafieldDefinition', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.metafieldDefinition);
    const result = await executeFormulaFromPackDef(
      pack,
      'MetafieldDefinition',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Page', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.page);
    const result = await executeFormulaFromPackDef(
      pack,
      'Page',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('Product', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.product);
    const result = await executeFormulaFromPackDef(
      pack,
      'Product',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });

  test('ProductVariant', async () => {
    const expected = normalizeExpectedRowKeys(expectedRows.productVariant);
    const result = await executeFormulaFromPackDef(
      pack,
      'ProductVariant',
      [expected.Id],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    compareToExpectedRow(result, expected);
  });
});
