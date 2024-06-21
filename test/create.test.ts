// #region Imports

import * as coda from '@codahq/packs-sdk';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { pack } from '../pack';

import { describe, expect, test } from 'vitest';
import { METAFIELD_TYPES } from '../constants/metafields-constants';
import { MetafieldOwnerType } from '../types/admin.types';
import {
  deleteRestResource,
  formatMetafieldInput,
  formatMetafieldSingleLineTextInput,
  manifestPath,
} from './utils/test-utils';
import { CodaSyncParams } from '../sync/AbstractSyncedResources';
import { Action_CreateArticle } from '../coda/setup/articles-setup';
import { Action_CreateCollection } from '../coda/setup/collections-setup';
import { PACK_TEST_ENDPOINT } from '../constants/pack-constants';
import { Action_CreatePage } from '../coda/setup/pages-setup';
import { Action_CreateBlog } from '../coda/setup/blogs-setup';

// #endregion
const defaultExecuteOptions = {
  useRealFetcher: true,
  manifestPath,
};

type CreateArticleParams = coda.ParamValues<(typeof Action_CreateArticle)['parameters']>;
type CreateCollectionParams = coda.ParamValues<(typeof Action_CreateCollection)['parameters']>;
type CreatePageParams = coda.ParamValues<(typeof Action_CreatePage)['parameters']>;
type CreateBlogParams = coda.ParamValues<(typeof Action_CreateBlog)['parameters']>;

describe.skip('INTEGRATION: Create, Fetch and Delete Actions', () => {
  test('Article', async () => {
    const author = 'author';
    const bodyHtml = '<p>bodyHtml</p>';
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const published = true;
    const summaryHtml = '<p>summaryHtml</p>';
    const tagsArray = ['test', 'create', 'fetch', 'delete'];
    const title = 'a title';

    const newArticleId = await executeFormulaFromPackDef(
      pack,
      'CreateArticle',
      [
        'Vitest (91627159808)', // blog
        title,
        author,
        bodyHtml,
        summaryHtml,
        handle,
        undefined, // imageUrl
        undefined, // imageAlt
        published,
        undefined, // publishedAt
        tagsArray, // tagsArray
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreateArticleParams,
      undefined,
      undefined,
      defaultExecuteOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Article',
      [newArticleId],
      undefined,
      undefined,
      defaultExecuteOptions
    );

    expect.soft(fetchResult.AdminUrl).toEqual(`${PACK_TEST_ENDPOINT}/admin/articles/${newArticleId}`);
    expect.soft(fetchResult.GraphqlGid).toEqual(`gid://shopify/OnlineStoreArticle/${newArticleId}`);
    expect.soft(fetchResult.BodyHtml).toEqual(bodyHtml);
    expect.soft(fetchResult.Title).toEqual(title);
    expect.soft(fetchResult.Author).toEqual(author);
    expect.soft(fetchResult.Handle).toEqual(handle);
    expect.soft(fetchResult.Published).toEqual(published);
    expect.soft(fetchResult.SummaryHtml).toEqual(summaryHtml);
    expect.soft(fetchResult.Tags).toEqual(tagsArray.sort().join(', '));

    const deleteResult = await deleteRestResource('DeleteArticle', newArticleId);
    expect(deleteResult).toEqual(true);
  });

  test('Blog', async () => {
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const title = 'a title';

    const newBlogId = await executeFormulaFromPackDef(
      pack,
      'CreateBlog',
      [
        title,
        handle,
        undefined, // commentable
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreateBlogParams,
      undefined,
      undefined,
      defaultExecuteOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Blog',
      [newBlogId],
      undefined,
      undefined,
      defaultExecuteOptions
    );

    expect.soft(fetchResult.AdminUrl).toEqual(`${PACK_TEST_ENDPOINT}/admin/blogs/${newBlogId}`);
    expect.soft(fetchResult.GraphqlGid).toEqual(`gid://shopify/OnlineStoreBlog/${newBlogId}`);
    expect.soft(fetchResult.Handle).toEqual(handle);
    expect.soft(fetchResult.Tags).toEqual(null);
    expect.soft(fetchResult.TemplateSuffix).toEqual(null);
    expect.soft(fetchResult.Title).toEqual(title);

    const deleteResult = await deleteRestResource('DeleteBlog', newBlogId);
    expect(deleteResult).toEqual(true);
  });

  test('Collection', async () => {
    const bodyHtml = '<p>bodyHtml</p>';
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const published = true;
    const title = 'a title';
    const templateSuffix = null;

    const newCollectionId = await executeFormulaFromPackDef(
      pack,
      'CreateCollection',
      [
        title,
        bodyHtml,
        handle,
        undefined, // imageUrl
        undefined, // imageAlt
        published,
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreateCollectionParams,
      undefined,
      undefined,
      defaultExecuteOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Collection',
      [newCollectionId],
      undefined,
      undefined,
      defaultExecuteOptions
    );

    expect.soft(fetchResult.BodyHtml).toEqual(bodyHtml);
    expect.soft(fetchResult.Title).toEqual(title);
    expect.soft(fetchResult.Handle).toEqual(handle);
    expect.soft(fetchResult.Published).toEqual(published);
    expect.soft(fetchResult.TemplateSuffix).toEqual(templateSuffix);
    expect.soft(fetchResult.PublishedScope).toEqual('web');
    expect.soft(fetchResult.AdminUrl).toEqual(`${PACK_TEST_ENDPOINT}/admin/collections/${newCollectionId}`);

    const deleteResult = await deleteRestResource('DeleteCollection', newCollectionId);
    expect(deleteResult).toEqual(true);
  });

  test('Page', async () => {
    const author = 'author';
    const bodyHtml = '<p>bodyHtml</p>';
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const published = true;
    const title = 'a title';

    const newPageId = await executeFormulaFromPackDef(
      pack,
      'CreatePage',
      [
        title,
        author,
        bodyHtml,
        handle,
        published,
        undefined, // publishedAt
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreatePageParams,
      undefined,
      undefined,
      defaultExecuteOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Page',
      [newPageId],
      undefined,
      undefined,
      defaultExecuteOptions
    );

    expect.soft(fetchResult.AdminUrl).toEqual(`${PACK_TEST_ENDPOINT}/admin/pages/${newPageId}`);
    expect.soft(fetchResult.GraphqlGid).toEqual(`gid://shopify/OnlineStorePage/${newPageId}`);
    expect.soft(fetchResult.BodyHtml).toEqual(bodyHtml);
    expect.soft(fetchResult.Title).toEqual(title);
    expect.soft(fetchResult.Author).toEqual(author);
    expect.soft(fetchResult.Handle).toEqual(handle);
    expect.soft(fetchResult.Published).toEqual(published);
    expect.soft(fetchResult.TemplateSuffix).toEqual(null);
    expect.soft(fetchResult.ShopUrl).toEqual(`${PACK_TEST_ENDPOINT}/pages/${handle}`);

    const deleteResult = await deleteRestResource('DeletePage', newPageId);
    expect(deleteResult).toEqual(true);
  });
});

// test('UpdateArticle', async () => {
//   const input = await executeFormulaFromPackDef(
//     pack,
//     'FormatMetafield',
//     [
//       'global.title_tag', // fullKey
//       await executeFormulaFromPackDef(
//         pack,
//         'MetaSingleLineText',
//         [
//           'vitest999', // string
//         ],
//         undefined,
//         undefined,
//         defaultExecuteOptions
//       ), // value
//     ],
//     undefined,
//     undefined,
//     defaultExecuteOptions
//   );
//   console.log('input', input);

//   const result = await executeFormulaFromPackDef(
//     pack,
//     'UpdateArticle',
//     [
//       588854919424, // id
//       undefined, // author
//       undefined, // blog
//       'bonjour', // bodyHtml
//       undefined, // summaryHtml
//       undefined, // handle
//       undefined, // imageUrl
//       undefined, // imageAlt
//       undefined, // published
//       undefined, // publishedAt
//       undefined, // tags
//       undefined, // templateSuffix
//       undefined, // title
//       [input], // metafields
//     ],
//     undefined,
//     undefined,
//     defaultExecuteOptions
//   );

//   expect(result.BodyHtml).toEqual('bonjour');

//   // const reset = await executeFormulaFromPackDef(
//   //   pack,
//   //   'UpdateArticle',
//   //   [588854919424, undefined, undefined, 'un-test-encore'],
//   //   undefined,
//   //   undefined,
//   //   defaultExecuteOptions
//   // );
//   // expect(reset.BodyHtml).toEqual('un-test-encore');
// });

// test('SetMetafield', async () => {
//   const input = await executeFormulaFromPackDef(
//     pack,
//     'FormatMetafield',
//     [
//       'global.title_tag', // fullKey
//       await executeFormulaFromPackDef(
//         pack,
//         'MetaSingleLineText',
//         [
//           'TEST SET', // string
//         ],
//         undefined,
//         undefined,
//         defaultExecuteOptions
//       ), // value
//     ],
//     undefined,
//     undefined,
//     defaultExecuteOptions
//   );

//   const result = await executeFormulaFromPackDef(
//     pack,
//     'SetMetafield',
//     [
//       MetafieldOwnerType.Article, // ownerType
//       input, // metafieldValue
//       589145866496, // ownerID
//     ],
//     undefined,
//     undefined,
//     defaultExecuteOptions
//   );
// });
