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
import { graphQlGidToId } from '../graphql/utils/graphql-utils';
import { pack } from '../pack';
import { MetafieldOwnerType } from '../types/admin.types';
import * as singleData from './__snapshots__/api/single';
import {
  defaultIntegrationContextOptions,
  defaultMockExecuteOptions,
  excludeVolatileProperties,
  newGraphqlFetchResponse,
  referenceIds,
} from './utils/test-utils';

// #endregion

const FAKE_ID = 123456789;
const FAKE_GID = 'gid://shopify/Fake/34028708233472';

async function matchSingleRowSnapshot(expect: ExpectStatic, result: any, name: string) {
  await expect(JSON.stringify(excludeVolatileProperties(result), null, 2)).toMatchFileSnapshot(
    `./__snapshots__/rows/mock/${name}.row.json`
  );
}
async function matchSingleIntegrationRowSnapshot(expect: ExpectStatic, result: any, name: string) {
  await expect(JSON.stringify(excludeVolatileProperties(result), null, 2)).toMatchFileSnapshot(
    `./__snapshots__/rows/integration/${name}.row.json`
  );
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
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Article]: singleData.article }));
    const result = await doFetch('Article', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'article');
  });

  test('Blog', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Blog]: singleData.blog }));
    const result = await doFetch('Blog', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'blog');
  });

  test('CustomCollection', async () => {
    const collectionTypeResponse = newGraphqlFetchResponse({ collection: { isSmartCollection: undefined } });
    const customCollectionResponse = newJsonFetchResponse({
      [RestResourcesSingular.CustomCollection]: singleData.customCollection,
    });
    context.fetcher.fetch.onFirstCall().returns(collectionTypeResponse);
    context.fetcher.fetch.onSecondCall().returns(customCollectionResponse);
    const result = await doFetch('Collection', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'customCollection');
  });

  test('Customer', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Customer]: singleData.customer }));
    const result = await doFetch('Customer', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'customer');
  });

  test('DraftOrder', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.DraftOrder]: singleData.draftOrder }));
    const result = await doFetch('DraftOrder', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'draftOrder');
  });

  test('File', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ node: singleData.file }));
    const result = await doFetch('File', [FAKE_GID]);
    await matchSingleRowSnapshot(expect, result, 'file');
  });

  test('GraphQl Metafield', async () => {
    context.fetcher.fetch.returns(
      newGraphqlFetchResponse({
        node: {
          __typename: 'Product',
          id: referenceIds.sync.product,
          parentOwner: {
            id: referenceIds.sync.product,
          },
          metafields: {
            nodes: [singleData.graphqlMetafield as any],
          },
        },
      } as SingleMetafieldByKeyResponse)
    );
    const result = await doFetch('Metafield', [
      MetafieldOwnerType.Product,
      'global.title_tag',
      graphQlGidToId(referenceIds.sync.product),
    ] as coda.ParamValues<(typeof Formula_Metafield)['parameters']>);
    await matchSingleRowSnapshot(expect, result, 'graphqlMetafield');
  });

  test('Location', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ location: singleData.location }));
    const result = await doFetch('Location', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'location');
  });

  test('Order', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Order]: singleData.order }));
    const result = await doFetch('Order', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'order');
  });

  test('Page', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Page]: singleData.page }));
    const result = await doFetch('Page', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'page');
  });

  test('Product', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ product: singleData.product }));
    const result = await doFetch('Product', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'product');
  });

  test('Redirect', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Redirect]: singleData.redirect }));
    const result = await doFetch('Redirect', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'redirect');
  });

  test('Rest Metafield', async () => {
    context.fetcher.fetch.returns(
      newJsonFetchResponse({ [RestResourcesPlural.Metafield]: [singleData.restMetafield] })
    );
    const result = await doFetch('Metafield', [
      MetafieldOwnerType.Article,
      'custom.test',
      referenceIds.sync.article,
    ] as coda.ParamValues<(typeof Formula_Metafield)['parameters']>);
    await matchSingleRowSnapshot(expect, result, 'restMetafield');
  });

  test('Shop', async () => {
    context.fetcher.fetch.returns(newJsonFetchResponse({ [RestResourcesSingular.Shop]: singleData.shop }));
    const result = await doFetch('Shop', []);
    await matchSingleRowSnapshot(expect, result, 'shop');
  });

  test('SmartCollection', async () => {
    const collectionTypeResponse = newGraphqlFetchResponse({
      collection: { isSmartCollection: { appliedDisjunctively: undefined } },
    });
    const smartCollectionResponse = newJsonFetchResponse({
      [RestResourcesSingular.SmartCollection]: singleData.smartCollection,
    });
    context.fetcher.fetch.onFirstCall().returns(collectionTypeResponse);
    context.fetcher.fetch.onSecondCall().returns(smartCollectionResponse);
    const result = await doFetch('Collection', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'smartCollection');
  });

  test('Variant', async () => {
    context.fetcher.fetch.returns(newGraphqlFetchResponse({ productVariant: singleData.variant }));
    const result = await doFetch('ProductVariant', [FAKE_ID]);
    await matchSingleRowSnapshot(expect, result, 'variant');
  });
});

describe.skip('INTEGRATION: Fetch single resource', () => {
  test('Article', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'Article',
      [referenceIds.sync.article],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'article');
  });

  test('Blog', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'Blog',
      [referenceIds.sync.blog],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'blog');
  });

  test('Customer', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'Customer',
      [referenceIds.sync.customer],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'customer');
  });

  test('MetafieldDefinition', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'MetafieldDefinition',
      [referenceIds.sync.metafieldDefinition],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'metafieldDefinition');
  });

  test('Page', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'Page',
      [referenceIds.sync.page],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'page');
  });

  test('Product', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'Product',
      [graphQlGidToId(referenceIds.sync.product)],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'product');
  });

  test('ProductVariant', async () => {
    const result = await executeFormulaFromPackDef(
      pack,
      'ProductVariant',
      [graphQlGidToId(referenceIds.sync.variant)],
      undefined,
      undefined,
      defaultIntegrationContextOptions
    );
    await matchSingleIntegrationRowSnapshot(expect, result, 'variant');
  });
});
